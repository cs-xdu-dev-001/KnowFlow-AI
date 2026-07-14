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
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "uploadModalOpen", "React upload modal open state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleOpenUploadModal", "React upload modal open handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleCloseUploadModal", "React upload modal close handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleUploadModalBackdrop", "React upload modal backdrop handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", 'event.key === "Escape"', "document modal Escape close")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "upload-modal-trigger", "React upload trigger")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "upload-modal", "React upload modal markup")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "setUploadModalOpen(false)", "React closes upload modal after successful upload")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "setUploadModalOpen(true)", "document toolbar opens upload modal directly")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "disabled={!selectedKnowledgeBaseId}", "upload action is disabled without a knowledge base")
    require(
        "frontend/react/src/components/KnowledgeDocuments.jsx",
        "disabled={uploadingDocument || !selectedDocumentFile}",
        "upload submit waits for a selected document",
    )
    require(
        "frontend/react/src/components/KnowledgeDocuments.jsx",
        "knowflow:react-knowledge-bases-refresh-request",
        "document terminal state refreshes knowledge base statistics",
    )

    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-upload-modal-open", "legacy upload modal open event")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-upload-modal-close", "legacy upload modal close event")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactUploadModalEnabled", "upload modal ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "notifyReactUploadModalOpen", "upload modal open notifier")
    forbid("frontend/react/src/controller/knowflowController.js", "notifyReactUploadModalClose", "upload modal close notifier")
    forbid("frontend/react/src/controller/knowflowController.js", "setupKnowledgeUploadModal", "upload modal setup helper")
    forbid("frontend/react/src/controller/knowflowController.js", "function openUploadModal", "upload modal open bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "function closeUploadModal", "upload modal close bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "window.openUploadModal", "global upload modal opener")
    forbid("frontend/react/src/controller/knowflowController.js", "window.closeUploadModal", "global upload modal closer")


if __name__ == "__main__":
    main()
