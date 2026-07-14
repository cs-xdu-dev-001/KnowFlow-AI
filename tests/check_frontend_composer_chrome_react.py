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
    require("frontend/react/src/components/ChatComposerForm.jsx", "composer-settings-panel", "React composer settings panel")
    require("frontend/react/src/components/ChatComposerForm.jsx", "composer-context-summary", "React composer context summary")
    require("frontend/react/src/components/ChatComposerForm.jsx", "selectedKnowledgeBaseId ? \"\u5df2\u9009\u62e9\u77e5\u8bc6\u5e93\" : \"\u672a\u9009\u62e9\u77e5\u8bc6\u5e93\"", "React composer summary text")

    forbid("frontend/react/src/controller/knowflowController.js", "normalizeComposerControlsLayout", "legacy composer layout normalizer")
    forbid("frontend/react/src/controller/knowflowController.js", "composer-settings-panel", "legacy composer settings panel DOM")
    forbid("frontend/react/src/controller/knowflowController.js", "composer-settings-grid", "legacy composer settings grid DOM")
    forbid("frontend/react/src/controller/knowflowController.js", "composer-context-summary", "legacy composer context summary DOM")

    print("composer chrome layout is owned by React")


if __name__ == "__main__":
    main()
