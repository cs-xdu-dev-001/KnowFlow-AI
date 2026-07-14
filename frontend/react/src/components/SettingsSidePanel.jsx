export function SettingsSidePanel() {
  return (
    <aside className={"settings-side"}>
      <section className={"panel"}>
        <div className={"settings-note"}>
          <span className={"eyebrow"}>{"模型"}</span>
          <h2>{"默认模型"}</h2>
          <p>{"聊天、向量和重排模型可以分别设为默认。"}</p>
        </div>
      </section>
    </aside>
  );
}
