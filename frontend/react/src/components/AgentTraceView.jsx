import { useMemo, useState } from "react";


const kindLabels = {
  model: "MODEL",
  tool: "TOOL",
  mcp: "MCP",
  skill: "SKILL",
  agent: "AGENT",
  system: "SYS",
  approval: "APPROVAL",
};

const nameLabels = {
  agent_run: "Agent",
  model_completion: "模型",
  web_search: "联网搜索",
};

const statusLabels = {
  waiting: "等待中",
  running: "运行中",
  success: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

function displayName(step) {
  return (
    nameLabels[step?.name]
    || String(step?.name || step?.kind || "步骤").replaceAll("_", " ")
  );
}

export function traceStepTitle(step) {
  if (!step) return "";
  if (step.title === "连接中断") return step.title;
  if (step.name === "agent_run") {
    if (step.status === "running") return "Agent正在处理";
    if (step.status === "success") return "Agent处理完成";
    return "Agent处理失败";
  }
  if (step.name === "model_completion") {
    if (step.status === "running") return "模型正在分析";
    if (step.status === "success") return "模型步骤完成";
    return "模型调用失败";
  }
  if (step.name === "web_search") {
    if (step.status === "running") return "正在联网搜索";
    if (step.status === "success") return "联网搜索完成";
    return "联网搜索失败";
  }
  return `${displayName(step)}${statusLabels[step.status] || ""}`;
}

function stepDepth(step, byId) {
  let depth = 0;
  let parent = step.parentId
    ? byId.get(step.parentId)
    : null;
  const visited = new Set();
  while (
    parent
    && !visited.has(parent.stepId)
    && depth < 6
  ) {
    visited.add(parent.stepId);
    depth += 1;
    parent = parent.parentId
      ? byId.get(parent.parentId)
      : null;
  }
  return depth;
}

function summaryText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

export function AgentTraceView({ trace = [] }) {
  const [selectedId, setSelectedId] = useState("");
  const rows = useMemo(() => {
    const safeTrace = Array.isArray(trace) ? trace : [];
    const byId = new Map(
      safeTrace.map((step) => [step.stepId, step]),
    );
    return safeTrace.map((step) => ({
      ...step,
      depth: stepDepth(step, byId),
    }));
  }, [trace]);
  const selected = (
    rows.find((step) => step.stepId === selectedId)
    || [...rows].reverse().find((step) => step.status === "running")
    || rows[rows.length - 1]
  );
  const currentStepId = [...rows].reverse().find(
    (step) => step.status === "running",
  )?.stepId;

  if (!rows.length) {
    return (
      <p className={"empty-state"}>
        {"本次回答没有Agent运行记录。"}
      </p>
    );
  }

  return (
    <div className={"agent-trace-view"}>
      <div
        className={"agent-trace-tree"}
        role={"list"}
        aria-label={"Agent运行步骤"}
      >
        {rows.map((step) => (
          <div
            className={"agent-trace-row"}
            style={{ "--trace-depth": step.depth }}
            role={"listitem"}
            key={step.stepId}
          >
            <button
              className={[
                "agent-trace-node",
                step.status,
                selected?.stepId === step.stepId
                  ? "selected"
                  : "",
              ].filter(Boolean).join(" ")}
              type={"button"}
              aria-current={
                step.stepId === currentStepId
                  ? "step"
                  : undefined
              }
              onClick={() => setSelectedId(step.stepId)}
            >
              <span
                className={"agent-trace-node-dot"}
                aria-hidden={"true"}
              ></span>
              <span className={`agent-trace-kind ${step.kind}`}>
                {kindLabels[step.kind] || step.kind}
              </span>
              <span className={"agent-trace-node-copy"}>
                <strong>{traceStepTitle(step)}</strong>
                <small>
                  {displayName(step)}
                  {" · "}
                  {statusLabels[step.status] || step.status}
                </small>
              </span>
              <span className={"agent-trace-node-time"}>
                {step.durationMs != null
                  ? `${step.durationMs}ms`
                  : "…"}
              </span>
            </button>
          </div>
        ))}
      </div>
      {selected ? (
        <section
          className={"agent-trace-detail"}
          aria-label={"步骤详情"}
        >
          <div>
            <span>{"公开输入"}</span>
            <code>
              {summaryText(selected.inputSummary, "无")}
            </code>
          </div>
          <div>
            <span>{"结果摘要"}</span>
            <code>
              {summaryText(
                selected.outputSummary,
                selected.status === "running"
                  ? "执行中"
                  : "无",
              )}
            </code>
          </div>
          {selected.errorCode ? (
            <div>
              <span>{"错误"}</span>
              <code>{selected.errorCode}</code>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
