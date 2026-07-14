from __future__ import annotations

import importlib
import os
import shutil
import sys
import time
from pathlib import Path

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:
    TestClient = None


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def wait_document(client: TestClient, document_id: int) -> dict:
    latest = {}
    for _ in range(30):
        response = client.get(f"/api/documents/{document_id}")
        assert response.status_code == 200, response.text
        latest = response.json()["data"]
        if latest["parse_status"] in {"success", "failed"}:
            return latest
        time.sleep(0.05)
    return latest


def main() -> None:
    if TestClient is None:
        print("skipped: fastapi test client is not installed in this interpreter")
        return

    db_path = ROOT / "data" / "test-dbs" / "rag-quality.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)
    upload_dir = ROOT / "data" / "test-uploads" / "rag-quality"
    shutil.rmtree(upload_dir, ignore_errors=True)
    os.environ["KNOWFLOW_DB_URL"] = f"sqlite:///{db_path.as_posix()}"
    os.environ["KNOWFLOW_UPLOAD_DIR"] = str(upload_dir)
    os.environ["KNOWFLOW_SECRET_KEY"] = "rag-quality-test-secret"
    os.environ["KNOWFLOW_VECTOR_BACKEND"] = "local"
    os.environ["KNOWFLOW_RAG_SCORE_THRESHOLD"] = "0.25"
    sys.path.insert(0, str(BACKEND))
    main_module = importlib.import_module("main")
    client = TestClient(main_module.app)

    registered = client.post(
        "/api/auth/register",
        json={"username": "ragquality", "email": "ragquality@example.com", "password": "123456"},
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
    model_id = int(model.json()["data"]["id"])

    kb = client.post(
        "/api/knowledge-bases",
        json={"name": "RAG Quality KB", "description": "quality loop", "embeddingModelConfigId": model_id},
    )
    assert kb.status_code == 200, kb.text
    kb_id = int(kb.json()["data"]["id"])

    uploaded = client.post(
        f"/api/knowledge-bases/{kb_id}/documents",
        files={
            "file": (
                "rag-quality.md",
                (
                    "# RAG quality loop\n\n"
                    "RAG lowers hallucination by retrieving trusted knowledge chunks, "
                    "checking citation evidence, and answering from the retrieved context."
                ).encode("utf-8"),
                "text/markdown",
            )
        },
    )
    assert uploaded.status_code == 200, uploaded.text
    document = wait_document(client, int(uploaded.json()["data"]["documentId"]))
    assert document["parse_status"] == "success", document

    debug = client.post(
        "/api/retrieval/debug",
        json={"knowledgeBaseId": kb_id, "query": "How does RAG reduce hallucination?", "topK": 5},
    )
    assert debug.status_code == 200, debug.text
    debug_data = debug.json()["data"]
    assert debug_data["quality"]["enabled"] is True, debug_data
    assert debug_data["quality"]["hitCount"] >= 1, debug_data
    assert debug_data["quality"]["maxScore"] > 0, debug_data
    assert debug_data["quality"]["avgScore"] > 0, debug_data
    assert "belowThresholdCount" in debug_data["quality"], debug_data
    assert isinstance(debug_data["quality"]["scoreBuckets"], dict), debug_data
    assert debug_data["quality"]["qualityLevel"] in {"usable", "strong"}, debug_data
    assert isinstance(debug_data["retrievalRun"]["id"], int), debug_data
    assert debug_data["retrievalRun"]["durationMs"] >= 0, debug_data
    assert debug_data["chunks"][0]["rank"] == 1, debug_data
    assert "matchedTerms" in debug_data["chunks"][0], debug_data

    chat = client.post(
        "/api/chat",
        json={
            "knowledgeBaseId": kb_id,
            "question": "How does RAG reduce hallucination?",
            "chatModelConfigId": None,
        },
    )
    assert chat.status_code == 200, chat.text
    chat_data = chat.json()["data"]
    quality = chat_data["ragQuality"]
    assert quality["enabled"] is True, chat_data
    assert quality["retrievalRunId"], chat_data
    assert quality["qualityLevel"] in {"usable", "strong"}, chat_data
    assert quality["hitCount"] == len(chat_data["references"]), chat_data
    assert quality["avgScore"] > 0, chat_data
    assert "scoreBuckets" in quality, chat_data
    assert quality["reason"], chat_data

    run = client.get(f"/api/retrieval/runs/{quality['retrievalRunId']}")
    assert run.status_code == 200, run.text
    run_data = run.json()["data"]
    assert run_data["messageId"] == chat_data["messageId"], run_data
    assert run_data["status"] == "success", run_data

    weak = client.post(
        "/api/chat",
        json={
            "knowledgeBaseId": kb_id,
            "question": "zebra nebula unrelated phrase",
            "chatModelConfigId": None,
        },
    )
    assert weak.status_code == 200, weak.text
    weak_quality = weak.json()["data"]["ragQuality"]
    assert weak_quality["qualityLevel"] in {"weak", "no_match"}, weak_quality
    assert weak_quality["suggestions"], weak_quality

    shutil.rmtree(upload_dir, ignore_errors=True)
    print("rag quality loop records retrieval runs and exposes answer confidence")


if __name__ == "__main__":
    main()
