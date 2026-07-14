export const BACKEND_UNAVAILABLE_MESSAGE = "服务暂不可用，请稍后重试。";
export const GENERIC_REQUEST_ERROR_MESSAGE = "请求失败，请稍后重试。";
export const SERVER_ERROR_MESSAGE = "服务器错误，请稍后重试，或查看后端日志。";

export function isBackendUnavailableError(error) {
  if (!error) return false;
  if (error.status === 0 || error.code === "BACKEND_UNAVAILABLE") return true;
  return String(error.message || "").trim() === BACKEND_UNAVAILABLE_MESSAGE;
}

export function normalizeErrorMessage(error, fallback = GENERIC_REQUEST_ERROR_MESSAGE) {
  if (isBackendUnavailableError(error)) return BACKEND_UNAVAILABLE_MESSAGE;
  const raw = typeof error === "string" ? error : error?.message;
  const message = String(raw || "").trim();
  if (!message) return fallback;
  if (/^please sign in first\.?$/i.test(message)) return "请先登录。";
  if (/^internal server error$/i.test(message)) return SERVER_ERROR_MESSAGE;
  return message;
}
