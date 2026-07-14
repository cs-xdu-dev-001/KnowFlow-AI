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
    require("frontend/react/src/components/ChatMessages.jsx", "knowflow:react-message-append", "React message append event")
    require("frontend/react/src/components/ChatMessages.jsx", "knowflow:react-messages-reset", "React message reset event")
    require("frontend/react/src/components/ChatMessages.jsx", "knowflow:react-message-content", "React message content event")
    require("frontend/react/src/components/ChatMessages.jsx", "knowflow:react-message-thinking", "React message thinking event")
    require("frontend/react/src/controller/knowflowController.js", "appendReactMessage", "controller delegates message append to React")
    require("frontend/react/src/controller/knowflowController.js", "clearChatMessages", "controller delegates message reset to React")
    require("frontend/react/src/controller/messageEvents.js", "knowflow:react-message-append", "message event module dispatches append event")
    require("frontend/react/src/controller/messageEvents.js", "knowflow:react-messages-reset", "message event module dispatches reset event")
    require("frontend/react/src/controller/messageEvents.js", "knowflow:react-message-content", "message event module dispatches content event")
    require("frontend/react/src/controller/messageEvents.js", "knowflow:react-message-thinking", "message event module dispatches thinking event")

    forbid("frontend/react/src/components/ChatMessages.jsx", "__knowflowReactMessages", "legacy global message controller")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactMessages", "legacy global message controller access")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactMessageActionsEnabled", "dead message action ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactMessageListEnabled", "dead message list ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "if (!window.__knowflowReactMessageListEnabled)", "dead message list guard")
    forbid("frontend/react/src/controller/knowflowController.js", "document.createElement", "legacy message DOM creation")
    forbid("frontend/react/src/controller/knowflowController.js", "$(\"#chat-messages\")", "legacy chat messages DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "innerHTML", "legacy message HTML mutation")
    forbid("frontend/react/src/controller/knowflowController.js", "function clearWelcome", "legacy welcome DOM mutation")
    forbid("frontend/react/src/controller/knowflowController.js", "if (reactBubble) return reactBubble", "legacy message append fallback branch")

    print("message bridge uses React events instead of a global controller")


if __name__ == "__main__":
    main()
