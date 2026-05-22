export function SettingsSidePanel() {
  return (
    <aside className={"settings-side"}>
      <section className={"panel"}>
        <div className={"panel-title"}>
          <h2>{"接口调试"}</h2>
          <p>{"FastAPI 自动文档，作用类似 Knife4j。"}</p>
        </div>
        <div className={"debug-links"}>
          <a href={"/docs"} target={"_blank"} rel={"noreferrer"}>
            {"Swagger UI"}
          </a>
          <a href={"/redoc"} target={"_blank"} rel={"noreferrer"}>
            {"ReDoc 文档"}
          </a>
          <a href={"/openapi.json"} target={"_blank"} rel={"noreferrer"}>
            {"OpenAPI JSON"}
          </a>
          <a href={"/api/health"} target={"_blank"} rel={"noreferrer"}>
            {"健康检查"}
          </a>
        </div>
      </section>
      <section className={"panel"}>
        <div className={"panel-title"}>
          <h2>{"当前取舍"}</h2>
          <p>{"第一版先把对话、RAG 和文档处理打磨扎实。"}</p>
        </div>
        <div className={"decision-list"}>
          <p>
            <strong>{"RAG 自动启用"}</strong>
            <span>{"选择知识库即检索；不选择就是普通对话。"}</span>
          </p>
          <p>
            <strong>{"Agent 暂缓"}</strong>
            <span>{"不在主界面暴露半成品入口，避免像 demo。"}</span>
          </p>
          <p>
            <strong>{"文档优先"}</strong>
            <span>{"上传、去重、切片、召回、引用展示形成闭环。"}</span>
          </p>
        </div>
      </section>
    </aside>
  );
}
