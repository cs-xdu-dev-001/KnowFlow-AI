from fastapi import APIRouter

from ..runtime import *

router = APIRouter()

EXTENSION_TAGS = ["Extensions"]


def normalize_sync_task(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {}
    return {key: value for key, value in row.items() if key != "user_id"}


def _contains_any(text_value: str, keywords: list[str]) -> bool:
    return any(keyword in text_value for keyword in keywords)


@router.post("/api/agent/chat", tags=EXTENSION_TAGS, summary="Reserved agent chat endpoint")
def agent_chat(payload: ChatRequest, request: Request) -> dict[str, Any]:
    user_id = current_user_id(request)
    if payload.useRag and not payload.knowledgeBaseId:
        raise HTTPException(status_code=400, detail="knowledgeBaseId is required when RAG is enabled")
    if payload.knowledgeBaseId:
        get_kb(payload.knowledgeBaseId, user_id)
    session_id = ensure_session(payload.sessionId, payload.knowledgeBaseId, payload.chatModelConfigId, user_id)
    save_message(session_id, "user", payload.question)
    calls: list[dict[str, Any]] = []
    tool_mode = (payload.toolMode or "auto").lower()
    manual = tool_mode == "manual"
    enabled_tools = set(payload.enabledTools or [])

    def run_tool(name: str, auto_condition: bool = True) -> bool:
        return name in enabled_tools if manual else auto_condition

    chunks: list[dict[str, Any]] = []
    if run_tool("knowledge_search", bool(payload.knowledgeBaseId)):
        started = time.time()
        if payload.knowledgeBaseId:
            chunks = retrieve_chunks(payload.knowledgeBaseId, payload.question, DEFAULT_TOP_K, user_id)
            output = f"Retrieved {len(chunks)} chunks."
            status = "success"
        else:
            output = "No knowledge base was selected, so knowledge retrieval did not run."
            status = "failed"
        calls.append(
            log_tool_call(
                session_id,
                None,
                "knowledge_search",
                {"knowledgeBaseId": payload.knowledgeBaseId, "query": payload.question, "topK": DEFAULT_TOP_K},
                output,
                status=status,
                started_at=started,
            )
        )

    started = time.time()
    history = get_recent_history(session_id)
    if run_tool("session_memory_search", True):
        calls.append(log_tool_call(session_id, None, "session_memory_search", {"sessionId": session_id, "limit": 8}, f"Read {len(history)} history messages.", started_at=started))

    summary_keywords = ["summary", "summarize", "highlights", "overview", "\u603b\u7ed3", "\u4eae\u70b9", "\u6982\u62ec"]
    if run_tool("document_summary", _contains_any(payload.question.lower(), summary_keywords)):
        started = time.time()
        attachment_summary = "; ".join((item.content or "")[:90] for item in payload.attachments[:3])
        summary = "; ".join((item["chunk_text"] or "")[:90] for item in chunks[:3]) or attachment_summary or "No content is available to summarize."
        calls.append(log_tool_call(session_id, None, "document_summary", {"chunkIds": [item["chunk_id"] for item in chunks[:3]], "summaryType": "brief"}, summary, started_at=started))

    draft_keywords = ["markdown", "draft", "blog", "\u8349\u7a3f", "\u535a\u5ba2"]
    if run_tool("markdown_draft_generate", _contains_any(payload.question.lower(), draft_keywords)):
        started = time.time()
        draft_source = "\n\n".join((item["chunk_text"] or "")[:200] for item in chunks[:3]) or "\n\n".join((item.content or "")[:200] for item in payload.attachments[:3])
        draft = "# " + payload.question[:40] + "\n\n" + draft_source
        calls.append(log_tool_call(session_id, None, "markdown_draft_generate", {"title": payload.question[:40], "contentType": "project_doc"}, draft, started_at=started))

    chat_config = get_model_config(payload.chatModelConfigId, "chat", user_id)
    answer = generate_answer(payload.question, chunks, history, chat_config, agent_mode=True, use_rag=bool(payload.knowledgeBaseId), attachments=payload.attachments)
    message_id = save_message(session_id, "assistant", answer)
    refs = save_references(message_id, chunks)
    execute("UPDATE agent_tool_call SET message_id=:message_id WHERE session_id=:session_id AND message_id IS NULL", {"message_id": message_id, "session_id": session_id})
    return api_success({"sessionId": session_id, "messageId": message_id, "answer": answer, "references": refs, "toolCalls": calls})


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
