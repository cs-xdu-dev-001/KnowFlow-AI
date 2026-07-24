from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(relative: str, token: str, label: str) -> None:
    source = read(relative)
    assert token in source, f"missing {label}: {token}"


def forbid(relative: str, token: str, label: str) -> None:
    source = read(relative)
    assert token not in source, f"unexpected {label}: {token}"


def main() -> None:
    client = "frontend/react/src/api/client.js"
    require(client, "export const mcpApi", "MCP API helper")
    for method in (
        "list:",
        "create:",
        "update:",
        "delete:",
        "test:",
        "refreshTools:",
        "disconnect:",
        "startOAuth:",
    ):
        require(client, method, f"MCP API method {method}")
    for path in (
        '"/api/mcp/servers"',
        "/refresh-tools",
        "/disconnect",
        "/oauth/start",
    ):
        require(client, path, f"MCP endpoint {path}")

    tools_page = "frontend/react/src/components/ToolsPage.jsx"
    require(
        tools_page,
        "McpServerPanel",
        "MCP server workspace",
    )
    require(tools_page, "mcpResult", "OAuth success result")
    require(tools_page, "mcpError", "OAuth error result")
    require(
        tools_page,
        "history.replaceState",
        "one-time OAuth URL cleanup",
    )
    forbid(
        tools_page,
        "尚未连接MCP服务器",
        "legacy empty MCP placeholder",
    )

    app = "frontend/react/src/App.jsx"
    require(app, "URLSearchParams", "initial page URL reader")
    require(app, 'page === "tools"', "tools page restoration")

    panel = "frontend/react/src/components/McpServerPanel.jsx"
    require(panel, "mcpApi.list", "server loader")
    require(panel, 'preset: "notion"', "Notion preset creation")
    require(panel, "连接Notion", "Notion connection action")
    require(
        panel,
        "window.location.assign",
        "OAuth navigation",
    )
    require(panel, "refreshTools", "tool refresh action")
    require(panel, "disconnect", "server disconnect action")
    require(panel, "editingServer", "custom server edit state")
    require(panel, '"编辑"', "custom server edit action")
    require(panel, "mcpApi.update(server.id", "custom server update")
    require(panel, "{ enabled: true }", "disconnected server re-enable")
    require(panel, "已启用", "enabled tool count")
    require(panel, "个工具", "discovered tool count")

    dialog = "frontend/react/src/components/McpServerDialog.jsx"
    for token, label in (
        ('name={"name"}', "server name"),
        ('name={"url"}', "server URL"),
        ('value={"oauth"}', "OAuth auth option"),
        ('value={"headers"}', "static header auth option"),
        ('value={"none"}', "no-auth option"),
        ('name={"clientId"}', "OAuth client ID"),
        ('name={"clientSecret"}', "OAuth client secret"),
        ("headerRows", "multiple header rows"),
        ('type={"password"}', "masked secret input"),
        ("server = null", "custom server edit input"),
        ("isEditing", "custom server edit mode"),
        ("已配置，留空则保留", "existing secret placeholder"),
    ):
        require(dialog, token, label)
    forbid(dialog, "disabled={isEditing}", "locked custom connection fields")

    drawer = "frontend/react/src/components/McpToolDrawer.jsx"
    require(drawer, "enabledTools", "full enabled tool array")
    require(drawer, "mcpApi.update", "tool enable update")
    require(drawer, "readOnlyHint", "read risk")
    require(drawer, "destructiveHint", "destructive risk")
    require(drawer, "aria-checked", "accessible tool switch")

    styles = read("frontend/styles.css")
    for token in (
        ".mcp-server-grid",
        ".mcp-server-card",
        ".mcp-status",
        ".mcp-dialog",
        ".mcp-tool-drawer",
        "@media",
        "prefers-reduced-motion",
    ):
        assert token in styles, f"missing MCP style: {token}"
    print("MCP settings workspace contract is complete")


if __name__ == "__main__":
    main()
