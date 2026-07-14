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
    chat_flow = "frontend/react/src/controller/chatFlow.js"

    require(chat_flow, "export function createChatFlow", "chat flow factory")
    for token, label in [
        ("async function continueSession", "continue session flow"),
        ("function startNewChat", "new chat flow"),
        ("function stopChatGeneration", "stop generation flow"),
        ("async function retryAnswer", "retry answer flow"),
        ("async function submitChat", "streaming submit flow"),
        ("appendMessage(\"assistant\", \"\", { thinking: true, streaming: true })", "assistant streaming append"),
        ("state.selectedChatKnowledgeBaseId ? Number(state.selectedChatKnowledgeBaseId) : null", "React-owned knowledge id snapshot"),
        ("state.selectedChatModelConfigId ? Number(state.selectedChatModelConfigId) : null", "React-owned model id snapshot"),
    ]:
        require(chat_flow, token, label)

    require(controller, "createChatFlow", "controller imports chat flow factory")
    require(controller, "chatFlow.continueSession", "controller exposes continue flow to bridges")
    require(controller, "dispatchReactMessagesReset", "controller can clear React messages")
    require(controller, "function clearChatMessages", "controller defines message clearing helper")

    for token, label in [
        ("async function continueSession", "inline continue session flow"),
        ("function startNewChat", "inline new chat flow"),
        ("function stopChatGeneration", "inline stop generation flow"),
        ("async function retryAnswer", "inline retry answer flow"),
        ("async function submitChat", "inline streaming submit flow"),
        ("resetReactChatMessages", "undefined legacy reset helper"),
    ]:
        forbid(controller, token, label)

    print("chat streaming flow is split out of knowflowController")


if __name__ == "__main__":
    main()
