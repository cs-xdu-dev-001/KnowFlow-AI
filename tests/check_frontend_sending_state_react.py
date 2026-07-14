from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def require(relative_path: str, needle: str, label: str) -> None:
    if needle not in read(relative_path):
        raise AssertionError(f"Missing {label}: {needle}")


def forbid(relative_path: str, needle: str, label: str) -> None:
    if needle in read(relative_path):
        raise AssertionError(f"Legacy {label} still present: {needle}")


def main() -> None:
    require("frontend/react/src/components/ChatComposerForm.jsx", "sending", "React composer sending state")
    require("frontend/react/src/components/ChatComposerForm.jsx", "knowflow:react-sending-updated", "React composer sending event")
    require("frontend/react/src/controller/knowflowController.js", "knowflow:react-sending-updated", "controller dispatches React sending event")

    forbid("frontend/react/src/components/ChatComposerForm.jsx", "knowflow:legacy-sending-updated", "legacy sending event listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-sending-updated", "legacy sending event dispatch")
    forbid("frontend/react/src/controller/knowflowController.js", "notifyReactSendingUpdated", "legacy sending notifier")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactSendingStateEnabled", "legacy sending ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "renderSendButton", "legacy send button renderer")
    forbid("frontend/react/src/controller/knowflowController.js", "chat-submit-btn", "legacy send button DOM access")


if __name__ == "__main__":
    main()
