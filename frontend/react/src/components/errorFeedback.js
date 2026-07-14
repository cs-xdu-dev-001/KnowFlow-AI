import { normalizeErrorMessage } from "../api/errors.js";

export function notifyToast(message, { duration = 2400, tone = "neutral" } = {}) {
  const nextMessage = String(message || "").trim();
  if (!nextMessage) return false;
  window.dispatchEvent(new CustomEvent("knowflow:react-toast", { detail: { message: nextMessage, duration, tone } }));
  return true;
}

export function notifyError(error, fallback = "请求失败，请稍后重试。") {
  return notifyToast(normalizeErrorMessage(error, fallback), { duration: 4200, tone: "error" });
}
