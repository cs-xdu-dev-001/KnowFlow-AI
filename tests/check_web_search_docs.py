from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
env_example = (
    ROOT / "backend" / ".env.example"
).read_text(encoding="utf-8")
readme = (
    ROOT / "README.md"
).read_text(encoding="utf-8")
start_dev = (
    ROOT / "start-dev.cmd"
).read_text(encoding="utf-8")


def require(
    text_value: str,
    token: str,
    label: str,
) -> None:
    assert token in text_value, f"Missing {label}: {token}"


def forbid(
    text_value: str,
    token: str,
    label: str,
) -> None:
    assert token not in text_value, (
        f"Forbidden {label}: {token}"
    )


def main() -> None:
    for token in [
        "KNOWFLOW_WEB_SEARCH_TIMEOUT=15",
        "KNOWFLOW_WEB_SEARCH_MAX_RESULTS=5",
    ]:
        require(
            env_example,
            token,
            "web search runtime setting",
        )
    for token in [
        "web_search",
        "Tavily",
        "tool_choice",
        "设置页",
        "Agent运行图",
        "SSE",
    ]:
        require(
            readme,
            token,
            "web search documentation",
        )
    require(
        start_dev,
        "Tool API keys are configured per user in Settings",
        "per-user tool key startup guidance",
    )
    for forbidden in [
        "KNOWFLOW_" + "TAVILY_" + "API_KEY=",
        "tvly-" + "alice-secret",
    ]:
        forbid(
            env_example + readme + start_dev,
            forbidden,
            "server-side or real Tavily key",
        )
    print(
        "web search and agent trace documentation is complete"
    )


if __name__ == "__main__":
    main()
