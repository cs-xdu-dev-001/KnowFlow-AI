export class ApiError extends Error {
  constructor(message, { status = 0, code = null, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const BACKEND_UNAVAILABLE_MESSAGE = "后端服务未启动或无法连接，请先运行后端服务。";

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiError(text, { status: response.status });
  }
}

export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});
  let body = options.body;

  if (body && !isFormData && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(path, {
      ...options,
      body,
      headers,
      credentials: "include",
    });
  } catch (error) {
    if (path.startsWith("/api")) {
      throw new ApiError(BACKEND_UNAVAILABLE_MESSAGE, { status: 0 });
    }
    throw error;
  }

  let payload;
  try {
    payload = await parseResponse(response);
  } catch (error) {
    if (
      error instanceof ApiError &&
      path.startsWith("/api") &&
      response.status >= 500 &&
      /internal server error/i.test(error.message)
    ) {
      throw new ApiError(BACKEND_UNAVAILABLE_MESSAGE, { status: response.status });
    }
    throw error;
  }

  if (!response.ok) {
    throw new ApiError(payload?.message || response.statusText || "Request failed", {
      status: response.status,
      code: payload?.code ?? null,
      data: payload?.data ?? payload,
    });
  }
  if (payload && payload.code !== 0) {
    throw new ApiError(payload.message || "Request failed", {
      status: response.status,
      code: payload.code,
      data: payload.data,
    });
  }
  return payload?.data ?? payload;
}

export const authApi = {
  getCurrentUser: () => apiRequest("/api/auth/me"),
  login: (account, password) => apiRequest("/api/auth/login", { method: "POST", body: { account, password } }),
  register: ({ username, email, password, displayName }) =>
    apiRequest("/api/auth/register", { method: "POST", body: { username, email, password, displayName } }),
  logout: () => apiRequest("/api/auth/logout", { method: "POST" }),
};
