export function ToolConfigPanel({
  busy = false,
  config = null,
  values,
  onChange,
  onDelete,
  onSubmit,
  onTest,
}) {
  return (
    <form className={"panel stack-form"} id={"tool-config-form"} onSubmit={onSubmit}>
      <div className={"panel-title"}>
        <h2>{"工具配置"}</h2>
      </div>
      <div className={"form-grid"}>
        <label>
          {"工具"}
          <input value={"联网搜索"} disabled />
        </label>
        <label>
          {"提供商"}
          <input value={"Tavily"} disabled />
        </label>
        <label className={"wide"}>
          {"API密钥"}
          <input
            name={"apiKey"}
            value={values.apiKey}
            type={"password"}
            placeholder={config?.apiKeyMasked || "tvly-xxx"}
            autoComplete={"off"}
            onChange={onChange}
          />
        </label>
        <label className={"wide"}>
          <input
            name={"enabled"}
            type={"checkbox"}
            checked={values.enabled}
            onChange={onChange}
          />
          {"启用联网搜索"}
        </label>
      </div>
      <div className={"button-row"}>
        <button type={"submit"} disabled={busy}>
          {busy ? "处理中..." : "保存配置"}
        </button>
        <button
          className={"secondary-button"}
          type={"button"}
          disabled={busy || !config?.configured}
          onClick={onTest}
        >
          {"检查连接（1 credit）"}
        </button>
        <button
          className={"danger"}
          type={"button"}
          disabled={busy || !config}
          onClick={onDelete}
        >
          {"清除配置"}
        </button>
      </div>
    </form>
  );
}
