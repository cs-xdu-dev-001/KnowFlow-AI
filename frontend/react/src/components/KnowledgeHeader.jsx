export function KnowledgeHeader() {
  const handleOpenRetrievalDrawer = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-open-retrieval-drawer"));
  };

  const handleOpenKnowledgeBaseModal = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-open-kb-modal"));
  };

  return (
    <header className={"page-header"}>
      <div>
        <span className={"eyebrow"}>{"KNOWLEDGE"}</span>
        <h1>{"知识库工作区"}</h1>
        <p>{"把资料入库、处理和检索调试收束到一个工作台，主页面只保留高频操作。"}</p>
      </div>
      <div className={"page-actions"}>
        <button type={"button"} id={"open-retrieval-drawer-btn"} onClick={handleOpenRetrievalDrawer}>
          {"检索调试"}
        </button>
        <button type={"button"} className={"primary"} id={"open-kb-modal-btn"} onClick={handleOpenKnowledgeBaseModal}>
          {"新建知识库"}
        </button>
      </div>
    </header>
  );
}
