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
    require("frontend/react/src/components/SettingsPage.jsx", "loadToolConfigs", "tool configuration loader")
    require("frontend/react/src/components/SettingsPage.jsx", "handleToolSubmit", "tool configuration save handler")
    require("frontend/react/src/components/SettingsPage.jsx", "handleToolTest", "tool connection check handler")
    require("frontend/react/src/components/SettingsPage.jsx", "handleToolDelete", "tool configuration clear handler")
    require("frontend/react/src/components/ToolConfigPanel.jsx", "检查连接（1 credit）", "credit-aware connection action")
    require("frontend/react/src/components/ToolConfigPanel.jsx", 'type={"password"}', "masked tool key input")
    require("frontend/react/src/controller/chatFlow.js", "enableTools: true", "automatic tools enabled")
    require("frontend/react/src/controller/chatFlow.js", "autoAgent: true", "automatic agent routing enabled")
    forbid(
        "frontend/react/src/components/ToolConfigPanel.jsx",
        "Tavily API 可以",
        "explanatory small-print copy",
    )


if __name__ == "__main__":
    main()
