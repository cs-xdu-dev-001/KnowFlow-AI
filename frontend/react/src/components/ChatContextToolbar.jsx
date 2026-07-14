import { useEffect, useState } from "react";

const valueOf = (value) => (value === undefined || value === null ? "" : String(value));
const modelLabel = (model) => (model.name || "未命名模型") + " / " + (model.modelName || "未知");

function pickModelValue(models, currentValue) {
  const wanted = valueOf(currentValue);
  if (models.some((model) => valueOf(model.id) === wanted)) return wanted;
  return models.length ? valueOf(models[0].id) : "";
}

function pickKnowledgeValue(knowledgeBases, currentValue) {
  const wanted = valueOf(currentValue);
  if (knowledgeBases.some((kb) => valueOf(kb.id) === wanted)) return wanted;
  return "";
}

export function ChatContextToolbar() {
  const [activeSessionId, setActiveSessionId] = useState("");
  const [chatModels, setChatModels] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");

  useEffect(() => {
    const handleActiveSessionUpdated = (event) => setActiveSessionId(event.detail?.sessionId || "");
    window.addEventListener("knowflow:react-active-session-updated", handleActiveSessionUpdated);
    return () => window.removeEventListener("knowflow:react-active-session-updated", handleActiveSessionUpdated);
  }, []);

  useEffect(() => {
    const handleModelOptionsUpdated = (event) => {
      const models = Array.isArray(event.detail?.models) ? event.detail.models.filter((model) => model.modelType === "chat") : [];
      setChatModels(models);
      setSelectedModelId((current) => pickModelValue(models, event.detail?.selectedModelId ?? current));
    };
    const handleModelSelectionUpdated = (event) => setSelectedModelId(valueOf(event.detail?.selectedModelId));
    window.addEventListener("knowflow:react-model-options-updated", handleModelOptionsUpdated);
    window.addEventListener("knowflow:react-model-selection-updated", handleModelSelectionUpdated);
    return () => {
      window.removeEventListener("knowflow:react-model-options-updated", handleModelOptionsUpdated);
      window.removeEventListener("knowflow:react-model-selection-updated", handleModelSelectionUpdated);
    };
  }, []);

  useEffect(() => {
    const handleKnowledgeOptionsUpdated = (event) => {
      const nextKnowledgeBases = Array.isArray(event.detail?.knowledgeBases) ? event.detail.knowledgeBases : [];
      setKnowledgeBases(nextKnowledgeBases);
      setSelectedKnowledgeBaseId((current) => pickKnowledgeValue(nextKnowledgeBases, event.detail?.selectedChatKnowledgeBaseId ?? current));
    };
    const handleKnowledgeSelectionUpdated = (event) => {
      if (!Object.prototype.hasOwnProperty.call(event.detail || {}, "selectedChatKnowledgeBaseId")) return;
      setSelectedKnowledgeBaseId(valueOf(event.detail?.selectedChatKnowledgeBaseId));
    };
    window.addEventListener("knowflow:react-knowledge-options-updated", handleKnowledgeOptionsUpdated);
    window.addEventListener("knowflow:react-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    return () => {
      window.removeEventListener("knowflow:react-knowledge-options-updated", handleKnowledgeOptionsUpdated);
      window.removeEventListener("knowflow:react-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    };
  }, []);

  const handleChatModelChange = (event) => {
    const value = event.target.value || "";
    setSelectedModelId(value);
    window.dispatchEvent(new CustomEvent("knowflow:react-chat-model-change", { detail: { value } }));
  };
  const handleChatKnowledgeBaseChange = (event) => {
    const value = event.target.value || "";
    setSelectedKnowledgeBaseId(value);
    window.dispatchEvent(new CustomEvent("knowflow:react-chat-kb-change", { detail: { value } }));
  };

  return (
    <div className={"context-toolbar"}>
      <label><span>{"聊天模型"}</span><select id={"chat-model-select"} value={selectedModelId} onChange={handleChatModelChange}>{chatModels.length ? chatModels.map((model) => <option value={valueOf(model.id)} key={model.id}>{modelLabel(model)}</option>) : <option value={""}>{"本地备用模型"}</option>}</select></label>
      <label><span>{"知识库"}</span><select id={"chat-kb-select"} value={selectedKnowledgeBaseId} onChange={handleChatKnowledgeBaseChange}><option value={""}>{"不使用知识库"}</option>{knowledgeBases.map((kb) => <option value={valueOf(kb.id)} key={kb.id}>{kb.name}</option>)}</select></label>
      <label><span>{"会话"}</span><input id={"active-session"} readOnly placeholder={"新会话"} value={activeSessionId} /></label>
    </div>
  );
}
