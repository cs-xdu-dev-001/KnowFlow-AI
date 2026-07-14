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
    require("frontend/react/src/api/client.js", "documentApi", "document API helper")
    require("frontend/react/src/api/client.js", "list: (knowledgeBaseId)", "document list API")
    require("frontend/react/src/api/client.js", "chunks: (id)", "document chunks API")
    require("frontend/react/src/api/client.js", "reindex: (id)", "document reindex API")
    require("frontend/react/src/api/client.js", "delete: (id)", "document delete API")

    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi", "React document actions API import")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleLoadDocumentChunks", "React chunks loader")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunkModalOpen", "React chunk modal open state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunksLoading", "React chunk loading state")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "chunk-modal", "React chunk modal markup")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleReindexDocument", "React reindex handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handleDeleteDocument", "React delete handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "handlePendingDocumentRemove", "React pending removal handler")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "loadDocuments", "React refreshes documents locally")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.list", "React reloads documents via API")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.chunks", "React loads chunks via API")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.reindex", "React reindexes via API")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.delete", "React deletes via API")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "handleDocumentAction", "generic document action bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-open-chunk-modal", "legacy chunk open bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-chunks-loading", "legacy chunk loading bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-chunks-updated", "legacy chunk result bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-documents-refresh-request", "legacy document refresh bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-document-chunks", "legacy chunks bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-document-reindex", "legacy reindex bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-document-delete", "legacy delete bridge")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-document-remove-pending", "legacy pending removal bridge")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-document-chunks", "legacy chunks listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-document-reindex", "legacy reindex listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-document-delete", "legacy delete listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-document-remove-pending", "legacy pending removal listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-documents-refresh-request", "legacy document refresh listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-open-chunk-modal", "legacy chunk open listener")
    forbid("frontend/react/src/controller/knowflowController.js", "function renderDocumentRows", "legacy document row renderer")
    forbid("frontend/react/src/controller/knowflowController.js", "function renderDocumentSteps", "legacy document step renderer")
    forbid("frontend/react/src/controller/knowflowController.js", "onclick=\"loadChunks", "legacy inline chunks handler")
    forbid("frontend/react/src/controller/knowflowController.js", "onclick=\"reindexDocument", "legacy inline reindex handler")
    forbid("frontend/react/src/controller/knowflowController.js", "onclick=\"deleteDocument", "legacy inline delete handler")
    forbid("frontend/react/src/controller/knowflowController.js", "onclick=\"removePendingDocument", "legacy inline pending removal handler")
    forbid("frontend/react/src/controller/knowflowController.js", "window.loadChunks", "legacy global chunks export")
    forbid("frontend/react/src/controller/knowflowController.js", "window.reindexDocument", "legacy global reindex export")
    forbid("frontend/react/src/controller/knowflowController.js", "window.deleteDocument", "legacy global delete export")
    forbid("frontend/react/src/controller/knowflowController.js", "window.removePendingDocument", "legacy global pending removal export")

    print("document list actions are owned by React")


if __name__ == "__main__":
    main()
