import { useEffect, useState } from "react";
import { KnowledgeDocuments } from "./KnowledgeDocuments.jsx";
import { KnowledgeHeader } from "./KnowledgeHeader.jsx";
import { KnowledgeModals } from "./KnowledgeModals.jsx";
import { KnowledgeRail } from "./KnowledgeRail.jsx";
import { KnowledgeRetrievalDrawer } from "./KnowledgeRetrievalDrawer.jsx";
import { KnowledgeSummary } from "./KnowledgeSummary.jsx";

const knowledgeTabs = [
  { key: "documents", label: "文档队列" },
  { key: "retrieval", label: "检索调试" },
  { key: "settings", label: "空间设置" },
];

function KnowledgeActionBar({ onTabChange }) {
  const handleUpload = () => {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-upload-modal-open"));
  };

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-open-kb-modal"));
  };

  const handleRetrieval = () => {
    onTabChange("retrieval");
    window.dispatchEvent(new CustomEvent("knowflow:react-open-retrieval-drawer"));
  };

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-refresh"));
  };

  return (
    <div className={"knowledge-actionbar"} id={"knowledge-actionbar"}>
      <button className={"primary"} type={"button"} data-knowledge-action={"upload"} onClick={handleUpload}>
        {"上传文档"}
      </button>
      <button type={"button"} data-knowledge-action={"create"} onClick={handleCreate}>
        {"新建知识库"}
      </button>
      <button type={"button"} data-knowledge-action={"retrieval"} onClick={handleRetrieval}>
        {"检索调试"}
      </button>
      <button type={"button"} data-knowledge-action={"refresh"} onClick={handleRefresh}>
        {"刷新"}
      </button>
    </div>
  );
}

function KnowledgeTabBar({ activeTab, onTabChange }) {
  return (
    <div className={"knowledge-tabbar"} id={"knowledge-tabbar"}>
      {knowledgeTabs.map((tab) => (
        <button
          className={activeTab === tab.key ? "knowledge-tab active" : "knowledge-tab"}
          key={tab.key}
          type={"button"}
          data-kb-tab={tab.key}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function KnowledgeSettingsPanel({ active, onTabChange }) {
  return (
    <section
      className={active ? "knowledge-tab-panel knowledge-settings-panel active" : "knowledge-tab-panel knowledge-settings-panel"}
      id={"knowledge-settings-panel"}
      data-kb-tab-panel={"settings"}
    >
      <div className={"settings-panel-card"}>
        <span className={"eyebrow"}>{"SPACE SETTINGS"}</span>
        <h2>{"知识库设置"}</h2>
        <p>{"第一版先保留轻量操作：选择知识库、查看向量模型、删除空间。更复杂的重命名和重建索引可以后续放到这里。"}</p>
        <div className={"knowledge-settings-actions"}>
          <button type={"button"} onClick={() => window.dispatchEvent(new CustomEvent("knowflow:react-open-kb-modal"))}>
            {"新建知识库"}
          </button>
          <button type={"button"} onClick={() => onTabChange("retrieval")}>
            {"检索调试"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function KnowledgePage() {
  const [activeTab, setActiveTab] = useState("documents");

  useEffect(() => {
    const handleKnowledgeTabChange = (event) => {
      setActiveTab(event.detail?.tab || "documents");
    };
    window.addEventListener("knowflow:legacy-knowledge-tab-change", handleKnowledgeTabChange);
    return () => window.removeEventListener("knowflow:legacy-knowledge-tab-change", handleKnowledgeTabChange);
  }, []);

  return (
    <section className={"page"} id={"page-knowledge"}>
      <div className={"workspace-page knowledge-workspace"}>
        <KnowledgeHeader />
        <KnowledgeSummary />
        <KnowledgeActionBar onTabChange={setActiveTab} />
        <div className={"knowledge-shell"}>
          <KnowledgeRail />
          <div className={"knowledge-primary"}>
            <KnowledgeTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            <div
              className={activeTab === "documents" ? "knowledge-tab-panel documents-tab-panel active" : "knowledge-tab-panel documents-tab-panel"}
              data-kb-tab-panel={"documents"}
            >
              <KnowledgeDocuments />
            </div>
            <div
              className={activeTab === "retrieval" ? "knowledge-tab-panel retrieval-tab-panel active" : "knowledge-tab-panel retrieval-tab-panel"}
              data-kb-tab-panel={"retrieval"}
            >
              <KnowledgeRetrievalDrawer active={activeTab === "retrieval"} panel={true} />
            </div>
            <KnowledgeSettingsPanel active={activeTab === "settings"} onTabChange={setActiveTab} />
          </div>
        </div>
        <KnowledgeModals />
      </div>
    </section>
  );
}
