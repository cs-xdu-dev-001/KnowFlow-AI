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
    require("frontend/react/src/components/KnowledgePage.jsx", "handleOpenRetrievalDrawer", "React retrieval panel open callback")
    require("frontend/react/src/components/KnowledgePage.jsx", "handleCloseRetrievalDrawer", "React retrieval panel close callback")
    require("frontend/react/src/components/KnowledgePage.jsx", 'setActiveTab("retrieval")', "React opens retrieval tab")
    require("frontend/react/src/components/KnowledgePage.jsx", 'setActiveTab("documents")', "React closes retrieval tab")
    require("frontend/react/src/components/KnowledgeHeader.jsx", "onOpenRetrievalDrawer", "React header opens retrieval by prop")
    require("frontend/react/src/components/KnowledgeRail.jsx", "onOpenRetrievalDrawer", "React rail opens retrieval by prop")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "onOpenRetrievalDrawer", "duplicate document retrieval callback")
    require("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "onClose", "React retrieval drawer closes by prop")

    for relative_path in [
        "frontend/react/src/components/KnowledgePage.jsx",
        "frontend/react/src/components/KnowledgeHeader.jsx",
        "frontend/react/src/components/KnowledgeRail.jsx",
        "frontend/react/src/components/KnowledgeDocuments.jsx",
        "frontend/react/src/components/KnowledgeRetrievalDrawer.jsx",
        "frontend/react/src/controller/knowflowController.js",
    ]:
        forbid(relative_path, "knowflow:react-open-retrieval-drawer", "retrieval open event")
        forbid(relative_path, "knowflow:react-close-retrieval-drawer", "retrieval close event")

    forbid("frontend/react/src/controller/knowflowController.js", "function openRetrievalDrawer(", "retrieval drawer open bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "function closeRetrievalDrawer", "retrieval drawer close bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "window.openRetrievalDrawer", "global retrieval opener")
    forbid("frontend/react/src/controller/knowflowController.js", "window.closeRetrievalDrawer", "global retrieval closer")


if __name__ == "__main__":
    main()
