import { useEffect, useState } from "react";

const emptyHeader = () => ({ name: "", value: "" });

export function McpServerDialog({
  open = false,
  busy = false,
  server = null,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(server);
  const [values, setValues] = useState({
    name: "",
    url: "",
    authType: "oauth",
    clientId: "",
    clientSecret: "",
  });
  const [headerRows, setHeaderRows] = useState([emptyHeader()]);
  const preservesExistingCredentials =
    isEditing &&
    server?.configured &&
    server.authType === values.authType;

  useEffect(() => {
    if (!open) return;
    setValues({
      name: server?.name || "",
      url: server?.url || "",
      authType: server?.authType || "oauth",
      clientId: "",
      clientSecret: "",
    });
    setHeaderRows([emptyHeader()]);
  }, [open, server]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const updateHeader = (index, field, value) => {
    setHeaderRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const removeHeader = (index) => {
    setHeaderRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [emptyHeader()];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { name: values.name.trim() };
    if (!isEditing || values.url.trim() !== server.url) {
      payload.url = values.url.trim();
    }
    if (!isEditing || values.authType !== server.authType) {
      payload.authType = values.authType;
    }
    if (values.authType === "oauth") {
      if (values.clientId.trim()) payload.clientId = values.clientId.trim();
      if (values.clientSecret) payload.clientSecret = values.clientSecret;
    }
    if (values.authType === "headers") {
      const headers = Object.fromEntries(
        headerRows
          .map((row) => [row.name.trim(), row.value])
          .filter(([name]) => name),
      );
      if (!isEditing || Object.keys(headers).length) {
        payload.headers = headers;
      }
    }
    await onSubmit(payload);
  };

  return (
    <div
      className={"modal-backdrop mcp-dialog-backdrop"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={"modal-panel mcp-dialog"}
        role={"dialog"}
        aria-modal={"true"}
        aria-labelledby={"mcp-dialog-title"}
      >
        <header className={"modal-head"}>
          <h2 id={"mcp-dialog-title"}>
            {isEditing ? "编辑MCP服务器" : "添加MCP服务器"}
          </h2>
          <button
            className={"icon-button"}
            type={"button"}
            aria-label={isEditing ? "关闭编辑服务器窗口" : "关闭添加服务器窗口"}
            disabled={busy}
            onClick={onClose}
          >
            {"×"}
          </button>
        </header>
        <form className={"stack-form modal-form"} onSubmit={handleSubmit}>
          <div className={"mcp-dialog-fields"}>
            <label>
              {"名称"}
              <input
                name={"name"}
                value={values.name}
                required
                maxLength={100}
                autoFocus
                placeholder={"团队知识库"}
                onChange={handleChange}
              />
            </label>
            <label>
              {"服务器URL"}
              <input
                name={"url"}
                value={values.url}
                required
                type={"url"}
                placeholder={"https://mcp.example.com/mcp"}
                onChange={handleChange}
              />
            </label>
            <label>
              {"鉴权方式"}
              <select
                name={"authType"}
                value={values.authType}
                onChange={handleChange}
              >
                <option value={"oauth"}>{"OAuth"}</option>
                <option value={"headers"}>{"静态Header"}</option>
                <option value={"none"}>{"无鉴权"}</option>
              </select>
            </label>
          </div>

          {values.authType === "oauth" ? (
            <div className={"mcp-auth-fields"}>
              {preservesExistingCredentials ? (
                <div className={"mcp-configured-note"}>
                  {"已配置，留空则保留"}
                </div>
              ) : null}
              <label>
                {"Client ID（可选）"}
                <input
                  name={"clientId"}
                  value={values.clientId}
                  autoComplete={"off"}
                  placeholder={"留空则尝试自动注册"}
                  onChange={handleChange}
                />
              </label>
              <label>
                {"Client Secret（可选）"}
                <input
                  name={"clientSecret"}
                  value={values.clientSecret}
                  type={"password"}
                  autoComplete={"new-password"}
                  placeholder={
                    preservesExistingCredentials
                      ? "已配置，留空则保留"
                      : "留空则不设置"
                  }
                  onChange={handleChange}
                />
              </label>
            </div>
          ) : null}

          {values.authType === "headers" ? (
            <div className={"mcp-header-editor"}>
              <div className={"mcp-section-heading"}>
                <strong>{"请求Header"}</strong>
                <button
                  className={"secondary-button"}
                  type={"button"}
                  onClick={() =>
                    setHeaderRows((current) => [...current, emptyHeader()])
                  }
                >
                  {"添加一行"}
                </button>
              </div>
              {preservesExistingCredentials ? (
                <div className={"mcp-configured-note"}>
                  {"已配置，留空则保留；填写后替换现有Header"}
                </div>
              ) : null}
              {headerRows.map((row, index) => (
                <div className={"mcp-header-row"} key={`header-${index}`}>
                  <input
                    value={row.name}
                    required={!preservesExistingCredentials}
                    aria-label={`Header ${index + 1}名称`}
                    placeholder={"Authorization"}
                    onChange={(event) =>
                      updateHeader(index, "name", event.target.value)
                    }
                  />
                  <input
                    value={row.value}
                    type={"password"}
                    required={!preservesExistingCredentials}
                    aria-label={`Header ${index + 1}值`}
                    placeholder={"Bearer ..."}
                    autoComplete={"new-password"}
                    onChange={(event) =>
                      updateHeader(index, "value", event.target.value)
                    }
                  />
                  <button
                    className={"icon-button"}
                    type={"button"}
                    aria-label={`删除Header ${index + 1}`}
                    onClick={() => removeHeader(index)}
                  >
                    {"×"}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className={"modal-actions"}>
            <button type={"button"} disabled={busy} onClick={onClose}>
              {"取消"}
            </button>
            <button className={"primary"} type={"submit"} disabled={busy}>
              {busy
                ? "正在保存..."
                : isEditing
                  ? "保存修改"
                  : "保存并连接"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
