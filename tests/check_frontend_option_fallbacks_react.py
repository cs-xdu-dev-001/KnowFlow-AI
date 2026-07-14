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
    require(controller, "notifyReactModelOptionsUpdated", "React model option notifier")
    require(controller, "notifyReactKnowledgeOptionsUpdated", "React knowledge option notifier")

    for needle in [
        "const reactOwnsModelOptions",
        "if (!reactOwnsModelOptions)",
        "$(\"#chat-model-select\").innerHTML",
        "$(\"#kb-embedding-select\").innerHTML",
        "const reactOwnsKnowledgeOptions",
        "if (!reactOwnsKnowledgeOptions)",
        "$(\"#chat-kb-select\").innerHTML",
        "$(\"#doc-kb-select\").innerHTML",
        "$(\"#retrieval-kb-select\").innerHTML",
        "function optionHtml",
    ]:
        forbid(controller, needle, f"legacy select option fallback {needle}")

    print("model and knowledge option rendering is React-only")


if __name__ == "__main__":
    main()
