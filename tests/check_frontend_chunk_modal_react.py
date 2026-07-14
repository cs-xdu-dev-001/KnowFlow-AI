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
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunkModalOpen", "React chunk modal open state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunks", "React chunk list state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunksLoading", "React chunk loading state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleChunkModalBackdrop", "React chunk modal backdrop handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleCloseChunkModal", "React chunk modal close handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.chunks", "React loads document chunks")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunk-modal", "React document component renders chunk modal")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunk-list", "React document component renders chunk list")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunks.map", "React chunk modal maps chunk state")

    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "个分段.map", "broken translated chunk variable")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-open-chunk-modal", "legacy chunk open event")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-chunks-loading", "legacy chunk loading event")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-chunks-updated", "legacy chunk result event")
    forbid("frontend/react/src/components/KnowledgeModals.jsx", "chunk-modal", "chunk modal outside document component")
    forbid("frontend/react/src/components/KnowledgeModals.jsx", "legacy-chunks", "legacy chunk modal event listener")
    forbid("frontend/react/src/controller/knowflowController.js", "function openChunkModal", "legacy chunk modal opener")
    forbid("frontend/react/src/controller/knowflowController.js", "function closeChunkModal", "legacy chunk modal closer")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-open-chunk-modal", "legacy chunk open listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-close-chunk-modal", "legacy chunk close listener")
    forbid("frontend/react/src/controller/knowflowController.js", "window.openChunkModal", "legacy chunk open global")
    forbid("frontend/react/src/controller/knowflowController.js", "window.closeChunkModal", "legacy chunk close global")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactChunkListEnabled", "dead chunk list flag")

    print("chunk preview modal is owned by React")


if __name__ == "__main__":
    main()
