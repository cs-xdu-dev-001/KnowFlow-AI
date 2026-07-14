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
    require("frontend/react/src/components/KnowledgePage.jsx", "knowledgeModalOpen", "React knowledge modal open state")
    require("frontend/react/src/components/KnowledgePage.jsx", "setKnowledgeModalOpen", "React knowledge modal setter")
    require("frontend/react/src/components/KnowledgePage.jsx", "onOpenKnowledgeBaseModal", "React passes modal open callback")
    require("frontend/react/src/components/KnowledgeHeader.jsx", "onOpenKnowledgeBaseModal", "React header opens knowledge modal by prop")
    forbid("frontend/react/src/components/KnowledgeRail.jsx", "onOpenKnowledgeBaseModal", "duplicate rail knowledge modal callback")
    require("frontend/react/src/components/KnowledgeModals.jsx", "knowledgeModalOpen", "React modal visibility prop")
    require("frontend/react/src/components/KnowledgeModals.jsx", "setKnowledgeModalOpen(false)", "React modal close action")
    require("frontend/react/src/components/KnowledgeModals.jsx", "nameInputRef", "React modal name input ref")
    require("frontend/react/src/components/KnowledgeModals.jsx", "focus()", "React modal focuses name input")
    require("frontend/react/src/components/KnowledgeModals.jsx", 'event.key === "Escape"', "knowledge modal Escape close")
    require("frontend/react/src/components/KnowledgeModals.jsx", "kb-modal", "React knowledge modal markup")
    require("frontend/react/src/components/KnowledgeModals.jsx", "knowledgeApi.create", "React creates knowledge base")

    for relative_path in [
        "frontend/react/src/components/KnowledgePage.jsx",
        "frontend/react/src/components/KnowledgeHeader.jsx",
        "frontend/react/src/components/KnowledgeRail.jsx",
        "frontend/react/src/components/KnowledgeModals.jsx",
        "frontend/react/src/controller/knowflowController.js",
    ]:
        forbid(relative_path, "knowflow:react-open-kb-modal", "knowledge modal open event")
        forbid(relative_path, "knowflow:react-close-kb-modal", "knowledge modal close event")

    forbid("frontend/react/src/controller/knowflowController.js", "function openKnowledgeBaseModal", "knowledge modal open bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "function closeKnowledgeBaseModal", "knowledge modal close bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "window.openKnowledgeBaseModal", "global knowledge modal opener")
    forbid("frontend/react/src/controller/knowflowController.js", "window.closeKnowledgeBaseModal", "global knowledge modal closer")


if __name__ == "__main__":
    main()
