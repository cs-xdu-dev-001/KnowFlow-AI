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
    require("frontend/react/src/api/client.js", "toolConfigApi", "tool configuration API helper")
    require("frontend/react/src/components/ToolsPage.jsx", "loadToolConfigs", "tool configuration loader")
    require("frontend/react/src/components/ToolsPage.jsx", "handleToolSubmit", "tool configuration save handler")
    require("frontend/react/src/components/ToolsPage.jsx", "handleToolTest", "tool connection check handler")
    require("frontend/react/src/components/ToolsPage.jsx", "handleToolDelete", "tool configuration clear handler")
    require("frontend/react/src/components/ToolsPage.jsx", '{"原生工具"}', "registered native tool metric")
    require("frontend/react/src/components/ToolsPage.jsx", "MCP连接", "MCP inventory metric")
    require("frontend/react/src/components/ToolsPage.jsx", "尚未连接MCP服务器", "MCP empty state")
    require("frontend/react/src/components/ToolConfigPanel.jsx", "检查连接（1 credit）", "credit-aware connection action")
    require("frontend/react/src/components/ToolConfigPanel.jsx", 'type={"password"}', "masked tool key input")
    require("frontend/react/src/controller/chatFlow.js", "enableTools: true", "automatic tools enabled")
    require("frontend/react/src/controller/chatFlow.js", "autoAgent: true", "automatic agent routing enabled")
    forbid(
        "frontend/react/src/components/SettingsPage.jsx",
        "ToolConfigPanel",
        "tool configuration on the model settings page",
    )
    forbid(
        "frontend/react/src/components/ToolConfigPanel.jsx",
        "Tavily API 可以",
        "explanatory small-print copy",
    )


if __name__ == "__main__":
    main()
