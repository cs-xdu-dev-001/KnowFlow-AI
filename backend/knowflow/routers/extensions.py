import json

from fastapi import APIRouter

from ..runtime import *
from ..services.agent_loop import AgentRunner, ToolRegistry
from ..services.web_search import TavilyWebSearch, WebSearchArguments

router = APIRouter()

EXTENSION_TAGS = ["Extensions"]


def normalize_sync_task(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {}
    return {key: value for key, value in row.items() if key != "user_id"}


def _contains_any(text_value: str, keywords: list[str]) -> bool:
    return any(keyword in text_value for keyword in keywords)


def make_web_search_provider(api_key: str) -> TavilyWebSearch:
    return TavilyWebSearch(
        api_key=api_key,
        post_json=post_model_json,
        timeout=WEB_SEARCH_TIMEOUT,
        max_results=WEB_SEARCH_MAX_RESULTS,
    )


def build_tool_registry(user_id: int, enable_tools: bool) -> ToolRegistry:
    registry = ToolRegistry()
    config = (
        tool_configs.secret(
            user_id,
            "web_search",
            require_enabled=True,
        )
        if enable_tools
        else None
    )
    if not config:
        return registry
    provider = make_web_search_provider(config["api_key"])
    registry.register(
        name="web_search",
        description=(
            "Search the public web for current or external information "
            "and return source URLs."
        ),
        arguments_model=WebSearchArguments,
        handler=lambda args: {
            "results": provider.search(args.query, args.top_k)
        },
        read_only=True,
    )
    return registry


@router.post("/api/agent/chat", tags=EXTENSION_TAGS, summary="Reserved agent chat endpoint")
def agent_chat(payload: ChatRequest, request: Request) -> dict[str, Any]:
    user_id = current_user_id(request)
    use_rag = bool(payload.knowledgeBaseId) or payload.useRag
    if use_rag and not payload.knowledgeBaseId:
        raise HTTPException(status_code=400, detail="knowledgeBaseId is required when RAG is enabled")
    if payload.knowledgeBaseId:
        get_kb(payload.knowledgeBaseId, user_id)
    session_id = ensure_session(payload.sessionId, payload.knowledgeBaseId, payload.chatModelConfigId, user_id)
    save_message(session_id, "user", payload.question)
    history = get_recent_history(session_id)
    calls: list[dict[str, Any]] = []
    retrieval_run: dict[str, Any] | None = None
    rag_quality: dict[str, Any] = {"enabled": False}
    chunks: list[dict[str, Any]] = []
    if use_rag and payload.knowledgeBaseId:
        started_at = time.perf_counter()
        chunks = retrieve_chunks(
            payload.knowledgeBaseId,
            payload.question,
            DEFAULT_TOP_K,
            user_id,
        )
        chunks = enrich_retrieval_chunks(payload.question, chunks)
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        rag_quality = assess_retrieval_quality(payload.question, chunks)
        retrieval_run = record_retrieval_run(
            user_id=user_id,
            knowledge_base_id=payload.knowledgeBaseId,
            query=payload.question,
            top_k=DEFAULT_TOP_K,
            chunks=chunks,
            quality=rag_quality,
            duration_ms=duration_ms,
        )
        rag_quality = {
            **rag_quality,
            "retrievalRunId": retrieval_run.get("id"),
        }
    chat_config = get_model_config(payload.chatModelConfigId, "chat", user_id)
    registry = build_tool_registry(user_id, payload.enableTools)
    messages = build_messages(
        payload.question,
        chunks,
        history,
        agent_mode=bool(registry.schemas()),
        use_rag=use_rag,
        chat_config=chat_config,
        attachments=payload.attachments,
    )
    try:
        run_result = AgentRunner(
            gateway=gateway,
            max_tool_rounds=3,
        ).run(
            messages=messages,
            config=chat_config,
            registry=registry,
        )
        answer = run_result.answer
    except Exception as exc:
        run_result = None
        if has_remote_model_config(chat_config):
            answer = remote_model_error_answer(chat_config, exc)
        else:
            answer = fallback_answer(
                payload.question,
                chunks,
                history,
                agent_mode=bool(registry.schemas()),
                use_rag=use_rag,
                attachments=payload.attachments,
            )
    if run_result:
        for execution in run_result.executions:
            calls.append(
                log_tool_call(
                    session_id,
                    None,
                    execution.tool_name,
                    execution.arguments,
                    json.dumps(
                        execution.output,
                        ensure_ascii=False,
                    )[:4000],
                    status=execution.status,
                    error_message=execution.error_message,
                    latency_ms=execution.latency_ms,
                )
            )
    message_id = save_message(session_id, "assistant", answer)
    update_retrieval_run_message(
        retrieval_run.get("id") if retrieval_run else None,
        message_id,
    )
    refs = save_references(message_id, chunks)
    for call in calls:
        execute(
            """
            UPDATE agent_tool_call
            SET message_id=:message_id
            WHERE id=:id AND session_id=:session_id
            """,
            {
                "message_id": message_id,
                "id": call["id"],
                "session_id": session_id,
            },
        )
    return api_success(
        {
            "sessionId": session_id,
            "messageId": message_id,
            "answer": answer,
            "references": refs,
            "toolCalls": calls,
            "ragQuality": rag_quality,
            "retrievalRun": retrieval_run,
        }
    )


@router.post("/api/agent/chat/stream", tags=EXTENSION_TAGS, summary="Reserved streaming agent chat endpoint")
def agent_chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    result = agent_chat(payload, request)["data"]

    def generate() -> Iterable[str]:
        for call in result["toolCalls"]:
            yield sse_event("tool", {"type": "tool", **call})
        for i in range(0, len(result["answer"]), 12):
            yield sse_event("message", {"type": "answer", "content": result["answer"][i : i + 12]})
            time.sleep(0.02)
        for ref in result["references"]:
            yield sse_event("reference", {"type": "reference", **ref})
        yield sse_event("done", {"type": "done", "sessionId": result["sessionId"], "messageId": result["messageId"]})

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/api/sessions/{session_id}/tool-calls", tags=EXTENSION_TAGS, summary="Read session tool calls")
def read_session_tool_calls(session_id: str, request: Request) -> dict[str, Any]:
    get_session_for_user(session_id, current_user_id(request))
    return api_success(fetch_all("SELECT * FROM agent_tool_call WHERE session_id=:session_id ORDER BY id DESC", {"session_id": session_id}))


@router.get("/api/messages/{message_id}/tool-calls", tags=EXTENSION_TAGS, summary="Read answer tool calls")
def read_message_tool_calls(message_id: int, request: Request) -> dict[str, Any]:
    user_id = current_user_id(request)
    if not fetch_one(
        """
        SELECT cm.id
        FROM chat_message cm
        JOIN chat_session cs ON cs.id = cm.session_id
        WHERE cm.id=:message_id AND cs.user_id=:user_id
        """,
        {"message_id": message_id, "user_id": user_id},
    ):
        raise HTTPException(status_code=404, detail="Message not found.")
    return api_success(fetch_all("SELECT * FROM agent_tool_call WHERE message_id=:message_id ORDER BY id DESC", {"message_id": message_id}))


@router.post("/api/sync/tasks", tags=EXTENSION_TAGS, summary="Create a sync task record")
def create_sync_task(payload: SyncTaskIn, request: Request) -> dict[str, Any]:
    user_id = current_user_id(request)
    if payload.knowledgeBaseId is not None:
        get_kb(payload.knowledgeBaseId, user_id)
    task_id = execute(
        """
        INSERT INTO sync_task(user_id, source_type, source_url, target_type, knowledge_base_id, status, result_message, created_at, updated_at)
        VALUES (:user_id, :source_type, :source_url, :target_type, :knowledge_base_id, 'pending', :result_message, :created_at, :updated_at)
        """,
        {
            "user_id": user_id,
            "source_type": payload.sourceType,
            "source_url": payload.sourceUrl,
            "target_type": payload.targetType,
            "knowledge_base_id": payload.knowledgeBaseId,
            "result_message": "Sync task recorded. Real execution is available after Notion or GitHub authorization is connected.",
            "created_at": now_str(),
            "updated_at": now_str(),
        },
    )
    row = fetch_one("SELECT * FROM sync_task WHERE id=:id AND user_id=:user_id", {"id": task_id, "user_id": user_id})
    return api_success(normalize_sync_task(row))


@router.get("/api/sync/tasks", tags=EXTENSION_TAGS, summary="List sync tasks")
def list_sync_tasks(request: Request) -> dict[str, Any]:
    user_id = current_user_id(request)
    rows = fetch_all("SELECT * FROM sync_task WHERE user_id=:user_id ORDER BY id DESC", {"user_id": user_id})
    return api_success([normalize_sync_task(row) for row in rows])


@router.get("/api/sync/tasks/{task_id}", tags=EXTENSION_TAGS, summary="Read sync task details")
def read_sync_task(task_id: int, request: Request) -> dict[str, Any]:
    user_id = current_user_id(request)
    row = fetch_one("SELECT * FROM sync_task WHERE id=:id AND user_id=:user_id", {"id": task_id, "user_id": user_id})
    if not row:
        raise HTTPException(status_code=404, detail="Sync task not found.")
    return api_success(normalize_sync_task(row))


@router.post("/api/publish/github", tags=EXTENSION_TAGS, summary="Reserved GitHub publish endpoint")
def publish_github(payload: GithubPublishIn) -> dict[str, Any]:
    return api_success(
        {
            "repo": payload.repo,
            "branch": payload.branch,
            "path": payload.path,
            "status": "recorded",
            "message": "Publish request recorded. Real publishing is available after a GitHub token is connected.",
        }
    )
