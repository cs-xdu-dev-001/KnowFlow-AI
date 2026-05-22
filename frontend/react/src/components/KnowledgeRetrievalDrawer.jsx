import { useEffect, useState } from "react";

const valueOf = (value) => (value === undefined || value === null ? "" : String(value));

function pickKnowledgeValue(knowledgeBases, currentValue) {
  const wanted = valueOf(currentValue);
  if (knowledgeBases.some((kb) => valueOf(kb.id) === wanted)) return wanted;
  return "";
}

export function KnowledgeRetrievalDrawer({ active = false, panel = false }) {
  const [retrievalResults, setRetrievalResults] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleRetrievalLoading = () => {
      setLoading(true);
      setRetrievalResults([]);
    };
    const handleRetrievalResultsUpdated = (event) => {
      setRetrievalResults(Array.isArray(event.detail?.chunks) ? event.detail.chunks : []);
      setLoading(false);
    };
    window.addEventListener("knowflow:legacy-retrieval-loading", handleRetrievalLoading);
    window.addEventListener("knowflow:legacy-retrieval-results-updated", handleRetrievalResultsUpdated);
    return () => {
      window.removeEventListener("knowflow:legacy-retrieval-loading", handleRetrievalLoading);
      window.removeEventListener("knowflow:legacy-retrieval-results-updated", handleRetrievalResultsUpdated);
    };
  }, []);

  useEffect(() => {
    const handleKnowledgeOptionsUpdated = (event) => {
      const nextKnowledgeBases = Array.isArray(event.detail?.knowledgeBases) ? event.detail.knowledgeBases : [];
      setKnowledgeBases(nextKnowledgeBases);
      setSelectedKnowledgeBaseId((current) =>
        pickKnowledgeValue(nextKnowledgeBases, event.detail?.selectedRetrievalKnowledgeBaseId ?? current),
      );
    };
    const handleKnowledgeSelectionUpdated = (event) => {
      if (!Object.prototype.hasOwnProperty.call(event.detail || {}, "selectedRetrievalKnowledgeBaseId")) return;
      setSelectedKnowledgeBaseId(valueOf(event.detail?.selectedRetrievalKnowledgeBaseId));
    };
    window.addEventListener("knowflow:legacy-knowledge-options-updated", handleKnowledgeOptionsUpdated);
    window.addEventListener("knowflow:legacy-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    return () => {
      window.removeEventListener("knowflow:legacy-knowledge-options-updated", handleKnowledgeOptionsUpdated);
      window.removeEventListener("knowflow:legacy-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    };
  }, []);

  const handleCloseRetrievalDrawer = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-close-retrieval-drawer"));
  };

  const handleRetrievalSubmit = (event) => {
    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("knowflow:react-retrieval-submit", {
        detail: { form: event.currentTarget },
      }),
    );
  };

  const handleKnowledgeBaseChange = (event) => {
    const value = event.target.value || "";
    setSelectedKnowledgeBaseId(value);
    window.dispatchEvent(new CustomEvent("knowflow:react-retrieval-kb-change", { detail: { value } }));
  };

  return (
    <aside className={[active ? "retrieval-drawer" : "retrieval-drawer hidden", panel ? "retrieval-panel" : ""].filter(Boolean).join(" ")} id={"retrieval-drawer"} aria-label={"检索调试"}>
      <div className={"drawer-header"}>
        <div>
          <span className={"eyebrow"}>{"RETRIEVAL"}</span>
          <h2>{"检索调试"}</h2>
        </div>
        <button
          type={"button"}
          className={"icon-button"}
          id={"close-retrieval-drawer-btn"}
          aria-label={"关闭"}
          onClick={handleCloseRetrievalDrawer}
        >
          {"×"}
        </button>
      </div>
      <form className={"stack-form retrieval-form"} id={"retrieval-form"} onSubmit={handleRetrievalSubmit}>
        <label>
          {"知识库"}
          <select id={"retrieval-kb-select"} name={"knowledgeBaseId"} value={selectedKnowledgeBaseId} onChange={handleKnowledgeBaseChange}>
            {knowledgeBases.length ? (
              knowledgeBases.map((kb) => (
                <option value={valueOf(kb.id)} key={kb.id}>
                  {kb.name}
                </option>
              ))
            ) : (
              <option value={""}>{"暂无知识库"}</option>
            )}
          </select>
        </label>
        <label>
          {"问题"}
          <input name={"query"} placeholder={"输入要检索的问题"} required />
        </label>
        <label>
          {"Top K"}
          <input name={"topK"} type={"number"} min={"1"} max={"12"} defaultValue={"5"} />
        </label>
        <button type={"submit"}>{"开始检索"}</button>
      </form>
      <div className={"drawer-section retrieval-results"}>
        <div className={"section-label"}>{"检索片段"}</div>
        <div className={"list"} id={"retrieval-list"}>
          {loading ? <p className={"empty-state"}>{"正在检索片段..."}</p> : null}
          {!loading && !retrievalResults.length ? <p className={"empty-state"}>{"运行一次检索后显示片段。"}</p> : null}
          {!loading
            ? retrievalResults.map((chunk, index) => (
                <article className={"item"} key={`${chunk.chunkId || chunk.chunk_id || chunk.id || index}`}>
                  <h3>
                    {chunk.filename || `片段 #${chunk.chunkId || chunk.chunk_id || index + 1}`}
                    {" · 相似度 "}
                    {Number(chunk.score || 0).toFixed(3)}
                  </h3>
                  <p>{chunk.content || chunk.chunk_text || ""}</p>
                </article>
              ))
            : null}
        </div>
      </div>
    </aside>
  );
}
