import { useEffect, useState } from "react";
import { mcpApi } from "../api/client.js";
import { notifyError } from "./errorFeedback.js";

function toolRisk(tool) {
  const annotations = tool?.annotations || {};
  if (annotations.destructiveHint === true) {
    return { key: "destructive", label: "破坏性" };
  }
  if (annotations.readOnlyHint === true) {
    return { key: "read", label: "只读" };
  }
  if (annotations.readOnlyHint === false) {
    return { key: "write", label: "写入" };
  }
  return { key: "unknown", label: "需确认" };
}

export function McpToolDrawer({ server, onClose, onUpdated }) {
  const [enabledTools, setEnabledTools] = useState([]);
  const [busyTool, setBusyTool] = useState("");

  useEffect(() => {
    setEnabledTools(Array.isArray(server?.enabledTools) ? server.enabledTools : []);
  }, [server]);

  if (!server) return null;

  const toggleTool = async (tool) => {
    const remoteName = tool.name;
    const active = enabledTools.includes(remoteName);
    const next = active
      ? enabledTools.filter((name) => name !== remoteName)
      : [...enabledTools, remoteName];
    setBusyTool(remoteName);
    try {
      const updated = await mcpApi.update(server.id, { enabledTools: next });
      setEnabledTools(updated?.enabledTools || next);
      onUpdated(updated);
    } catch (error) {
      notifyError(error, "更新工具状态失败");
    } finally {
      setBusyTool("");
    }
  };

  return (
    <div
      className={"mcp-tool-drawer-backdrop"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className={"mcp-tool-drawer"}
        role={"dialog"}
        aria-modal={"true"}
        aria-labelledby={"mcp-tool-drawer-title"}
      >
        <header className={"mcp-tool-drawer-head"}>
          <div>
            <h2 id={"mcp-tool-drawer-title"}>{server.name}</h2>
            <span>
              {`${server.tools?.length || 0}个工具，已启用${enabledTools.length}个`}
            </span>
          </div>
          <button
            className={"icon-button"}
            type={"button"}
            aria-label={"关闭工具详情"}
            onClick={onClose}
          >
            {"×"}
          </button>
        </header>
        <div className={"mcp-tool-list"}>
          {(server.tools || []).map((tool) => {
            const risk = toolRisk(tool);
            const active = enabledTools.includes(tool.name);
            return (
              <article className={"mcp-tool-row"} key={tool.modelName || tool.name}>
                <div className={"mcp-tool-copy"}>
                  <div>
                    <strong>{tool.name}</strong>
                    <span className={`mcp-risk ${risk.key}`}>{risk.label}</span>
                  </div>
                  <p>{tool.description || "此工具没有公开说明。"}</p>
                </div>
                <button
                  className={"mcp-tool-switch"}
                  type={"button"}
                  role={"switch"}
                  aria-checked={active}
                  aria-label={`${active ? "停用" : "启用"}${tool.name}`}
                  disabled={Boolean(busyTool)}
                  onClick={() => toggleTool(tool)}
                >
                  <span aria-hidden={"true"} />
                </button>
              </article>
            );
          })}
          {!server.tools?.length ? (
            <div className={"mcp-tool-empty"}>
              {"尚未发现工具，请先刷新服务器工具列表。"}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
