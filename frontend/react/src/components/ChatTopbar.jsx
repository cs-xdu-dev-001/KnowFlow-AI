export function ChatTopbar() {
  const handleRefresh = () => window.dispatchEvent(new CustomEvent("knowflow:react-refresh"));
  const handleDrawerToggle = () => window.dispatchEvent(new CustomEvent("knowflow:react-drawer-toggle"));
  return (
    <header className={"chat-topbar"}>
      <div>
        <h1>{"问答"}</h1>
      </div>
      <div className={"chat-topbar-actions"}>
        <button id={"inspector-toggle"} type={"button"} onClick={handleDrawerToggle}>{"运行"}</button>
        <button id={"refresh-btn"} type={"button"} onClick={handleRefresh}>{"刷新"}</button>
      </div>
    </header>
  );
}
