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


def register(client: TestClient, username: str) -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "123456"},
    )
    assert response.status_code == 200, response.text


def create_embedding_model(client: TestClient, name: str) -> int:
    response = client.post(
        "/api/model-configs",
        json={
            "name": name,
            "provider": "local",
            "modelType": "embedding",
            "baseUrl": "local://embedding",
            "apiKey": "",
            "modelName": "local-embedding",
        },
    )
    assert response.status_code == 200, response.text
    return int(response.json()["data"]["id"])


def wait_document(client: TestClient, document_id: int) -> dict:
    latest = {}
    for _ in range(30):
        response = client.get(f"/api/documents/{document_id}")
        assert response.status_code == 200, response.text
        latest = response.json()["data"]
        task = latest.get("latestTask") or {}
        if latest["parse_status"] in {"success", "failed"} and task.get("status") in {"success", "failed"}:
            return latest
        time.sleep(0.05)
    return latest


def main() -> None:
    if TestClient is None:
        print("skipped: fastapi test client is not installed in this interpreter")
        return

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        os.environ["KNOWFLOW_DB_URL"] = f"sqlite:///{Path(tmpdir, 'isolation.db').as_posix()}"
        os.environ["KNOWFLOW_SECRET_KEY"] = "user-isolation-test-secret"
        os.environ["KNOWFLOW_VECTOR_BACKEND"] = "local"
        sys.path.insert(0, str(BACKEND))
        main_module = importlib.import_module("main")

        alice = TestClient(main_module.app)
        bob = TestClient(main_module.app)
        register(alice, "alice")
        register(bob, "bob")

        model_id = create_embedding_model(alice, "Alice Embedding")
        kb = alice.post(
            "/api/knowledge-bases",
            json={"name": "Alice KB", "description": "private", "embeddingModelConfigId": model_id},
        )
        assert kb.status_code == 200, kb.text
        kb_id = int(kb.json()["data"]["id"])

        uploaded = alice.post(
            f"/api/knowledge-bases/{kb_id}/documents",
            files={"file": ("alice.md", b"# Alice private RAG note\nretrieval content", "text/markdown")},
        )
        assert uploaded.status_code == 200, uploaded.text
        upload_data = uploaded.json()["data"]
        assert upload_data["parseStatus"] == "parsing", upload_data
        assert isinstance(upload_data["taskId"], int), upload_data

        document = wait_document(alice, int(upload_data["documentId"]))
        assert document["parse_status"] == "success", document
        latest_task = document.get("latestTask") or {}
        assert latest_task["status"] == "success", latest_task
        assert latest_task["stage"] == "done", latest_task
        assert latest_task["progress"] == 100, latest_task

        assert bob.get("/api/model-configs").json()["data"] == []
        assert bob.get("/api/knowledge-bases").json()["data"] == []
        assert bob.get(f"/api/knowledge-bases/{kb_id}").status_code == 404
        assert bob.get(f"/api/documents/{upload_data['documentId']}").status_code == 404
        assert bob.get(f"/api/documents/{upload_data['documentId']}/tasks").status_code == 404

        chat = alice.post(
            "/api/chat",
            json={"knowledgeBaseId": kb_id, "question": "Summarize Alice note", "chatModelConfigId": None},
        )
        assert chat.status_code == 200, chat.text
        session_id = chat.json()["data"]["sessionId"]
        assert alice.get("/api/sessions").json()["data"][0]["id"] == session_id
        assert bob.get("/api/sessions").json()["data"] == []
        assert bob.get(f"/api/sessions/{session_id}/messages").status_code == 404

        print("user-owned data is isolated and document tasks are observable")


if __name__ == "__main__":
    main()
