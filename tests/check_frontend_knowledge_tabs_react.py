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
    require("frontend/react/src/components/KnowledgePage.jsx", "activeTab", "React knowledge active tab state")
    require("frontend/react/src/components/KnowledgePage.jsx", "setActiveTab", "React knowledge tab setter")
    require("frontend/react/src/components/KnowledgePage.jsx", "handleOpenRetrievalDrawer", "React retrieval open callback")
    require("frontend/react/src/components/KnowledgePage.jsx", "handleCloseRetrievalDrawer", "React retrieval close callback")
    require("frontend/react/src/components/KnowledgePage.jsx", 'setActiveTab("retrieval")', "React switches to retrieval tab")
    require("frontend/react/src/components/KnowledgePage.jsx", 'setActiveTab("documents")', "React returns to documents tab")
    require("frontend/react/src/components/KnowledgePage.jsx", "KnowledgeTabBar", "React renders tab buttons")

    forbid("frontend/react/src/components/KnowledgePage.jsx", "knowflow:legacy-knowledge-tab-change", "legacy knowledge tab event")
    forbid("frontend/react/src/components/KnowledgePage.jsx", "knowflow:react-open-retrieval-drawer", "legacy retrieval open event")
    forbid("frontend/react/src/components/KnowledgePage.jsx", "knowflow:react-close-retrieval-drawer", "legacy retrieval close event")
    forbid("frontend/react/src/controller/knowflowController.js", "notifyReactKnowledgeTabChange", "knowledge tab notifier")
    forbid("frontend/react/src/controller/knowflowController.js", "function switchKnowledgeTab", "knowledge tab DOM switcher")
    forbid("frontend/react/src/controller/knowflowController.js", "window.switchKnowledgeTab", "global knowledge tab switcher")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-knowledge-tab-change", "legacy knowledge tab dispatch")
    forbid("frontend/react/src/controller/knowflowController.js", "setupKnowledgePageWorkspace", "legacy knowledge workspace setup")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactKnowledgeActionsEnabled", "legacy knowledge action ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactKnowledgeWorkspaceEnabled", "legacy knowledge workspace ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "$all(\"[data-kb-tab]\")", "knowledge tab class toggling")
    forbid("frontend/react/src/controller/knowflowController.js", "$all(\"[data-kb-tab-panel]\")", "knowledge panel class toggling")


if __name__ == "__main__":
    main()
