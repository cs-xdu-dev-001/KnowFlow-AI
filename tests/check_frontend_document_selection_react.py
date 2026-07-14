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
    require("frontend/react/src/api/client.js", "list: (knowledgeBaseId)", "document list API")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "loadDocuments", "React document loader")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "documentApi.list", "React loads documents via API")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "isDocumentProcessing", "React document polling predicate")
    require("frontend/react/src/components/KnowledgeDocuments.jsx", "setTimeout", "React processing document poller")
    require(
        "frontend/react/src/components/KnowledgeDocuments.jsx",
        "knowflow:react-knowledge-selection-sync",
        "React syncs document knowledge selection through the shared knowledge event",
    )

    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-document-kb-change", "legacy document kb change event")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:react-documents-refresh-request", "legacy document refresh event")
    forbid("frontend/react/src/components/KnowledgeDocuments.jsx", "knowflow:legacy-documents-updated", "legacy document result event")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-documents-updated", "legacy document result broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactDocumentListEnabled", "dead document list ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "function handleDocumentKnowledgeBaseSelection", "legacy document kb change handler")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-document-kb-change", "legacy document kb change listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-documents-refresh-request", "legacy document refresh listener")

    print("document knowledge selection and refresh are owned by React")


if __name__ == "__main__":
    main()
