from __future__ import annotations

from typing import Any


class VectorStore:
    def __init__(self, *, backend, chroma_dir, gateway, fetch_one, fetch_all, hybrid_score) -> None:
        self.backend = backend
        self.chroma_dir = chroma_dir
        self.gateway = gateway
        self.fetch_one = fetch_one
        self.fetch_all = fetch_all
        self.hybrid_score = hybrid_score
        self.collection = None
        self.degraded_reason = ""
        if self.backend == "chroma":
            try:
                import chromadb

                self.chroma_dir.mkdir(parents=True, exist_ok=True)
                client = chromadb.PersistentClient(path=str(self.chroma_dir))
                self.collection = client.get_or_create_collection("knowflow_chunks")
            except Exception as exc:
                self.backend = "local"
                self.collection = None
                self.degraded_reason = str(exc)

    def upsert_chunks(self, chunks: list[dict[str, Any]], embedding_config: dict[str, Any] | None) -> None:
        if self.backend != "chroma" or self.collection is None:
            return
        ids = [chunk["vector_id"] for chunk in chunks]
        documents = [chunk["chunk_text"] for chunk in chunks]
        embeddings = [self.gateway.embed(chunk["chunk_text"], embedding_config) for chunk in chunks]
        metadatas = [
            {
                "knowledge_base_id": chunk["knowledge_base_id"],
                "document_id": chunk["document_id"],
                "chunk_id": chunk["id"],
                "filename": chunk.get("filename", ""),
            }
            for chunk in chunks
        ]
        self.collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)

    def delete_document(self, document_id: int) -> None:
        if self.backend != "chroma" or self.collection is None:
            return
        try:
            self.collection.delete(where={"document_id": document_id})
        except Exception:
            return

    def query(self, knowledge_base_id: int, query: str, top_k: int, embedding_config: dict[str, Any] | None) -> list[dict[str, Any]]:
        if self.backend == "chroma" and self.collection is not None:
            try:
                vector = self.gateway.embed(query, embedding_config)
                result = self.collection.query(
                    query_embeddings=[vector],
                    n_results=max(top_k * 4, top_k),
                    where={"knowledge_base_id": knowledge_base_id},
                    include=["documents", "metadatas", "distances"],
                )
                hits: list[dict[str, Any]] = []
                for idx, metadata in enumerate(result.get("metadatas", [[]])[0]):
                    chunk_id = int(metadata["chunk_id"])
                    row = self.fetch_one(
                        """
                        SELECT dc.id AS chunk_id, dc.document_id, dc.chunk_text, dc.vector_id, d.filename
                        FROM document_chunk dc
                        JOIN document d ON d.id = dc.document_id
                        WHERE dc.id=:chunk_id
                        """,
                        {"chunk_id": chunk_id},
                    )
                    if row:
                        distance = result.get("distances", [[0]])[0][idx]
                        vector_score = round(1 / (1 + float(distance)), 4)
                        row["score"] = self.hybrid_score(query, row["chunk_text"] or "", row["filename"], vector_score)
                        row["vectorScore"] = vector_score
                        hits.append(row)
                hits.sort(key=lambda item: item["score"], reverse=True)
                return hits[:top_k]
            except Exception:
                pass
        return self.local_query(knowledge_base_id, query, top_k)

    def local_query(self, knowledge_base_id: int, query: str, top_k: int) -> list[dict[str, Any]]:
        rows = self.fetch_all(
            """
            SELECT dc.id AS chunk_id, dc.document_id, dc.chunk_text, dc.vector_id, d.filename
            FROM document_chunk dc
            JOIN document d ON d.id = dc.document_id
            WHERE dc.knowledge_base_id=:knowledge_base_id
            """,
            {"knowledge_base_id": knowledge_base_id},
        )
        scored: list[dict[str, Any]] = []
        for row in rows:
            score = self.hybrid_score(query, row["chunk_text"] or "", row["filename"])
            if score > 0:
                row["score"] = score
                scored.append(row)
        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored[:top_k]

