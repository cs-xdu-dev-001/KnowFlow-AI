from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTROLLER_JS = ROOT / "frontend" / "react" / "src" / "controller" / "knowflowController.js"
CSS = ROOT / "frontend" / "styles.css"


def assert_contains(path: Path, *needles: str) -> None:
    text = path.read_text(encoding="utf-8")
    missing = [needle for needle in needles if needle not in text]
    if missing:
      raise AssertionError(f"{path} missing: {missing}")


def assert_not_contains(path: Path, *needles: str) -> None:
    text = path.read_text(encoding="utf-8")
    present = [needle for needle in needles if needle in text]
    if present:
        raise AssertionError(f"{path} should not contain: {present}")


def main() -> None:
    required_js = [
        "pendingDocuments",
        "mergePendingDocuments",
        "markPendingDocumentProcessing",
        "sameDocumentIdentity",
        "left.server_document_id",
        "leftServerId === rightId",
        "setupKnowledgePageWorkspace",
        "switchKnowledgeTab",
        "notifyReactKnowledgeTabChange",
        "openUploadModal",
        "closeUploadModal",
        "notifyReactUploadModalOpen",
        "notifyReactUploadModalClose",
        "upload-modal",
        "queued-local",
        "document-row-status",
        "document-form input[type='file']",
        "document-file-name",
    ]
    removed_legacy_workspace_js = [
        "$(\"#close-chunk-modal-btn\").addEventListener",
        "actionbar.innerHTML",
        "kb-create-form-slot",
        "chunk-modal-slot",
        "retrieval-result-panel",
        "document-side-panel",
        "trigger.textContent",
        "nameInput.value = \"\"",
        "descriptionInput.value = \"\"",
    ]
    assert_contains(CONTROLLER_JS, *required_js)
    assert_not_contains(CONTROLLER_JS, *removed_legacy_workspace_js)

    assert_contains(
        CSS,
        ".upload-modal-panel",
        ".upload-modal-trigger",
        ".knowledge-tabbar",
        ".knowledge-tab-panel",
        ".knowledge-actionbar",
        ".knowledge-workspace .knowledge-command-center",
        "grid-template-columns: 1fr;",
        ".documents-tab-panel .document-side-panel",
        ".retrieval-result-panel",
        "grid-template-areas:",
        ".document-row.queued-local",
        ".document-row-status",
        ".upload-queue-summary",
        ".document-file-name",
    )


if __name__ == "__main__":
    main()

