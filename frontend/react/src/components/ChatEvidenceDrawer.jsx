import { useEffect, useState } from "react";

const toolLabels = {
  knowledge_search: "知识库检索",
  session_memory_search: "会话记忆",
  web_search: "联网搜索",
  calculator: "计算器",
};

export function ChatEvidenceDrawer() {
  const [references, setReferences] = useState([]);
  const [toolCalls, setToolCalls] = useState([]);
  const [ragQuality, setRagQuality] = useState(null);
  const [retrievalRun, setRetrievalRun] = useState(null);

  useEffect(() => {
    const handleReferencesUpdated = (event) => {
      setReferences(Array.isArray(event.detail?.references) ? event.detail.references : []);
    };
    const handleToolTimelineUpdated = (event) => {
      setToolCalls(Array.isArray(event.detail?.toolCalls) ? event.detail.toolCalls : []);
    };
    const handleRagQualityUpdated = (event) => {
      setRagQuality(event.detail?.ragQuality || null);
      setRetrievalRun(event.detail?.retrievalRun || null);
    };
    window.addEventListener("knowflow:legacy-references-updated", handleReferencesUpdated);
    window.addEventListener("knowflow:legacy-tool-timeline-updated", handleToolTimelineUpdated);
    window.addEventListener("knowflow:legacy-rag-quality-updated", handleRagQualityUpdated);
    return () => {
      window.removeEventListener("knowflow:legacy-references-updated", handleReferencesUpdated);
      window.removeEventListener("knowflow:legacy-tool-timeline-updated", handleToolTimelineUpdated);
      window.removeEventListener("knowflow:legacy-rag-quality-updated", handleRagQualityUpdated);
    };
  }, []);

  const handleDrawerClose = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-drawer-close"));
  };

  return (
    <aside className={"evidence-drawer"} id={"evidence-drawer"}>
      <div className={"drawer-header"}>
        <div>
          <span className={"eyebrow"}>{"EVIDENCE"}</span>
          <h2>{"证据与工具"}</h2>
        </div>
        <button className={"icon-button"} id={"inspector-close"} type={"button"} title={"收起证据面板"} onClick={handleDrawerClose}>
          {"x"}
        </button>
      </div>
      <div className={"drawer-section"}>
        <div className={"section-label"}>{"本次回答参考"}</div>
        {ragQuality?.enabled ? (
          <div className={"rag-quality-card"} id={"rag-quality-card"}>
            <span className={`quality-level ${ragQuality.qualityLevel || "no_match"}`}>{ragQuality.qualityLevel || "no_match"}</span>
            <strong>{"RAG quality"}</strong>
            <p>{ragQuality.reason || "已记录本次检索质量。"}</p>
            <small>{`命中 ${ragQuality.hitCount || 0} 个片段，最高分 ${ragQuality.maxScore || 0}${retrievalRun?.id ? `，运行 #${retrievalRun.id}` : ""}`}</small>
          </div>
        ) : null}
        <div className={"reference-list"} id={"reference-list"}>
          {references.length ? (
            references.map((reference, index) => {
              const score = Math.round(Number(reference.score || 0) * 100);
              return (
                <article className={"item"} key={reference.chunkId || reference.chunk_id || index}>
                  <h3>{reference.filename || `片段 #${reference.chunkId || reference.chunk_id}`}</h3>
                  <p>
                    <span className={"badge ok"}>{`匹配 ${score}%`}</span>
                  </p>
                  <p>{reference.content || reference.chunk_text || ""}</p>
                </article>
              );
            })
          ) : (
            <p className={"empty-state"}>{"本次回答没有引用片段。"}</p>
          )}
        </div>
      </div>
      <div className={"drawer-section"}>
        <div className={"section-label"}>{"工具调用"}</div>
        <div className={"timeline"} id={"tool-timeline-mini"}>
          {toolCalls.length ? (
            toolCalls.map((call, index) => {
              const name = call.toolName || call.tool_name || call.name || "knowledge_search";
              const input = call.inputJson || call.input_json || "";
              const output = call.outputText || call.output_text || call.content || "";
              const latency = call.latencyMs ?? call.latency_ms ?? 0;
              return (
                <div className={"timeline-item"} key={`${name}-${index}`}>
                  <div className={"timeline-dot"}></div>
                  <div>
                    <h4>{toolLabels[name] || name}</h4>
                    <p>{latency ? `${latency} ms` : "已记录"}</p>
                    {input ? <pre>{typeof input === "string" ? input : JSON.stringify(input, null, 2)}</pre> : null}
                    {output ? <p>{output}</p> : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className={"empty-state"}>{"暂无检索过程。"}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
