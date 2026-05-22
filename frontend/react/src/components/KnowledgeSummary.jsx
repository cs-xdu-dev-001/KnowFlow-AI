import { useEffect, useState } from "react";

export function KnowledgeSummary() {
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(null);
  const [embeddingModel, setEmbeddingModel] = useState(null);

  useEffect(() => {
    const handleKnowledgeDetailUpdated = (event) => {
      setSelectedKnowledgeBase(event.detail?.selectedKnowledgeBase || null);
      setEmbeddingModel(event.detail?.embeddingModel || null);
    };
    window.addEventListener("knowflow:legacy-knowledge-detail-updated", handleKnowledgeDetailUpdated);
    return () => window.removeEventListener("knowflow:legacy-knowledge-detail-updated", handleKnowledgeDetailUpdated);
  }, []);

  return (
    <section className={"knowledge-summary-bar"}>
      <div className={"command-copy"}>
        <h2>{"当前知识空间"}</h2>
        <p>{"选中知识库后，上传、文档处理、聊天上下文和检索范围会自动同步。"}</p>
      </div>
      <div className={"metrics-grid"} id={"kb-detail"}>
        {selectedKnowledgeBase ? (
          <>
            <div className={"metric"}>
              <span>{"当前知识库"}</span>
              <strong>{selectedKnowledgeBase.name}</strong>
            </div>
            <div className={"metric"}>
              <span>{"文档数"}</span>
              <strong>{selectedKnowledgeBase.document_count}</strong>
            </div>
            <div className={"metric"}>
              <span>{"切片数"}</span>
              <strong>{selectedKnowledgeBase.chunk_count}</strong>
            </div>
            <div className={"metric"}>
              <span>{"向量模型"}</span>
              <strong>{embeddingModel?.name || "未绑定"}</strong>
            </div>
          </>
        ) : (
          <p className={"empty-state"}>{"当前还没有知识库。"}</p>
        )}
      </div>
    </section>
  );
}
