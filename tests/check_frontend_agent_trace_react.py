from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(path: str, token: str, label: str) -> None:
    assert token in read(path), (
        f"Missing {label}: {path} -> {token}"
    )


def main() -> None:
    require(
        "frontend/react/src/controller/chatFlow.js",
        'eventPayload.type === "agent_step"',
        "Agent SSE branch",
    )
    require(
        "frontend/react/src/controller/chatFlow.js",
        "markTraceInterrupted",
        "interrupted run terminal state",
    )
    require(
        "frontend/react/src/controller/chatFlow.js",
        "message.trace",
        "history trace restore",
    )
    require(
        "frontend/react/src/controller/messageEvents.js",
        "updateReactMessageTrace",
        "message trace bridge",
    )
    require(
        "frontend/react/src/components/ChatMessages.jsx",
        "AgentTraceStrip",
        "message status strip",
    )
    require(
        "frontend/react/src/components/AgentTraceView.jsx",
        "parentId",
        "nested trace protocol",
    )
    require(
        "frontend/react/src/components/AgentTraceView.jsx",
        'aria-current={',
        "current step accessibility",
    )
    require(
        "frontend/react/src/components/ChatEvidenceDrawer.jsx",
        "AgentTraceView",
        "drawer trace view",
    )
    require(
        "frontend/react/src/components/ChatEvidenceDrawer.jsx",
        "AgentRunSummary",
        "drawer live run summary",
    )
    require(
        "frontend/react/src/components/AgentRunSummary.jsx",
        "当前进度",
        "run progress metric",
    )
    require(
        "frontend/react/src/components/AgentRunSummary.jsx",
        "已用时间",
        "run elapsed metric",
    )
    require(
        "frontend/react/src/components/AgentRunSummary.jsx",
        "工具调用",
        "run tool count metric",
    )
    require(
        "frontend/react/src/components/AgentRunSummary.jsx",
        "setInterval",
        "live elapsed timer",
    )
    require(
        "frontend/react/src/components/AgentRunSummary.jsx",
        'step.status === "waiting"',
        "waiting run status",
    )
    require(
        "frontend/react/src/components/AgentRunSummary.jsx",
        '"已取消"',
        "cancelled run status",
    )
    require(
        "frontend/react/src/App.jsx",
        "knowflow:react-drawer-open",
        "programmatic drawer open",
    )
    require(
        "frontend/styles.css",
        "prefers-reduced-motion",
        "reduced motion support",
    )
    print(
        "React agent trace surfaces preserve live, "
        "nested, and replay states"
    )


if __name__ == "__main__":
    main()
