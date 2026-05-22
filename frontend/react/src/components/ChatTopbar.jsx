export function ChatTopbar() {
  const handleDrawerToggle = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-drawer-toggle"));
  };
  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-refresh"));
  };

  return (
    <header className={"chat-topbar"}>
      <div>
        <span className={"eyebrow"}>{"AI WORKSPACE"}</span>
        <h1>{"智能问答"}</h1>
        <p>{"选择知识库后自动启用检索上下文；不选择知识库时就是普通模型对话。"}</p>
      </div>
      <div className={"topbar-actions"}>
        <button className={"secondary-button"} id={"inspector-toggle"} type={"button"} onClick={handleDrawerToggle}>
          {"证据面板"}
        </button>
        <button className={"secondary-button"} id={"refresh-btn"} type={"button"} onClick={handleRefresh}>
          {"刷新"}
        </button>
      </div>
    </header>
  );
}
