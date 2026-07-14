import { useEffect, useState } from "react";
import { retrievalApi } from "../api/client.js";
import { notifyError, notifyToast } from "./errorFeedback.js";

const valueOf = (value) => (value === undefined || value === null ? "" : String(value));
function pickKnowledgeValue(knowledgeBases, currentValue) { const wanted = valueOf(currentValue); if (knowledgeBases.some((kb) => valueOf(kb.id) === wanted)) return wanted; return knowledgeBases.length ? valueOf(knowledgeBases[0].id) : ""; }

export function KnowledgeRetrievalDrawer({ active = false, panel = false, onClose = () => {} }) {
  const [retrievalResults, setRetrievalResults] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKnowledgeOptionsUpdated = (event) => { const nextKnowledgeBases = Array.isArray(event.detail?.knowledgeBases) ? event.detail.knowledgeBases : []; setKnowledgeBases(nextKnowledgeBases); setSelectedKnowledgeBaseId((current) => pickKnowledgeValue(nextKnowledgeBases, event.detail?.selectedRetrievalKnowledgeBaseId ?? current)); };
    const handleKnowledgeSelectionUpdated = (event) => { if (!Object.prototype.hasOwnProperty.call(event.detail || {}, "selectedRetrievalKnowledgeBaseId")) return; setSelectedKnowledgeBaseId(valueOf(event.detail?.selectedRetrievalKnowledgeBaseId)); };
    window.addEventListener("knowflow:react-knowledge-options-updated", handleKnowledgeOptionsUpdated);
    window.addEventListener("knowflow:react-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    return () => { window.removeEventListener("knowflow:react-knowledge-options-updated", handleKnowledgeOptionsUpdated); window.removeEventListener("knowflow:react-knowledge-selection-updated", handleKnowledgeSelectionUpdated); };
  }, []);

  const handleCloseRetrievalDrawer = () => onClose();
  const handleRetrievalSubmit = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); if (data.knowledgeBaseId) data.knowledgeBaseId = Number(data.knowledgeBaseId); if (data.topK) data.topK = Number(data.topK); setLoading(true); setRetrievalResults([]); try { const result = await retrievalApi.debug(data); setRetrievalResults(Array.isArray(result?.chunks) ? result.chunks : []); notifyToast("检索完成"); } catch (error) { notifyError(error, "检索失败"); } finally { setLoading(false); } };
  const handleKnowledgeBaseChange = (event) => { const value = event.target.value || ""; setSelectedKnowledgeBaseId(value); window.dispatchEvent(new CustomEvent("knowflow:react-retrieval-kb-change", { detail: { value } })); };
  const className = panel ? "retrieval-panel" : active ? "retrieval-drawer open" : "retrieval-drawer";

  return <aside className={className} id={panel ? "retrieval-panel" : "retrieval-drawer"}><div className={panel ? "panel-title compact-title" : "drawer-header"}><div><span className={"eyebrow"}>{"检索"}</span><h2>{"检索"}</h2></div>{!panel ? <button className={"icon-button"} type={"button"} aria-label={"关闭检索面板"} onClick={handleCloseRetrievalDrawer}><svg viewBox={"0 0 24 24"} aria-hidden={"true"} focusable={"false"}><path d={"M6 6l12 12M18 6 6 18"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} /></svg></button> : null}</div><form className={"stack-form retrieval-form"} id={"retrieval-form"} onSubmit={handleRetrievalSubmit}><label>{"知识库"}<select id={"retrieval-kb-select"} name={"knowledgeBaseId"} value={selectedKnowledgeBaseId} onChange={handleKnowledgeBaseChange}>{knowledgeBases.length ? knowledgeBases.map((kb) => <option value={valueOf(kb.id)} key={kb.id}>{kb.name}</option>) : <option value={""}>{"暂无知识库"}</option>}</select></label><label>{"查询"}<textarea name={"query"} rows={3} placeholder={"搜索知识库"} required /></label><label>{"分段数"}<input name={"topK"} type={"number"} min={1} max={20} defaultValue={5} /></label><button type={"submit"} disabled={loading}>{loading ? "检索中..." : "检索"}</button></form><div className={"drawer-section retrieval-results"}><div className={"section-label"}>{"结果"}</div><div className={"reference-list"} id={"retrieval-list"}>{loading ? <p className={"empty-state"}>{"检索中..."}</p> : null}{!loading && !retrievalResults.length ? <p className={"empty-state"}>{"暂无结果"}</p> : null}{!loading ? retrievalResults.map((chunk, index) => <article className={"item"} key={chunk.chunkId || chunk.chunk_id || chunk.id || index}><h3>{chunk.filename || "分段 #" + (chunk.chunkId || chunk.chunk_id || index + 1)}<span className={"badge ok"}>{Number(chunk.score || 0).toFixed(3)}</span></h3><p>{chunk.content || chunk.chunk_text || ""}</p></article>) : null}</div></div></aside>;
}
