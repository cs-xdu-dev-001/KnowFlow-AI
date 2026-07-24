import { useEffect, useMemo, useState } from "react";

const terminalStatuses = new Set(["success", "failed", "cancelled"]);

function formatDuration(milliseconds) {
  const value = Math.max(0, Number(milliseconds) || 0);
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function shortRunId(runId) {
  const value = String(runId || "");
  if (!value) return "尚未开始";
  const suffix = value.startsWith("run_")
    ? value.slice(4, 8)
    : value.slice(0, 8);
  return `run_${suffix.toUpperCase()}`;
}

export function AgentRunSummary({ trace = [] }) {
  const safeTrace = Array.isArray(trace) ? trace : [];
  const running = safeTrace.some((step) => step.status === "running");
  const failed = !running && safeTrace.some((step) => step.status === "failed");
  const cancelled = !running && !failed && safeTrace.some(
    (step) => step.status === "cancelled",
  );
  const waiting = !running && !failed && !cancelled && safeTrace.some(
    (step) => step.status === "waiting",
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [running]);

  const metrics = useMemo(() => {
    const root = (
      safeTrace.find((step) => step.name === "agent_run")
      || safeTrace[0]
    );
    const startedAt = Date.parse(root?.startedAt || "");
    const elapsedMs = root?.durationMs != null
      ? root.durationMs
      : Number.isFinite(startedAt)
        ? now - startedAt
        : 0;
    return {
      completed: safeTrace.filter((step) => terminalStatuses.has(step.status)).length,
      elapsed: formatDuration(elapsedMs),
      runId: shortRunId(root?.runId),
      toolCalls: safeTrace.filter((step) => step.kind === "tool").length,
      total: safeTrace.length,
    };
  }, [now, safeTrace]);

  const status = !safeTrace.length
    ? "waiting"
    : running
      ? "running"
      : failed
        ? "failed"
        : cancelled
          ? "cancelled"
          : waiting
            ? "waiting"
            : "success";
  const statusLabel = {
    cancelled: "已取消",
    failed: "失败",
    running: "执行中",
    success: "已完成",
    waiting: "等待运行",
  }[status];
  const freshness = running
    ? "实时"
    : status === "waiting"
      ? "等待"
      : "已保存";

  return (
    <section className={"agent-run-summary"} aria-label={"本次运行概览"}>
      <div className={"agent-run-summary-head"}>
        <div>
          <h2>{"本次运行"}</h2>
          <span>{metrics.runId}{" · "}{freshness}</span>
        </div>
        <strong className={`agent-run-status ${status}`}>
          {statusLabel}
        </strong>
      </div>
      <div className={"agent-run-metrics"}>
        <div>
          <span>{"当前进度"}</span>
          <strong>{metrics.completed}{" / "}{metrics.total}</strong>
        </div>
        <div>
          <span>{"已用时间"}</span>
          <strong>{metrics.elapsed}</strong>
        </div>
        <div>
          <span>{"工具调用"}</span>
          <strong>{metrics.toolCalls}{"次"}</strong>
        </div>
      </div>
    </section>
  );
}
