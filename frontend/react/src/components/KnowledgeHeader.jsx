export function KnowledgeHeader({ onOpenRetrievalDrawer = () => {}, onOpenKnowledgeBaseModal = () => {} }) {
  const handleOpenRetrievalDrawer = () => {
    onOpenRetrievalDrawer();
  };
  const handleOpenKnowledgeBaseModal = () => {
    onOpenKnowledgeBaseModal();
  };

  return (
    <header className={"knowledge-hero"}>
      <div>
        <span className={"eyebrow"}>{"知识库"}</span>
        <h1>{"知识库"}</h1>
      </div>
      <div className={"hero-actions"}>
        <button id={"open-retrieval-drawer-btn"} type={"button"} onClick={handleOpenRetrievalDrawer}>
          {"检索"}
        </button>
        <button id={"open-kb-modal-btn"} type={"button"} onClick={handleOpenKnowledgeBaseModal}>
          {"新建知识库"}
        </button>
      </div>
    </header>
  );
}
