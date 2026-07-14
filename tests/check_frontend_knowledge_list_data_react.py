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
    require("frontend/react/src/components/KnowledgeRail.jsx", "loadKnowledgeBases", "React knowledge list loader")
    require("frontend/react/src/components/KnowledgeRail.jsx", "knowledgeApi.list", "React knowledge list API call")
    require("frontend/react/src/components/KnowledgeRail.jsx", "setKnowledgeBases", "React owns knowledge list state")
    require("frontend/react/src/components/KnowledgeRail.jsx", "knowflow:react-knowledge-bases-refresh-request", "React refreshes knowledge list on create")
    require("frontend/react/src/components/KnowledgeRail.jsx", "syncKnowledgeBases", "React syncs list to shared data hub")
    require("frontend/react/src/controller/reactNotifications.js", "knowflow:react-knowledge-options-updated", "controller broadcasts shared knowledge options through React channel")

    forbid("frontend/react/src/components/KnowledgeRail.jsx", "knowflow:legacy-knowledge-bases-updated", "legacy knowledge list data event")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-knowledge-bases-updated", "legacy knowledge list broadcast")
    forbid("frontend/react/src/components/ChatComposerForm.jsx", "knowflow:legacy-knowledge-options-updated", "legacy composer knowledge options listener")
    forbid("frontend/react/src/components/ChatComposerForm.jsx", "knowflow:legacy-knowledge-selection-updated", "legacy composer knowledge selection listener")
    forbid("frontend/react/src/components/ChatContextToolbar.jsx", "knowflow:legacy-knowledge-options-updated", "legacy toolbar knowledge options listener")
    forbid("frontend/react/src/components/ChatContextToolbar.jsx", "knowflow:legacy-knowledge-selection-updated", "legacy toolbar knowledge selection listener")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-knowledge-options-updated", "legacy document knowledge options listener")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-knowledge-selection-updated", "legacy document knowledge selection listener")
    forbid("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "knowflow:legacy-knowledge-options-updated", "legacy retrieval knowledge options listener")
    forbid("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "knowflow:legacy-knowledge-selection-updated", "legacy retrieval knowledge selection listener")
    forbid("frontend/react/src/components/KnowledgeSummary.jsx", "knowflow:legacy-knowledge-options-updated", "legacy summary knowledge options listener")
    forbid("frontend/react/src/components/KnowledgeSummary.jsx", "knowflow:legacy-knowledge-selection-updated", "legacy summary knowledge selection listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-knowledge-options-updated", "legacy knowledge options broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-knowledge-selection-updated", "legacy knowledge selection broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactKnowledgeOptionsEnabled", "dead knowledge options ownership flag")


if __name__ == "__main__":
    main()
