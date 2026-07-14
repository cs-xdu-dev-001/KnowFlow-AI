from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(path: str, needle: str, label: str) -> None:
    content = read(path)
    if needle not in content:
        raise AssertionError(f"missing {label} in {path}: {needle}")


def forbid(path: str, needle: str, label: str) -> None:
    content = read(path)
    if needle in content:
        raise AssertionError(f"legacy {label} still present in {path}: {needle}")


def main() -> None:
    require("frontend/react/src/api/client.js", "upload: (knowledgeBaseId, file)", "document upload API")

    require("frontend/react/src/components/KnowledgeDocuments.jsx", "selectedDocumentFile", "React selected upload file state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "pendingDocuments", "React pending upload queue state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "MAX_CLIENT_UPLOAD_SIZE", "React upload size validation")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "CLIENT_ALLOWED_SUFFIXES", "React upload extension validation")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "validateDocumentUploadFile", "React upload validator")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "optimisticDocument", "React optimistic upload row")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "sameDocumentIdentity", "React pending/server merge identity")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "mergePendingDocuments", "React pending/server merge")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "markPendingDocumentProcessing", "React upload processing state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "failPendingDocument", "React upload failure state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "clearResolvedPendingDocuments", "React clears resolved pending rows")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleSelectedDocumentFile", "React file selection handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleDocumentSubmit", "React upload submit handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "const dropZoneClassName", "React drop zone class state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "selectedDocumentFile ? \"has-file\"", "React drop zone selected-file class")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.upload", "React uploads document via API")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "loadDocuments", "React reloads uploaded documents")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.list", "React list API after upload")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "setUploadModalOpen(false)", "React closes upload modal after success")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "fileInputRef", "React resets file input")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "document-file-name", "React renders selected file label")

    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-document-submit", "legacy upload submit bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-document-file-select", "legacy upload file bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-documents-refresh-request", "legacy document refresh bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "selectedDocumentFile", "controller selected upload file state")
    forbid("frontend/react/src/controller/knowflowController.js", "pendingDocuments", "controller pending upload queue")
    forbid("frontend/react/src/controller/knowflowController.js", "function submitDocumentForm", "controller upload submit handler")
    forbid("frontend/react/src/controller/knowflowController.js", "function handleSelectedDocumentFile", "controller file selection handler")
    forbid("frontend/react/src/controller/knowflowController.js", "function optimisticDocument", "controller optimistic upload row")
    forbid("frontend/react/src/controller/knowflowController.js", "function mergePendingDocuments", "controller pending/server merge")
    forbid("frontend/react/src/controller/knowflowController.js", "function markPendingDocumentProcessing", "controller processing state")
    forbid("frontend/react/src/controller/knowflowController.js", "function failPendingDocument", "controller failure state")
    forbid("frontend/react/src/controller/knowflowController.js", "function clearResolvedPendingDocuments", "controller pending cleanup")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-document-submit", "controller legacy upload submit listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-document-file-select", "controller legacy upload file listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-documents-refresh-request", "controller legacy document refresh listener")
    forbid("frontend/react/src/controller/knowflowController.js", "bindReactDocumentUploadBridge", "dead document upload bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactDocumentUploadEnabled", "dead document upload flag")
    forbid("frontend/react/src/controller/knowflowController.js", "document-form input[type='file']", "legacy document upload DOM setup")

    print("document upload form and pending queue are owned by React")


if __name__ == "__main__":
    main()
