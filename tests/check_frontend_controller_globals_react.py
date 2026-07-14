from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def forbid(path: str, needle: str, label: str) -> None:
    text = read(path)
    if needle in text:
        raise AssertionError(f"unexpected {label} in {path}: {needle}")


def main() -> None:
    controller = "frontend/react/src/controller/knowflowController.js"
    for needle in [
        "window.switchPage",
        "window.removeChatAttachment",
        "window.retryLastAnswer",
        "window.stopChatGeneration",
    ]:
        forbid(controller, needle, f"legacy global controller export {needle}")

    print("legacy global controller exports are removed")


if __name__ == "__main__":
    main()
