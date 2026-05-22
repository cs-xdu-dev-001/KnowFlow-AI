import { useEffect, useState } from "react";

const valueOf = (value) => (value === undefined || value === null ? "" : String(value));

const modelLabel = (model) => `${model.name || "未命名模型"} / ${model.modelName || "unknown"}`;

function pickEmbeddingValue(models, currentValue) {
  const wanted = valueOf(currentValue);
  if (models.some((model) => valueOf(model.id) === wanted)) return wanted;
  return models.length ? valueOf(models[0].id) : "0";
}

export function KnowledgeModals() {
  const [chunks, setChunks] = useState([]);
  const [embeddingModels, setEmbeddingModels] = useState([]);
  const [selectedEmbeddingModelId, setSelectedEmbeddingModelId] = useState("0");
  const [chunksLoading, setChunksLoading] = useState(false);

  useEffect(() => {
    const handleChunksLoading = () => {
      setChunks([]);
      setChunksLoading(true);
    };
    const handleChunksUpdated = (event) => {
      setChunks(Array.isArray(event.detail?.chunks) ? event.detail.chunks : []);
      setChunksLoading(false);
    };
    window.addEventListener("knowflow:legacy-chunks-loading", handleChunksLoading);
    window.addEventListener("knowflow:legacy-chunks-updated", handleChunksUpdated);
    return () => {
      window.removeEventListener("knowflow:legacy-chunks-loading", handleChunksLoading);
      window.removeEventListener("knowflow:legacy-chunks-updated", handleChunksUpdated);
    };
  }, []);

  useEffect(() => {
    const handleModelOptionsUpdated = (event) => {
      const models = Array.isArray(event.detail?.models) ? event.detail.models : [];
      const nextEmbeddingModels = models.filter((model) => model.modelType === "embedding");
      const usableModels = nextEmbeddingModels.length ? nextEmbeddingModels : models;
      setEmbeddingModels(usableModels);
      setSelectedEmbeddingModelId((current) => pickEmbeddingValue(usableModels, event.detail?.selectedEmbeddingModelId ?? current));
    };
    window.addEventListener("knowflow:legacy-model-options-updated", handleModelOptionsUpdated);
    return () => window.removeEventListener("knowflow:legacy-model-options-updated", handleModelOptionsUpdated);
  }, []);

  const handleKnowledgeModalBackdrop = (event) => {
    if (event.target === event.currentTarget) {
      window.dispatchEvent(new CustomEvent("knowflow:react-close-kb-modal"));
    }
  };

  const handleCloseKnowledgeModal = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-close-kb-modal"));
  };

  const handleChunkModalBackdrop = (event) => {
    if (event.target === event.currentTarget) {
      window.dispatchEvent(new CustomEvent("knowflow:react-close-chunk-modal"));
    }
  };

  const handleCloseChunkModal = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-close-chunk-modal"));
  };

  const handleKnowledgeBaseSubmit = (event) => {
    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("knowflow:react-kb-submit", {
        detail: { form: event.currentTarget },
      }),
    );
  };

  return (
    <>
      <div className={"modal-backdrop hidden"} id={"kb-modal"} onClick={handleKnowledgeModalBackdrop}>
        <div className={"modal-panel kb-modal-panel"} role={"dialog"} aria-modal={"true"} aria-labelledby={"kb-modal-title"}>
          <div className={"modal-head"}>
            <div>
              <span className={"eyebrow"}>{"NEW SPACE"}</span>
              <h2 id={"kb-modal-title"}>{"新建知识库"}</h2>
            </div>
            <button type={"button"} className={"icon-button"} id={"close-kb-modal-btn"} aria-label={"关闭"} onClick={handleCloseKnowledgeModal}>
              {"×"}
            </button>
          </div>
          <form id={"kb-form"} className={"stack-form modal-form"} onSubmit={handleKnowledgeBaseSubmit}>
            <label>
              {"名称"}
              <input name={"name"} placeholder={"例如：论文阅读记录"} required />
            </label>
            <label>
              {"描述"}
              <textarea name={"description"} placeholder={"可选：说明这个知识库会放哪些资料"} />
            </label>
            <label>
              {"向量模型"}
              <select name={"embeddingModelConfigId"} id={"kb-embedding-select"} value={selectedEmbeddingModelId} onChange={(event) => setSelectedEmbeddingModelId(event.target.value || "0")}>
                {embeddingModels.length ? (
                  embeddingModels.map((model) => (
                    <option value={valueOf(model.id)} key={model.id}>
                      {modelLabel(model)}
                    </option>
                  ))
                ) : (
                  <option value={"0"}>{"本地 Hash 向量"}</option>
                )}
              </select>
            </label>
            <div className={"modal-actions"}>
              <button type={"button"} id={"cancel-kb-modal-btn"} onClick={handleCloseKnowledgeModal}>
                {"取消"}
              </button>
              <button type={"submit"} className={"primary"}>
                {"创建知识库"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className={"modal-backdrop hidden"} id={"chunk-modal"} onClick={handleChunkModalBackdrop}>
        <div className={"modal-panel chunk-modal-panel"} role={"dialog"} aria-modal={"true"} aria-labelledby={"chunk-modal-title"}>
          <div className={"modal-head"}>
            <div>
              <span className={"eyebrow"}>{"CHUNKS"}</span>
              <h2 id={"chunk-modal-title"}>{"文档切片"}</h2>
            </div>
            <button type={"button"} className={"icon-button"} id={"close-chunk-modal-btn"} aria-label={"关闭"} onClick={handleCloseChunkModal}>
              {"×"}
            </button>
          </div>
          <div className={"chunk-list"} id={"chunk-list"}>
            {chunksLoading ? <p className={"empty-state"}>{"正在加载切片..."}</p> : null}
            {!chunksLoading && !chunks.length ? <p className={"empty-state"}>{"暂无切片。"}</p> : null}
            {!chunksLoading
              ? chunks.map((chunk, index) => (
                  <div className={"chunk"} key={`${chunk.id || chunk.chunk_index || index}`}>
                    <strong>{`#${chunk.chunk_index ?? index + 1}`}</strong>
                    {` ${chunk.chunk_text || chunk.content || ""}`}
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>
    </>
  );
}
