from __future__ import annotations

import importlib
import os
import sys
import tempfile
import time
from pathlib import Path

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:
    TestClient = None


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def wait_for_terminal_status(client: TestClient, document_id: int) -> dict:
    last = {}
    for _ in range(20):
        response = client.get(f"/api/documents/{document_id}")
        assert response.status_code == 200, response.text
        last = response.json()["data"]
        if last["parse_status"] in {"success", "failed"}:
            return last
        time.sleep(0.05)
    return last


def main() -> None:
    if TestClient is None:
        print("skipped: fastapi test client is not installed in this interpreter")
        return

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        os.environ["KNOWFLOW_DB_URL"] = f"sqlite:///{Path(tmpdir, 'document-flow.db').as_posix()}"
        os.environ["KNOWFLOW_SECRET_KEY"] = "document-flow-test-secret"
        os.environ["KNOWFLOW_VECTOR_BACKEND"] = "local"
        sys.path.insert(0, str(BACKEND))
        main_module = importlib.import_module("main")
        client = TestClient(main_module.app)

        registered = client.post(
            "/api/auth/register",
            json={"username": "docflow", "email": "docflow@example.com", "password": "123456"},
        )
        assert registered.status_code == 200, registered.text

        model = client.post(
            "/api/model-configs",
            json={
                "name": "Local Embedding",
                "provider": "local",
                "modelType": "embedding",
                "baseUrl": "local://embedding",
                "apiKey": "",
                "modelName": "local-embedding",
            },
        )
        assert model.status_code == 200, model.text
        model_id = model.json()["data"]["id"]

        kb = client.post(
            "/api/knowledge-bases",
            json={"name": "Document Flow KB", "description": "test", "embeddingModelConfigId": model_id},
        )
        assert kb.status_code == 200, kb.text
        kb_id = kb.json()["data"]["id"]

        uploaded = client.post(
            f"/api/knowledge-bases/{kb_id}/documents",
            files={"file": ("notes.md", b"# RAG\n\nretrieval augmented generation test content", "text/markdown")},
        )
        assert uploaded.status_code == 200, uploaded.text
        upload_data = uploaded.json()["data"]
        assert upload_data["parseStatus"] == "parsing", upload_data
        assert upload_data["chunkCount"] == 0, upload_data

        document = wait_for_terminal_status(client, upload_data["documentId"])
        assert document["parse_status"] == "success", document
        assert document["chunk_count"] > 0, document
        assert "error_message" in document

        reindexed = client.post(f"/api/documents/{upload_data['documentId']}/reindex")
        assert reindexed.status_code == 200, reindexed.text
        reindex_data = reindexed.json()["data"]
        assert reindex_data["parseStatus"] == "parsing", reindex_data

        document = wait_for_terminal_status(client, upload_data["documentId"])
        assert document["parse_status"] == "success", document

        print("document processing flow is asynchronous and observable")


if __name__ == "__main__":
    main()
