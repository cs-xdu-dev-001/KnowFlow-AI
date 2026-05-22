from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def read_backend() -> str:
    files = [ROOT / "backend" / "main.py", *sorted((ROOT / "backend" / "knowflow").rglob("*.py"))]
    return "\n".join(path.read_text(encoding="utf-8") for path in files)


def read_frontend() -> str:
    files = [ROOT / "frontend" / "index.html", *sorted((ROOT / "frontend" / "react" / "src").rglob("*.*"))]
    return "\n".join(path.read_text(encoding="utf-8") for path in files if path.is_file())


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise AssertionError(f"missing {label}: {needle}")


def forbid(text: str, needle: str, label: str) -> None:
    if needle in text:
        raise AssertionError(f"unexpected {label}: {needle}")


def main() -> None:
    backend = read_backend()
    chat_router = read("backend/knowflow/routers/chat.py")
    app_js = read("frontend/react/src/controller/knowflowController.js")
    frontend = read_frontend()
    styles = read("frontend/styles.css")

    require(backend, "class ChatAttachment", "chat attachment model")
    require(backend, "IMAGE_SUFFIXES", "image attachment suffix support")
    require(backend, "previewUrl", "image preview data URL")
    require(backend, "base64.b64encode", "image preview encoding")
    require(backend, "enableTools: bool = False", "ChatRequest enableTools flag")
    require(backend, 'toolMode: str = "auto"', "ChatRequest tool mode")
    require(backend, "enabledTools: list[str]", "manual enabled tools")
    require(backend, "attachments: list[ChatAttachment]", "chat request attachments")
    require(backend, '"/api/chat/attachments"', "chat attachment upload endpoint")
    require(backend, "toolCalls", "tool calls returned to stream")
    require(backend, "remote_model_error_answer", "remote model error answer")
    require(backend, "未使用本地 fallback 伪装回答", "configured remote model should not silently fallback")
    require(backend, "127.0.0.1/localhost 指的是 KnowFlow 后端所在机器", "localhost endpoint hint")
    require(chat_router, "from .extensions import agent_chat", "chat endpoint can route automatic tool requests to agent handler")
    for tool_name in ["knowledge_search", "session_memory_search", "document_summary", "markdown_draft_generate"]:
        require(backend, tool_name, f"backend tool {tool_name}")

    require(frontend, 'id={"composer-plus-btn"}', "composer plus button")
    require(frontend, 'id={"composer-menu"}', "composer tool menu")
    require(frontend, 'id={"chat-file-input"}', "chat file upload input")
    require(frontend, 'id={"attachment-tray"}', "attachment tray")
    require(frontend, "menu-card", "compact menu card rows")
    require(frontend, 'id={"composer-kb-select"}', "composer knowledge-base selector")
    require(frontend, "普通对话，不使用知识库", "simplified composer context copy")
    require(frontend, 'id={"tool-timeline-mini"}', "tool drawer")
    for token in ["tool-mode-tabs", "tool-option-grid", 'name="tool-mode"', 'value="manual"', 'data-tool="knowledge_search"']:
        forbid(frontend, token, "manual tool control")

    require(app_js, "chatAttachments", "frontend attachment state")
    require(app_js, "handleComposerPaste", "paste handler")
    require(app_js, "clipboardData.items", "clipboard item inspection")
    require(app_js, 'item.type.startsWith("image/")', "image paste detection")
    require(app_js, "useRag: Boolean(knowledgeBaseId)", "knowledge selector controls RAG")
    require(app_js, "enableTools: false", "manual tools disabled in simplified composer")
    require(app_js, "autoAgent: false", "agent routing disabled in simplified composer")
    require(app_js, "enabledTools: []", "frontend sends no manual tools")
    require(app_js, "attachments:", "frontend sends attachments")
    require(app_js, "uploadChatAttachment", "frontend uploads chat attachment")
    require(app_js, "removeChatAttachment", "frontend removes chat attachment")
    require(app_js, "previewUrl", "frontend image preview")
    require(app_js, "renderToolStatus", "frontend renders tool status")
    for token in ["react-tool-mode-change", "react-tool-selection-change", "selectedTools", "persistToolSettings"]:
        forbid(app_js, token, "manual tool frontend state")

    require(styles, ".composer-plus", "composer plus styles")
    require(styles, ".composer-menu", "composer menu styles")
    require(styles, ".menu-card", "compact menu row styles")
    require(styles, ".menu-select-card", "knowledge selector styles")
    require(styles, ".attachment-tray", "attachment tray styles")
    require(styles, ".attachment-thumb", "attachment image thumbnail styles")
    require(styles, ".tool-chip", "tool chip styles")
    for token in [".tool-mode-tabs", ".tool-option-grid", ".manual-tool-options"]:
        forbid(styles, token, "manual tool style")
    forbid(frontend, '<div class="menu-title">????</div>', "old form-like tool mode block")


if __name__ == "__main__":
    main()

