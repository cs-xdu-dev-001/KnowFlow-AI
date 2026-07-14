from __future__ import annotations

import importlib
import os
import shutil
import sqlite3
import sys
import time
from pathlib import Path

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:
    TestClient = None


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def read_storage_path(db_path: Path, document_id: int) -> Path:
    with sqlite3.connect(db_path) as connection:
        row = connection.execute("SELECT storage_path FROM document WHERE id=?", (document_id,)).fetchone()
    assert row and row[0], f"missing stored source path for document {document_id}"
    return Path(row[0])


def read_document_row(db_path: Path, document_id: int) -> dict:
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute("SELECT * FROM document WHERE id=?", (document_id,)).fetchone()
    assert row, f"missing document row {document_id}"
    return dict(row)


def read_knowledge_base_row(db_path: Path, kb_id: int) -> dict:
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute("SELECT * FROM knowledge_base WHERE id=?", (kb_id,)).fetchone()
    assert row, f"missing knowledge base row {kb_id}"
    return dict(row)


class FailingDatabaseBegin:
    def __enter__(self):
        raise RuntimeError("simulated database delete failure")

    def __exit__(self, exc_type, exc, traceback):
        return False


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

    db_path = ROOT / "data" / "test-dbs" / "document-flow.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)
    upload_dir = ROOT / "data" / "test-uploads" / "document-flow"
    shutil.rmtree(upload_dir, ignore_errors=True)
    os.environ["KNOWFLOW_DB_URL"] = f"sqlite:///{db_path.as_posix()}"
    os.environ["KNOWFLOW_UPLOAD_DIR"] = str(upload_dir)
    os.environ["KNOWFLOW_SECRET_KEY"] = "document-flow-test-secret"
    os.environ["KNOWFLOW_VECTOR_BACKEND"] = "local"
    sys.path.insert(0, str(BACKEND))
    main_module = importlib.import_module("main")
    client = TestClient(main_module.app, raise_server_exceptions=False)

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
    for private_field in ("user_id", "storage_path", "file_md5"):
        assert private_field not in document, document

    reindexed = client.post(f"/api/documents/{upload_data['documentId']}/reindex")
    assert reindexed.status_code == 200, reindexed.text
    reindex_data = reindexed.json()["data"]
    assert reindex_data["parseStatus"] == "parsing", reindex_data

    document = wait_for_terminal_status(client, upload_data["documentId"])
    assert document["parse_status"] == "success", document
    first_storage_path = read_storage_path(db_path, upload_data["documentId"])
    assert first_storage_path.is_file(), first_storage_path

    app_module = importlib.import_module("knowflow.app")
    knowledge_router = importlib.import_module("knowflow.routers.knowledge")

    first_document_row = read_document_row(db_path, upload_data["documentId"])
    original_get_current_user = app_module.get_current_user
    original_get_document_for_user = knowledge_router.get_document_for_user
    original_begin = knowledge_router.db.engine.begin
    try:
        app_module.get_current_user = lambda request: {"id": first_document_row["user_id"]}
        knowledge_router.get_document_for_user = lambda document_id, user_id: dict(first_document_row)
        knowledge_router.db.engine.begin = lambda: FailingDatabaseBegin()
        failed_delete = client.delete(f"/api/documents/{upload_data['documentId']}")
        assert failed_delete.status_code == 500, failed_delete.text
        assert first_storage_path.exists(), "database delete failure must not remove the stored source file"
    finally:
        knowledge_router.db.engine.begin = original_begin
        knowledge_router.get_document_for_user = original_get_document_for_user
        app_module.get_current_user = original_get_current_user

    deleted = client.delete(f"/api/documents/{upload_data['documentId']}")
    assert deleted.status_code == 200, deleted.text
    assert not first_storage_path.exists(), "deleting a document should remove its stored source file"

    second_upload = client.post(
        f"/api/knowledge-bases/{kb_id}/documents",
        files={"file": ("second.md", b"# Cleanup\n\nknowledge base deletion cleanup", "text/markdown")},
    )
    assert second_upload.status_code == 200, second_upload.text
    second_document = wait_for_terminal_status(client, second_upload.json()["data"]["documentId"])
    assert second_document["parse_status"] == "success", second_document
    second_storage_path = read_storage_path(db_path, second_upload.json()["data"]["documentId"])
    assert second_storage_path.is_file(), second_storage_path

    second_document_row = read_document_row(db_path, second_upload.json()["data"]["documentId"])
    kb_row = read_knowledge_base_row(db_path, kb_id)
    original_get_current_user = app_module.get_current_user
    original_get_kb = knowledge_router.get_kb
    original_fetch_all = knowledge_router.fetch_all
    original_begin = knowledge_router.db.engine.begin
    try:
        app_module.get_current_user = lambda request: {"id": second_document_row["user_id"]}
        knowledge_router.get_kb = lambda requested_kb_id, user_id=None: dict(kb_row)
        knowledge_router.fetch_all = lambda sql, params=None: [dict(second_document_row)]
        knowledge_router.db.engine.begin = lambda: FailingDatabaseBegin()
        failed_kb_delete = client.delete(f"/api/knowledge-bases/{kb_id}")
        assert failed_kb_delete.status_code == 500, failed_kb_delete.text
        assert second_storage_path.exists(), "database knowledge-base delete failure must not remove stored source files"
    finally:
        knowledge_router.db.engine.begin = original_begin
        knowledge_router.fetch_all = original_fetch_all
        knowledge_router.get_kb = original_get_kb
        app_module.get_current_user = original_get_current_user

    deleted_kb = client.delete(f"/api/knowledge-bases/{kb_id}")
    assert deleted_kb.status_code == 200, deleted_kb.text
    assert not second_storage_path.exists(), "deleting a knowledge base should remove stored source files"

    shutil.rmtree(upload_dir, ignore_errors=True)
    print("document processing flow is asynchronous and observable")


if __name__ == "__main__":
    main()
