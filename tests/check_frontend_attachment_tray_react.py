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
    require("frontend/react/src/components/ChatComposerForm.jsx", "knowflow:react-attachments-updated", "React attachment tray event")
    require("frontend/react/src/controller/knowflowController.js", "knowflow:react-attachments-updated", "controller attachment React event")

    forbid("frontend/react/src/components/ChatComposerForm.jsx", "knowflow:legacy-attachments-updated", "legacy attachment listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-attachments-updated", "legacy attachment broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactAttachmentTrayEnabled", "dead attachment-tray ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "tray.innerHTML = state.chatAttachments", "legacy attachment DOM renderer")

    print("attachment tray rendering is owned by React")


if __name__ == "__main__":
    main()
