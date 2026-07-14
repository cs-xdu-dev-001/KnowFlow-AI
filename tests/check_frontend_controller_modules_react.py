from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(path: str, needle: str, label: str) -> None:
    text = read(path)
    if needle not in text:
        raise AssertionError(f"missing {label} in {path}: {needle}")


def forbid(path: str, needle: str, label: str) -> None:
    text = read(path)
    if needle in text:
        raise AssertionError(f"unexpected {label} in {path}: {needle}")


def main() -> None:
    controller = "frontend/react/src/controller/knowflowController.js"

    for module_path, exports in [
        ("frontend/react/src/controller/markdown.js", ["export function escapeHtml", "export function renderMarkdown"]),
        ("frontend/react/src/controller/messageEvents.js", ["export function appendReactMessage", "knowflow:react-message-append"]),
        ("frontend/react/src/controller/reactNotifications.js", ["export function notifyReactModelOptionsUpdated", "knowflow:react-toast"]),
        ("frontend/react/src/controller/uploadValidation.js", ["MAX_CLIENT_UPLOAD_SIZE", "export function validateClientUploadFile"]),
        ("frontend/react/src/controller/selectionResolvers.js", ["export function resolveChatModelConfigId", "export function resolveKnowledgeBaseId"]),
        ("frontend/react/src/controller/request.js", ["apiRequest as request"]),
        ("frontend/react/src/controller/chatFlow.js", ["export function createChatFlow", "async function submitChat"]),
        ("frontend/react/src/controller/authFlow.js", ["export function createAuthFlow", "async function checkAuth"]),
        ("frontend/react/src/controller/catalogSync.js", ["export function createCatalogSync", "async function refreshKnowledgeBases"]),
        ("frontend/react/src/controller/attachmentFlow.js", ["export function createAttachmentFlow", "async function handleComposerPaste"]),
    ]:
        for token in exports:
            require(module_path, token, f"controller module export {token}")

    for token, label in [
        ('from "./messageEvents.js"', "message event module import"),
        ('from "./reactNotifications.js"', "React notification module import"),
        ('from "./chatFlow.js"', "chat flow module import"),
        ('from "./authFlow.js"', "auth flow module import"),
        ('from "./catalogSync.js"', "catalog sync module import"),
        ('from "./attachmentFlow.js"', "attachment flow module import"),
    ]:
        require(controller, token, label)

    for token, label in [
        ("fetch(", "direct request fetch"),
        ("readErrorMessage", "inline request error parser"),
        ("function escapeHtml", "inline Markdown escaping"),
        ("function renderInlineMarkdown", "inline Markdown rendering"),
        ("const MAX_CLIENT_UPLOAD_SIZE", "inline upload size constant"),
        ("const CLIENT_ALLOWED_SUFFIXES", "inline upload suffix set"),
        ("function formatBytes", "inline upload byte formatter"),
        ("function fileSuffix", "inline upload suffix parser"),
        ("function hasModelConfig", "inline model resolver predicate"),
        ("function hasKnowledgeBase", "inline knowledge resolver predicate"),
        ("async function checkAuth", "inline auth flow"),
        ("async function refreshKnowledgeBases", "inline catalog refresh"),
        ("async function uploadChatAttachment", "inline attachment upload"),
        ("async function handleComposerPaste", "inline attachment paste handling"),
    ]:
        forbid(controller, token, label)

    print("controller helpers and flows are split into focused modules")


if __name__ == "__main__":
    main()
