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
    require("frontend/react/src/components/KnowledgeSummary.jsx", "knowledgeBases", "React summary knowledge base state")
    require("frontend/react/src/components/KnowledgeSummary.jsx", "models", "React summary model state")
    require("frontend/react/src/components/KnowledgeSummary.jsx", "selectedKnowledgeBaseId", "React summary selected id state")
    require("frontend/react/src/components/KnowledgeSummary.jsx", "selectedKnowledgeBase", "React summary derives selected knowledge base")
    require("frontend/react/src/components/KnowledgeSummary.jsx", "embeddingModel", "React summary derives embedding model")
    require("frontend/react/src/components/KnowledgeSummary.jsx", "if (!selectedKnowledgeBase) return null;", "empty knowledge summary stays out of the workspace")
    require(
        "frontend/react/src/components/KnowledgeSummary.jsx",
        "knowflow:react-knowledge-options-updated",
        "React summary receives shared knowledge options",
    )
    require(
        "frontend/react/src/components/KnowledgeSummary.jsx",
        "knowflow:react-knowledge-selection-updated",
        "React summary receives shared knowledge selection",
    )
    require(
        "frontend/react/src/components/KnowledgeSummary.jsx",
        "knowflow:react-model-options-updated",
        "React summary receives shared model options",
    )

    forbid("frontend/react/src/components/KnowledgeSummary.jsx", "knowflow:legacy-knowledge-detail-updated", "legacy knowledge detail event")
    forbid("frontend/react/src/controller/knowflowController.js", "function renderKnowledgeBaseDetail", "legacy knowledge detail renderer")
    forbid("frontend/react/src/controller/knowflowController.js", "legacy-knowledge-detail-updated", "legacy knowledge detail event")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactKnowledgeDetailEnabled", "dead knowledge detail flag")

    print("knowledge summary details are derived in React")


if __name__ == "__main__":
    main()
