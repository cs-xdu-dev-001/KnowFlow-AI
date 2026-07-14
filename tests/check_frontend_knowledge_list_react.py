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
    require("frontend/react/src/api/client.js", "knowledgeApi", "knowledge API helper")
    require("frontend/react/src/components/KnowledgeRail.jsx", "knowledgeApi", "React knowledge rail owns knowledge API calls")
    require("frontend/react/src/components/KnowledgeRail.jsx", "loadKnowledgeBases", "React knowledge list loader")
    require("frontend/react/src/components/KnowledgeRail.jsx", "handleKnowledgeBaseSelect", "React knowledge select handler")
    require("frontend/react/src/components/KnowledgeRail.jsx", "handleKnowledgeBaseDelete", "React knowledge delete handler")
    require("frontend/react/src/components/KnowledgeRail.jsx", "knowledgeApi.delete", "React delete uses knowledge API")
    require("frontend/react/src/components/KnowledgeRail.jsx", "filteredKnowledgeBases", "React knowledge filtering stays local")
    require("frontend/react/src/components/KnowledgeRail.jsx", "knowflow:react-knowledge-selection-sync", "React syncs selected knowledge base to controller data hub")
    require("frontend/react/src/controller/bridgeBindings.js", "knowflow:react-knowledge-selection-sync", "bridge module receives React knowledge selection sync")
    require("frontend/react/src/controller/bridgeBindings.js", "knowflow:react-knowledge-bases-sync", "bridge module receives React knowledge list sync")
    require("frontend/react/src/components/KnowledgeRail.jsx", "knowledgeApi.list", "React list loads knowledge data")

    forbid("frontend/react/src/components/KnowledgeRail.jsx", "knowflow:react-knowledge-search-change", "legacy knowledge search bridge")
    forbid("frontend/react/src/components/KnowledgeRail.jsx", "knowflow:react-kb-select", "legacy knowledge select bridge")
    forbid("frontend/react/src/components/KnowledgeRail.jsx", "knowflow:react-kb-delete", "legacy knowledge delete bridge")
    forbid("frontend/react/src/components/KnowledgeRail.jsx", "knowflow:legacy-knowledge-bases-updated", "legacy knowledge list data event")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-knowledge-bases-updated", "legacy knowledge list broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-knowledge-search-change", "legacy knowledge search listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-kb-select", "legacy knowledge select listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-kb-delete", "legacy knowledge delete listener")
    forbid("frontend/react/src/controller/knowflowController.js", "state.kbSearch", "legacy knowledge search state")
    forbid("frontend/react/src/controller/knowflowController.js", "function toggleKnowledgeMenu", "legacy DOM knowledge menu")
    forbid("frontend/react/src/controller/knowflowController.js", "function deleteKnowledgeBase", "legacy controller knowledge delete action")
    forbid("frontend/react/src/controller/knowflowController.js", "function selectKnowledgeBase", "legacy controller knowledge select action")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactKnowledgeListEnabled", "dead knowledge-list ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "onclick=\"selectKnowledgeBase", "legacy inline knowledge select handler")
    forbid("frontend/react/src/controller/knowflowController.js", "onclick=\"toggleKnowledgeMenu", "legacy inline knowledge menu handler")
    forbid("frontend/react/src/controller/knowflowController.js", "onclick=\"deleteKnowledgeBase", "legacy inline knowledge delete handler")
    forbid("frontend/react/src/controller/knowflowController.js", "window.selectKnowledgeBase", "legacy global knowledge select export")
    forbid("frontend/react/src/controller/knowflowController.js", "window.deleteKnowledgeBase", "legacy global knowledge delete export")
    forbid("frontend/react/src/controller/knowflowController.js", "window.toggleKnowledgeMenu", "legacy global knowledge menu export")

    print("knowledge list search, select, and delete are owned by React")


if __name__ == "__main__":
    main()
