const state = {
  models: [],
  knowledgeBases: [],
  documents: [],
  sessions: [],
  currentSessionId: null,
  selectedSessionId: null,
  selectedKnowledgeBaseId: null,
  kbSearch: "",
  editingModelId: null,
  chatAttachments: [],
  currentUser: null,
  oauthProviders: {},
  documentPoller: null,
  selectedDocumentFile: null,
  pendingDocuments: [],
  knowledgeTab: "documents",
  sending: false,
  activeChatController: null,
  lastChatRequest: null,
};

const MAX_CLIENT_UPLOAD_SIZE = 25 * 1024 * 1024;
const CLIENT_ALLOWED_SUFFIXES = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".log",
  ".yaml",
  ".yml",
  ".xml",
  ".json",
  ".csv",
  ".tsv",
  ".html",
  ".htm",
  ".rtf",
  ".pdf",
  ".docx",
  ".xlsx",
  ".xlsm",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
]);

const PROVIDER_PRESETS = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: [
      { label: "DeepSeek Chat", name: "DeepSeek Chat", modelType: "chat", modelName: "deepseek-chat", temperature: 0.7, topP: 0.9, maxTokens: 4096 },
      { label: "DeepSeek Reasoner", name: "DeepSeek Reasoner", modelType: "chat", modelName: "deepseek-reasoner", temperature: 0.3, topP: 0.9, maxTokens: 8192 },
    ],
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { label: "GPT-4.1", name: "GPT-4.1", modelType: "chat", modelName: "gpt-4.1", temperature: 0.3, topP: 0.9, maxTokens: 4096 },
      { label: "GPT-4.1 mini", name: "GPT-4.1 mini", modelType: "chat", modelName: "gpt-4.1-mini", temperature: 0.3, topP: 0.9, maxTokens: 4096 },
      { label: "text-embedding-3-large", name: "OpenAI Embedding Large", modelType: "embedding", modelName: "text-embedding-3-large", temperature: "", topP: "", maxTokens: "" },
      { label: "text-embedding-3-small", name: "OpenAI Embedding Small", modelType: "embedding", modelName: "text-embedding-3-small", temperature: "", topP: "", maxTokens: "" },
    ],
  },
  mimo: {
    label: "MiMo",
    baseUrl: "https://api.mimo-v2.com/v1",
    models: [
      { label: "MiMo V2 Pro", name: "MiMo V2 Pro", modelType: "chat", modelName: "mimo-v2-pro", temperature: 1.0, topP: 0.95, maxTokens: 4096 },
      { label: "MiMo V2 Flash", name: "MiMo V2 Flash", modelType: "chat", modelName: "mimo-v2-flash", temperature: 1.0, topP: 0.95, maxTokens: 4096 },
    ],
  },
  dashscope: {
    label: "百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { label: "Qwen Plus", name: "Qwen Plus", modelType: "chat", modelName: "qwen-plus", temperature: 0.7, topP: 0.9, maxTokens: 4096 },
      { label: "Qwen Max", name: "Qwen Max", modelType: "chat", modelName: "qwen-max", temperature: 0.5, topP: 0.9, maxTokens: 4096 },
      { label: "text-embedding-v4", name: "百炼向量模型 V4", modelType: "embedding", modelName: "text-embedding-v4", temperature: "", topP: "", maxTokens: "" },
    ],
  },
  gemini: {
    label: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: [
      { label: "Gemini 2.5 Pro", name: "Gemini 2.5 Pro", modelType: "chat", modelName: "gemini-2.5-pro", temperature: 0.3, topP: 0.9, maxTokens: 4096 },
      { label: "Gemini 2.5 Flash", name: "Gemini 2.5 Flash", modelType: "chat", modelName: "gemini-2.5-flash", temperature: 0.7, topP: 0.9, maxTokens: 4096 },
    ],
  },
  minimax: {
    label: "MiniMax",
    baseUrl: "https://api.minimax.io/v1",
    models: [
      { label: "MiniMax M2", name: "MiniMax M2", modelType: "chat", modelName: "MiniMax-M2", temperature: 1.0, topP: 0.95, maxTokens: 4096 },
      { label: "MiniMax M2.5", name: "MiniMax M2.5", modelType: "chat", modelName: "MiniMax-M2.5", temperature: 1.0, topP: 0.95, maxTokens: 4096 },
    ],
  },
  custom: {
    label: "自定义接口",
    baseUrl: "",
    models: [],
  },
};

const MODEL_TYPE_TEXT = {
  chat: "对话模型",
  embedding: "向量化模型",
  rerank: "重排模型",
};

const STATUS_TEXT = {
  active: "启用",
  untested: "未测试",
  available: "可用",
  unavailable: "不可用",
  pending: "待处理",
  uploading: "上传中",
  parsing: "解析中",
  processing: "处理中",
  chunking: "切分中",
  embedding: "切分完成，向量化中",
  success: "向量化完成",
  failed: "失败",
};

const DOCUMENT_STEPS = [
  { key: "uploading", label: "上传中" },
  { key: "parsing", label: "解析中" },
  { key: "chunking", label: "切分完成" },
  { key: "embedding", label: "向量化中" },
  { key: "success", label: "向量化完成" },
];

const DOCUMENT_STATUS_INDEX = {
  uploading: 0,
  pending: 0,
  processing: 1,
  parsing: 1,
  chunking: 2,
  embedding: 3,
  success: 4,
  failed: 4,
};

const TOOL_TEXT = {
  knowledge_search: "知识库检索",
  document_summary: "文档摘要",
  session_memory_search: "历史会话查询",
  markdown_draft_generate: "草稿生成",
};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function on(selector, eventName, handler, options) {
  const element = typeof selector === "string" ? $(selector) : selector;
  if (!element) {
    console.warn(`[KnowFlow] missing event target: ${selector}`);
    return null;
  }
  element.addEventListener(eventName, handler, options);
  return element;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return html;
}

function renderMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listType = null;
  let paragraph = [];
  let inCode = false;
  let codeLines = [];
  let codeLang = "";

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };
  const openList = (type) => {
    if (listType === type) return;
    closeList();
    html.push(`<${type}>`);
    listType = type;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    const codeFence = line.match(/^```([\w-]*)\s*$/);
    if (codeFence) {
      if (inCode) {
        html.push(`<pre><code${codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        inCode = false;
        codeLines = [];
        codeLang = "";
      } else {
        flushParagraph();
        closeList();
        inCode = true;
        codeLang = codeFence[1] || "";
      }
      continue;
    }
    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(Math.max(heading[1].length, 3), 5);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      openList("ul");
      html.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      openList("ol");
      html.push(`<li>${renderInlineMarkdown(numbered[1])}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  if (inCode) {
    html.push(`<pre><code${codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  closeList();
  return html.join("");
}

function setMessageContent(bubble, role, content) {
  const raw = String(content || "");
  if (updateReactMessageContent(bubble, role, raw)) return;
  bubble.dataset.rawContent = raw;
  bubble.classList.remove("thinking");
  bubble.removeAttribute("aria-busy");
  const row = bubble.closest(".message-row");
  if (row) row.classList.remove("thinking-row");
  if (role === "assistant") {
    bubble.innerHTML = raw ? renderMarkdown(raw) : "";
  } else {
    bubble.textContent = raw;
  }
}

function setMessageThinking(bubble, enabled) {
  if (updateReactMessageThinking(bubble, enabled)) return;
  bubble.classList.toggle("thinking", enabled);
  const row = bubble.closest(".message-row");
  if (row) row.classList.toggle("thinking-row", enabled);
  if (!enabled) {
    bubble.removeAttribute("aria-busy");
    return;
  }
  bubble.setAttribute("aria-busy", "true");
  bubble.dataset.rawContent = "";
  bubble.innerHTML = `
    <div class="thinking-indicator" aria-label="模型正在思考">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}

let renderSendButton = function (sending = state.sending) {
  const submit = $("#chat-submit-btn") || $("#chat-form button[type='submit']");
  if (!submit) return;
  submit.classList.toggle("is-generating", sending);
  submit.setAttribute("aria-label", sending ? "停止生成" : "发送消息");
  submit.title = sending ? "停止生成" : "发送消息";
  submit.innerHTML = sending ? '<span class="stop-square" aria-hidden="true"></span>' : '<span class="send-arrow" aria-hidden="true">↑</span>';
};

let updateComposerContextSummary = function () {
  const modelSelect = $("#chat-model-select");
  const kbSelect = $("#composer-kb-select") || $("#chat-kb-select");
  const summary = $("#composer-context-summary");
  if (!summary) return;
  const modelLabel = modelSelect?.selectedOptions?.[0]?.textContent?.trim() || "本地备用模型";
  const kbLabel = kbSelect?.value ? kbSelect.selectedOptions?.[0]?.textContent?.trim() : "不使用知识库";
  summary.textContent = kbSelect?.value ? `上下文：${kbLabel}` : "上下文：普通对话";
  summary.title = `${modelLabel} · ${kbLabel}`;
};

function syncComposerSelectsFromMain() {
  const mainKb = $("#chat-kb-select");
  const composerKb = $("#composer-kb-select");
  if (mainKb && composerKb) {
    if (!window.__knowflowReactKnowledgeOptionsEnabled) {
      composerKb.innerHTML = mainKb.innerHTML;
    }
    composerKb.value = mainKb.value;
  }
  updateComposerContextSummary();
}

function syncMainSelectFromComposer(sourceSelector, targetSelector) {
  const source = $(sourceSelector);
  const target = $(targetSelector);
  if (!source || !target) return;
  target.value = source.value;
  updateComposerContextSummary();
}

function notifyReactModelOptionsUpdated(models, selectedModelId = "", selectedEmbeddingModelId = "") {
  if (!window.__knowflowReactModelOptionsEnabled) return false;
  window.dispatchEvent(
    new CustomEvent("knowflow:legacy-model-options-updated", {
      detail: {
        models,
        selectedModelId,
        selectedEmbeddingModelId,
      },
    }),
  );
  return true;
}

function notifyReactKnowledgeOptionsUpdated(knowledgeBases, selectedKnowledgeBaseId = null, selections = {}) {
  if (!window.__knowflowReactKnowledgeOptionsEnabled) return false;
  window.dispatchEvent(
    new CustomEvent("knowflow:legacy-knowledge-options-updated", {
      detail: {
        knowledgeBases,
        selectedKnowledgeBaseId,
        ...selections,
      },
    }),
  );
  return true;
}

function notifyReactModelSelectionUpdated(selectedModelId = "") {
  if (!window.__knowflowReactModelOptionsEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-model-selection-updated", { detail: { selectedModelId } }));
  return true;
}

function notifyReactKnowledgeSelectionUpdated(selectedKnowledgeBaseId = undefined, selections = {}) {
  if (!window.__knowflowReactKnowledgeOptionsEnabled) return false;
  const detail = { ...selections };
  if (selectedKnowledgeBaseId !== undefined) {
    detail.selectedKnowledgeBaseId = selectedKnowledgeBaseId;
  }
  window.dispatchEvent(new CustomEvent("knowflow:legacy-knowledge-selection-updated", { detail }));
  return true;
}

function notifyReactSendingUpdated(sending) {
  if (!window.__knowflowReactSendingStateEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-sending-updated", { detail: { sending } }));
  return true;
}

function notifyReactToast(message, duration = 2400) {
  if (!window.__knowflowReactToastEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-toast", { detail: { message, duration } }));
  return true;
}

function labelOf(map, value, fallback = "未设置") {
  return map[value] || value || fallback;
}

function toast(message) {
  if (notifyReactToast(message)) return;
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 2400);
}

function setSelectedDocumentFile(file) {
  state.selectedDocumentFile = file || null;
  const nameEl = $("#document-file-name");
  const dropZone = $("#document-drop-zone");
  if (!nameEl || !dropZone) return;
  if (file?.name) {
    nameEl.textContent = `${file.name} · ${formatBytes(file.size || 0)}`;
    dropZone.classList.add("has-file");
  } else {
    nameEl.textContent = "尚未选择文件";
    dropZone.classList.remove("has-file");
  }
}

function clearSelectedDocumentFile() {
  state.selectedDocumentFile = null;
  const input = $("#document-file-input");
  if (input) input.value = "";
  setSelectedDocumentFile(null);
}

function optimisticDocument(file, tempId, kbId) {
  return {
    id: tempId,
    temporary: true,
    local_status: "queued-local",
    knowledge_base_id: Number(kbId || 0) || kbId || "",
    filename: file.name,
    file_type: file.name.split(".").pop() || "文件",
    file_size: file.size || 0,
    parse_status: "uploading",
    chunk_count: 0,
    updated_at: "刚刚",
    latestTask: { stage: "uploading", status: "running", progress: 8 },
  };
}

function sameDocumentIdentity(left, right) {
  const leftServerId = Number(left.server_document_id || 0);
  const leftId = Number(left.id || 0);
  const rightId = Number(right.id || right.document_id || 0);
  if (leftServerId > 0 && rightId > 0) return leftServerId === rightId;
  if (leftId > 0 && rightId > 0) return leftId === rightId;

  const sameOriginalName = String(left.original_filename || left.filename || "") === String(right.original_filename || right.filename || "");
  const sameStoredName = String(left.filename || "") === String(right.filename || "");
  const sameSize = Number(left.file_size || 0) > 0 && Number(left.file_size || 0) === Number(right.file_size || 0);
  return (sameOriginalName || sameStoredName) && sameSize;
}

function mergePendingDocuments(documents = state.documents) {
  const kbId = String($("#doc-kb-select")?.value || state.selectedKnowledgeBaseId || "");
  const serverDocs = documents || [];
  const pending = state.pendingDocuments.filter((doc) => {
    if (kbId && String(doc.knowledge_base_id || "") !== kbId) return false;
    return !serverDocs.some((serverDoc) => sameDocumentIdentity(doc, serverDoc));
  });
  return [...pending, ...serverDocs];
}

function upsertPendingDocument(doc) {
  state.pendingDocuments = [doc, ...state.pendingDocuments.filter((item) => item.id !== doc.id)];
}

function markPendingDocumentProcessing(tempId, payload = {}) {
  state.pendingDocuments = state.pendingDocuments.map((doc) =>
    doc.id === tempId
      ? {
          ...doc,
          server_document_id: payload.documentId || payload.id || doc.server_document_id,
          parse_status: payload.parseStatus || "processing",
          latestTask: { stage: payload.parseStatus || "processing", status: "running", progress: 35 },
          updated_at: "刚刚",
        }
      : doc
  );
}

function failPendingDocument(tempId, message) {
  state.pendingDocuments = state.pendingDocuments.map((doc) =>
    doc.id === tempId
      ? {
          ...doc,
          parse_status: "failed",
          error_message: message || "上传失败",
          latestTask: { stage: "failed", status: "failed", progress: 100 },
        }
      : doc
  );
}

function clearResolvedPendingDocuments(serverDocs = state.documents) {
  state.pendingDocuments = state.pendingDocuments.filter(
    (doc) => doc.parse_status === "failed" || !serverDocs.some((serverDoc) => sameDocumentIdentity(doc, serverDoc))
  );
}

function removePendingDocument(tempId) {
  state.pendingDocuments = state.pendingDocuments.filter((doc) => doc.id !== tempId);
  renderDocuments();
}

async function readErrorMessage(response) {
  const fallback = response.status === 401 ? "\u8bf7\u5148\u767b\u5f55" : "\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5";
  const text = await response.text();
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text);
    if (payload.message) return payload.message;
    if (typeof payload.detail === "string") return payload.detail;
    if (payload.detail?.message) return payload.detail.message;
  } catch {
    return text;
  }
  return fallback;
}

function showAuthMessage(mode, message) {
  const el = $(`#auth-${mode}-message`);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearAuthMessage(mode) {
  const el = $(`#auth-${mode}-message`);
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
}

function notifyReactAuthStateUpdated({ authenticated = Boolean(state.currentUser), user = state.currentUser, oauthProviders = state.oauthProviders } = {}) {
  if (!window.__knowflowReactAuthStateEnabled) return false;
  window.dispatchEvent(
    new CustomEvent("knowflow:legacy-auth-state-updated", {
      detail: {
        authenticated,
        user: user || null,
        oauthProviders: oauthProviders || {},
      },
    }),
  );
  return true;
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      showAuthScreen();
    }
    throw new Error(message);
  }
  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(payload.message || "\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
  }
  return payload.data;
}

function setAuthMode(mode) {
  const isLogin = mode !== "register";
  $all("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === (isLogin ? "login" : "register")));
  $("#login-form")?.classList.toggle("hidden", !isLogin);
  $("#register-form")?.classList.toggle("hidden", isLogin);
  clearAuthMessage("login");
  clearAuthMessage("register");
}

function showAuthScreen(providers = state.oauthProviders) {
  state.oauthProviders = providers || state.oauthProviders || {};
  if (notifyReactAuthStateUpdated({ authenticated: false, user: null, oauthProviders: state.oauthProviders })) return;
  $("#auth-screen")?.classList.remove("hidden");
  $("#app-shell")?.classList.add("auth-locked");
  document.body.classList.add("auth-required");
  const github = state.oauthProviders.github || {};
  const githubButton = $("#github-login-btn");
  if (githubButton) {
    githubButton.disabled = !github.enabled;
    githubButton.title = github.enabled ? "\u4f7f\u7528 GitHub \u6388\u6743\u7ee7\u7eed" : "GitHub \u767b\u5f55\u6682\u672a\u914d\u7f6e";
  }
  const hint = $("#auth-hint");
  if (hint) {
    hint.textContent = github.enabled ? "GitHub \u6388\u6743\u4ec5\u7528\u4e8e\u767b\u5f55\uff0c\u4e0d\u4f1a\u8bbf\u95ee\u4f60\u7684\u4ed3\u5e93\u5185\u5bb9\u3002" : "GitHub \u767b\u5f55\u6682\u672a\u542f\u7528\uff0c\u4f60\u53ef\u4ee5\u4f7f\u7528\u672c\u5730\u8d26\u53f7\u767b\u5f55\u3002";
  }
  const callbackBox = $("#oauth-callback-box");
  if (callbackBox) {
    callbackBox.classList.toggle("hidden", Boolean(github.enabled));
  }
  const callbackUrl = $("#github-callback-url");
  if (callbackUrl) {
    callbackUrl.textContent = github.callbackUrl || `${window.location.origin}/api/auth/oauth/github/callback`;
  }
}

function showAppScreen() {
  if (notifyReactAuthStateUpdated({ authenticated: Boolean(state.currentUser), user: state.currentUser, oauthProviders: state.oauthProviders })) return;
  $("#auth-screen")?.classList.add("hidden");
  $("#app-shell")?.classList.remove("auth-locked");
  document.body.classList.remove("auth-required");
}

function renderCurrentUser() {
  if (notifyReactAuthStateUpdated({ authenticated: Boolean(state.currentUser), user: state.currentUser, oauthProviders: state.oauthProviders })) return;
  const user = state.currentUser || {};
  const displayName = user.displayName || user.username || "KnowFlow User";
  $("#user-display-name").textContent = displayName;
  $("#user-email").textContent = user.email || user.username || "本地账号";
  const avatar = $("#user-avatar");
  if (user.avatarUrl) {
    avatar.textContent = "";
    avatar.style.backgroundImage = `url("${user.avatarUrl}")`;
    avatar.classList.add("with-image");
  } else {
    avatar.style.backgroundImage = "";
    avatar.classList.remove("with-image");
    avatar.textContent = displayName.slice(0, 1).toUpperCase();
  }
}

async function checkAuth() {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  const payload = await response.json();
  const data = payload.data || {};
  state.oauthProviders = data.oauthProviders || {};
  if (!data.authenticated) {
    showAuthScreen(state.oauthProviders);
    return false;
  }
  state.currentUser = data.user;
  renderCurrentUser();
  showAppScreen();
  return true;
}

async function submitLogin(event) {
  event.preventDefault();
  clearAuthMessage("login");
  const payload = formJson(event.target);
  try {
    const data = await request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
    state.currentUser = data.user;
    renderCurrentUser();
    showAppScreen();
    toast("\u767b\u5f55\u6210\u529f");
    await refresh();
  } catch (error) {
    showAuthMessage("login", error.message || "\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u8d26\u53f7\u548c\u5bc6\u7801");
    throw error;
  }
}

async function submitRegister(event) {
  event.preventDefault();
  clearAuthMessage("register");
  const payload = formJson(event.target);
  try {
    const data = await request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
    state.currentUser = data.user;
    renderCurrentUser();
    showAppScreen();
    toast("\u8d26\u53f7\u5df2\u521b\u5efa");
    await refresh();
  } catch (error) {
    showAuthMessage("register", error.message || "\u6ce8\u518c\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u8f93\u5165\u4fe1\u606f");
    throw error;
  }
}

async function logout() {
  await request("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
  state.currentUser = null;
  state.sessions = [];
  state.currentSessionId = null;
  renderActiveSession();
  clearChatMessages();
  showAuthScreen();
  toast("已退出登录");
}

function bindReactAuthBridge() {
  window.addEventListener("knowflow:react-auth-success", (event) => {
    const detail = event.detail || {};
    if (detail.user) {
      state.currentUser = detail.user;
      renderCurrentUser();
    }
    showAppScreen();
    if (detail.message) toast(detail.message);
    refresh().catch((error) => toast(error.message || "刷新失败"));
  });

  window.addEventListener("knowflow:react-auth-logout", (event) => {
    const detail = event.detail || {};
    state.currentUser = null;
    state.sessions = [];
    state.currentSessionId = null;
    state.selectedSessionId = null;
    renderActiveSession();
    clearChatMessages();
    showAuthScreen(state.oauthProviders);
    if (detail.message) toast(detail.message);
  });

  window.addEventListener("knowflow:react-toast", (event) => {
    const message = event.detail?.message;
    if (message) toast(message);
  });
}

function getAssistantMessageContent(bubble) {
  return bubble?.dataset?.rawContent || bubble?.textContent || "";
}

async function copyAssistantMessageContent(content) {
  await navigator.clipboard.writeText(content || "");
  toast("回答已复制");
}

function bindReactMessageActionsBridge() {
  window.addEventListener("knowflow:react-message-copy", (event) => {
    const bubble = event.detail?.bubble || null;
    const content = event.detail?.rawContent || getAssistantMessageContent(bubble);
    copyAssistantMessageContent(content).catch(() => toast(content || "复制失败"));
  });

  window.addEventListener("knowflow:react-message-retry", (event) => {
    retryAnswer(event.detail?.bubble || null).catch((error) => toast(error.message || "重试失败"));
  });
}

function reactMessageController() {
  if (!window.__knowflowReactMessageListEnabled) return null;
  return window.__knowflowReactMessages || null;
}

function appendReactMessage(role, content, options = {}) {
  const controller = reactMessageController();
  if (!controller?.appendMessage) return null;
  const raw = String(content || "");
  return controller.appendMessage({
    role,
    rawContent: raw,
    html: role === "assistant" && !options.thinking ? renderMarkdown(raw) : "",
    thinking: Boolean(options.thinking),
  });
}

function updateReactMessageContent(bubble, role, raw) {
  const messageId = bubble?.dataset?.reactMessageId;
  const controller = reactMessageController();
  if (!messageId || !controller?.setMessageContent) return false;
  controller.setMessageContent(messageId, {
    role,
    rawContent: raw,
    html: role === "assistant" ? renderMarkdown(raw) : "",
    streaming: bubble.classList.contains("streaming"),
  });
  return true;
}

function updateReactMessageThinking(bubble, enabled) {
  const messageId = bubble?.dataset?.reactMessageId;
  const controller = reactMessageController();
  if (!messageId || !controller?.setMessageThinking) return false;
  controller.setMessageThinking(messageId, {
    enabled,
    streaming: bubble.classList.contains("streaming"),
  });
  return true;
}

function resetReactChatMessages(showWelcome = false) {
  const controller = reactMessageController();
  if (!controller?.resetMessages) return false;
  controller.resetMessages({ showWelcome });
  return true;
}

function clearChatMessages() {
  if (resetReactChatMessages(false)) return;
  const messages = $("#chat-messages");
  if (messages) messages.innerHTML = "";
}

function bindReactProviderBridge() {
  window.addEventListener("knowflow:react-provider-change", (event) => {
    const provider = event.detail?.provider;
    if (provider) applyProviderPreset(provider);
  });
}

function bindReactNavigationBridge() {
  window.addEventListener("knowflow:react-page-change", (event) => {
    const page = event.detail?.page;
    if (page) switchPage(page);
  });
}

function bindReactShellActionsBridge() {
  window.addEventListener("knowflow:react-new-chat", () => startNewChat());
  window.addEventListener("knowflow:react-refresh", () => refresh().catch((error) => toast(error.message)));
  window.addEventListener("knowflow:react-drawer-toggle", () => toggleDrawer());
  window.addEventListener("knowflow:react-drawer-close", () => toggleDrawer(true));
  window.addEventListener("knowflow:react-sidebar-toggle", () => toggleSidebar());
  window.addEventListener("knowflow:react-history-refresh", () =>
    refreshSessions().catch((error) => toast(error.message)),
  );
}

function bindReactKnowledgeActionsBridge() {
  window.addEventListener("knowflow:react-open-kb-modal", () => openKnowledgeBaseModal());
  window.addEventListener("knowflow:react-close-kb-modal", () => closeKnowledgeBaseModal());
  window.addEventListener("knowflow:react-open-retrieval-drawer", (event) =>
    openRetrievalDrawer(event.detail?.knowledgeBaseId ?? null),
  );
  window.addEventListener("knowflow:react-kb-select", (event) =>
    selectKnowledgeBase(event.detail?.knowledgeBaseId).catch((error) => toast(error.message || "打开知识库失败")),
  );
  window.addEventListener("knowflow:react-kb-delete", (event) =>
    deleteKnowledgeBase(event.detail?.knowledgeBaseId).catch((error) => toast(error.message || "删除知识库失败")),
  );
  window.addEventListener("knowflow:react-close-retrieval-drawer", () => closeRetrievalDrawer());
  window.addEventListener("knowflow:react-close-chunk-modal", () => closeChunkModal());
  window.addEventListener("knowflow:react-knowledge-search-change", (event) => {
    state.kbSearch = event.detail?.query || "";
    renderKnowledgeBases();
  });
}

function bindReactComposerChromeBridge() {
  window.addEventListener("knowflow:react-composer-menu-toggle", () => toggleComposerMenu());
  window.addEventListener("knowflow:react-composer-menu-close", () => toggleComposerMenu(false));
  window.addEventListener("knowflow:react-chat-files-change", async (event) => {
    const files = Array.from(event.detail?.files || []);
    try {
      for (const file of files) {
        await uploadChatAttachment(file);
      }
    } catch (error) {
      toast("附件上传失败：" + (error.message || "未知错误"));
    }
    if (event.detail?.input) event.detail.input.value = "";
    toggleComposerMenu(false);
  });
  window.addEventListener("knowflow:react-composer-kb-change", (event) => {
    syncMainSelectFromComposer("#composer-kb-select", "#chat-kb-select");
    notifyReactKnowledgeSelectionUpdated(undefined, {
      selectedChatKnowledgeBaseId: event.detail?.value || $("#composer-kb-select")?.value || "",
    });
    renderToolStatus();
  });
}

function bindReactContextControlsBridge() {
  window.addEventListener("knowflow:react-chat-model-change", (event) => {
    syncComposerSelectsFromMain();
    notifyReactModelSelectionUpdated(event.detail?.value || $("#chat-model-select")?.value || "");
  });
  window.addEventListener("knowflow:react-chat-kb-change", (event) => {
    syncComposerSelectsFromMain();
    notifyReactKnowledgeSelectionUpdated(undefined, {
      selectedChatKnowledgeBaseId: event.detail?.value || $("#chat-kb-select")?.value || "",
    });
    renderToolStatus();
  });
  window.addEventListener("knowflow:react-session-search-change", () => renderSessions(state.sessions));
}

function bindReactSessionListBridge() {
  window.addEventListener("knowflow:react-session-continue", (event) =>
    continueSession(event.detail?.sessionId).catch((error) => toast(error.message || "打开会话失败")),
  );
  window.addEventListener("knowflow:react-session-rename", (event) =>
    renameSession(event.detail?.sessionId).catch((error) => toast(error.message || "重命名失败")),
  );
  window.addEventListener("knowflow:react-session-delete", (event) =>
    deleteSession(event.detail?.sessionId).catch((error) => toast(error.message || "删除失败")),
  );
}

function bindReactModelListBridge() {
  window.addEventListener("knowflow:react-model-edit", (event) =>
    editModel(event.detail?.modelId).catch((error) => toast(error.message || "编辑模型失败")),
  );
  window.addEventListener("knowflow:react-model-test", (event) =>
    testModel(event.detail?.modelId).catch((error) => toast(error.message || "测试模型失败")),
  );
  window.addEventListener("knowflow:react-model-default", (event) =>
    setDefaultModel(event.detail?.modelId).catch((error) => toast(error.message || "设置默认模型失败")),
  );
  window.addEventListener("knowflow:react-model-delete", (event) =>
    deleteModel(event.detail?.modelId).catch((error) => toast(error.message || "删除模型失败")),
  );
}

function bindReactDocumentListBridge() {
  window.addEventListener("knowflow:react-document-chunks", (event) =>
    loadChunks(event.detail?.documentId).catch((error) => toast(error.message || "加载切片失败")),
  );
  window.addEventListener("knowflow:react-document-reindex", (event) =>
    reindexDocument(event.detail?.documentId).catch((error) => toast(error.message || "重新入库失败")),
  );
  window.addEventListener("knowflow:react-document-delete", (event) =>
    deleteDocument(event.detail?.documentId).catch((error) => toast(error.message || "删除文档失败")),
  );
  window.addEventListener("knowflow:react-document-remove-pending", (event) => removePendingDocument(event.detail?.documentId));
}

function bindReactSettingsControlsBridge() {
  window.addEventListener("knowflow:react-model-provider-input", (event) => {
    const value = String(event.detail?.value || "").trim();
    const key = providerKey(value);
    selectProviderCard(value, false);
    buildPresetOptions(key);
    if ($("#model-preset-select")) $("#model-preset-select").value = "";
  });
  window.addEventListener("knowflow:react-model-preset-change", (event) => applyModelPreset(event.detail?.value || ""));
  window.addEventListener("knowflow:react-model-cancel", () => resetModelForm());
}

async function submitModelConfigForm(form) {
  const payload = formJson(form);
  if (!payload.apiKey) delete payload.apiKey;
  if (state.editingModelId) {
    await request(`/api/model-configs/${state.editingModelId}`, { method: "PUT", body: JSON.stringify(payload) });
    toast("模型配置已更新");
  } else {
    await request("/api/model-configs", { method: "POST", body: JSON.stringify(payload) });
    toast("模型配置已保存");
  }
  resetModelForm();
  await refreshModels();
}

async function submitKnowledgeBaseForm(form) {
  await request("/api/knowledge-bases", { method: "POST", body: JSON.stringify(formJson(form)) });
  toast("知识库已创建");
  closeKnowledgeBaseModal();
  await refreshKnowledgeBases();
}

async function submitDocumentForm(form) {
  const documentFileInput = $("#document-file-input") || form.querySelector("input[type='file']");
  const kbId = $("#doc-kb-select").value || "";
  $("#doc-kb-hidden").value = kbId;
  if (!kbId) {
    toast("请先创建知识库");
    return;
  }
  const file = state.selectedDocumentFile || documentFileInput?.files?.[0];
  if (!file?.name) {
    toast("请先选择一个文档");
    return;
  }
  try {
    validateClientUploadFile(file);
  } catch (error) {
    toast(error.message || "文件不可用");
    return;
  }

  const tempId = -Date.now();
  const data = new FormData();
  data.append("knowledgeBaseId", kbId);
  data.append("file", file);
  upsertPendingDocument(optimisticDocument(file, tempId, kbId));
  renderDocuments();

  try {
    const result = await request(`/api/knowledge-bases/${kbId}/documents`, { method: "POST", body: data });
    markPendingDocumentProcessing(tempId, result);
    toast("文档已上传，后台入库中");
    form.reset();
    clearSelectedDocumentFile();
    closeUploadModal();
    await refreshKnowledgeBases();
    await refreshDocuments();
  } catch (error) {
    failPendingDocument(tempId, error.message || "上传失败");
    renderDocuments();
    toast("上传失败：" + (error.message || "未知错误"));
  }
}

function handleSelectedDocumentFile(file) {
  try {
    if (file) validateClientUploadFile(file);
    setSelectedDocumentFile(file);
  } catch (error) {
    toast(error.message || "文件不可用");
    clearSelectedDocumentFile();
  }
}

async function submitRetrievalForm(form) {
  notifyReactRetrievalLoading();
  let result;
  try {
    result = await request("/api/retrieval/debug", { method: "POST", body: JSON.stringify(formJson(form)) });
  } catch (error) {
    notifyReactRetrievalResultsUpdated([]);
    throw error;
  }
  if (notifyReactRetrievalResultsUpdated(result.chunks || [])) return;
  $("#retrieval-list").innerHTML =
    result.chunks
      .map(
        (chunk) => `
          <article class="item">
            <h3>${escapeHtml(chunk.filename)} · 相似度 ${Number(chunk.score || 0).toFixed(3)}</h3>
            <p>${escapeHtml(chunk.content)}</p>
          </article>
        `
      )
      .join("") || '<p class="empty-state">没有检索到片段。</p>';
}

function notifyReactRetrievalLoading() {
  if (!window.__knowflowReactRetrievalResultsEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-retrieval-loading"));
  return true;
}

function notifyReactRetrievalResultsUpdated(chunks) {
  if (!window.__knowflowReactRetrievalResultsEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-retrieval-results-updated", { detail: { chunks } }));
  return true;
}

async function handleDocumentKnowledgeBaseSelection(value) {
  state.selectedKnowledgeBaseId = Number(value || 0) || null;
  if ($("#doc-kb-hidden")) $("#doc-kb-hidden").value = value || "";
  notifyReactKnowledgeSelectionUpdated(state.selectedKnowledgeBaseId, {
    selectedDocumentKnowledgeBaseId: value || "",
    selectedRetrievalKnowledgeBaseId: value || "",
  });
  renderKnowledgeBaseDetail();
  await refreshDocuments();
}

function handleRetrievalKnowledgeBaseSelection(value) {
  notifyReactKnowledgeSelectionUpdated(undefined, {
    selectedRetrievalKnowledgeBaseId: value || "",
  });
}

function bindReactFormActionsBridge() {
  window.addEventListener("knowflow:react-model-submit", (event) =>
    submitModelConfigForm(event.detail?.form).catch((error) => toast(error.message || "保存失败")),
  );
  window.addEventListener("knowflow:react-kb-submit", (event) =>
    submitKnowledgeBaseForm(event.detail?.form).catch((error) => toast(error.message || "创建失败")),
  );
  window.addEventListener("knowflow:react-document-submit", (event) =>
    submitDocumentForm(event.detail?.form).catch((error) => toast(error.message || "上传失败")),
  );
  window.addEventListener("knowflow:react-retrieval-submit", (event) =>
    submitRetrievalForm(event.detail?.form).catch((error) => toast(error.message || "检索失败")),
  );
  window.addEventListener("knowflow:react-document-kb-change", (event) =>
    handleDocumentKnowledgeBaseSelection(event.detail?.value || "").catch((error) => toast(error.message || "刷新文档失败")),
  );
  window.addEventListener("knowflow:react-retrieval-kb-change", (event) => handleRetrievalKnowledgeBaseSelection(event.detail?.value || ""));
  window.addEventListener("knowflow:react-chat-submit", () => submitChat().catch((error) => toast(error.message || "发送失败")));
}

function bindReactChatInputBridge() {
  window.addEventListener("knowflow:react-chat-input", () => resizeComposer());
  window.addEventListener("knowflow:react-chat-paste", (event) =>
    handleComposerPaste(event.detail || {}).catch((error) => toast(error.message || "粘贴失败")),
  );
  window.addEventListener("knowflow:react-chat-enter-submit", () =>
    submitChat().catch((error) => toast(error.message || "发送失败")),
  );
}

function bindReactDocumentUploadBridge() {
  window.addEventListener("knowflow:react-document-file-select", (event) => {
    handleSelectedDocumentFile(event.detail?.file || null);
  });
}

function bindReactAttachmentTrayBridge() {
  window.addEventListener("knowflow:react-attachment-remove", (event) => removeChatAttachment(event.detail?.attachmentId));
}

function formJson(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  for (const key of ["temperature", "topP"]) {
    if (data[key] !== undefined && data[key] !== "") data[key] = Number(data[key]);
  }
  for (const key of ["maxTokens", "embeddingModelConfigId", "knowledgeBaseId", "topK"]) {
    if (data[key] !== undefined && data[key] !== "") data[key] = Number(data[key]);
  }
  return data;
}

function restoreSelectValue(selector, value, fallback = "") {
  const select = $(selector);
  if (!select) return;
  const wanted = value === undefined || value === null ? "" : String(value);
  const options = Array.from(select.options);
  if (options.some((option) => option.value === wanted)) {
    select.value = wanted;
    return;
  }
  if (options.some((option) => option.value === String(fallback))) {
    select.value = String(fallback);
  }
}

function optionHtml(items, labelFn) {
  return items.map((item) => `<option value="${item.id}">${escapeHtml(labelFn(item))}</option>`).join("");
}

function switchPage(page) {
  $all(".nav-item, .sidebar-tool").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  $all(".page").forEach((section) => section.classList.toggle("active", section.id === `page-${page}`));
}

function toggleSidebar() {
  const sidebar = $("#sidebar");
  const collapsed = !sidebar.classList.contains("collapsed");
  applySidebarState(collapsed);
  localStorage.setItem("knowflow.sidebarCollapsed", collapsed ? "1" : "0");
  setTimeout(() => $("#chat-form textarea")?.focus(), 80);
}

function applySidebarState(collapsed) {
  const sidebar = $("#sidebar");
  if (!sidebar) return;
  sidebar.classList.toggle("collapsed", collapsed);
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  const toggle = $("#sidebar-toggle");
  if (toggle) {
    toggle.textContent = collapsed ? "›" : "‹";
    toggle.title = collapsed ? "展开侧边栏" : "收起侧边栏";
    toggle.setAttribute("aria-label", collapsed ? "展开侧边栏" : "收起侧边栏");
  }
}

function toggleDrawer(forceCollapsed) {
  const collapsed = typeof forceCollapsed === "boolean" ? forceCollapsed : !document.body.classList.contains("drawer-collapsed");
  document.body.classList.toggle("drawer-collapsed", collapsed);
  localStorage.setItem("knowflow.drawerCollapsed", collapsed ? "1" : "0");
}

function initLayout() {
  const sidebarLayoutVersion = "20260522-chatgpt-sidebar";
  if (localStorage.getItem("knowflow.sidebarLayoutVersion") !== sidebarLayoutVersion) {
    localStorage.setItem("knowflow.sidebarLayoutVersion", sidebarLayoutVersion);
    localStorage.setItem("knowflow.sidebarCollapsed", "0");
  }
  const storedSidebar = localStorage.getItem("knowflow.sidebarCollapsed");
  applySidebarState(storedSidebar === null ? false : storedSidebar === "1");
  const storedDrawer = localStorage.getItem("knowflow.drawerCollapsed");
  toggleDrawer(storedDrawer === null ? true : storedDrawer === "1");
}

function notifyReactRuntimeUpdated(runtime) {
  if (!window.__knowflowReactRuntimeStatusEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-runtime-updated", { detail: { runtime } }));
  return true;
}

function notifyReactRuntimeFailed() {
  if (!window.__knowflowReactRuntimeStatusEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-runtime-failed"));
  return true;
}

function renderRuntime(runtime) {
  if (notifyReactRuntimeUpdated(runtime)) return;
  $("#runtime-box").innerHTML = `
    <div><strong>数据库</strong> ${escapeHtml(runtime.database)}</div>
    <div><strong>向量库</strong> ${escapeHtml(runtime.vectorBackend)}</div>
  `;
}

function providerKey(provider) {
  return PROVIDER_PRESETS[provider] ? provider : "custom";
}

function selectProviderCard(provider, syncInput = true) {
  const key = providerKey(provider);
  if (syncInput) $("#model-provider").value = provider === "custom" ? "" : provider;
  $all(".provider-card").forEach((button) => button.classList.toggle("selected", button.dataset.provider === key));
}

function buildPresetOptions(provider) {
  const key = providerKey(provider);
  const presets = PROVIDER_PRESETS[key]?.models || [];
  const select = $("#model-preset-select");
  select.innerHTML =
    '<option value="">手动填写模型名</option>' +
    presets.map((preset, index) => `<option value="${key}:${index}">${escapeHtml(preset.label)}</option>`).join("");
  select.disabled = !presets.length;
}

function applyProviderPreset(provider) {
  const key = providerKey(provider);
  const preset = PROVIDER_PRESETS[key] || PROVIDER_PRESETS.custom;
  const form = $("#model-form");
  selectProviderCard(key);
  buildPresetOptions(key);
  if (key === "custom") {
    form.elements.provider.value = "";
    form.elements.name.value = "自定义模型";
    form.elements.modelName.value = "";
    form.elements.baseUrl.value = "";
    form.elements.temperature.value = "0.7";
    form.elements.topP.value = "0.9";
    form.elements.maxTokens.value = "4096";
    form.elements.provider.focus();
    return;
  }
  form.elements.provider.value = key;
  form.elements.baseUrl.value = preset.baseUrl;
  if (preset.models.length) {
    $("#model-preset-select").value = `${key}:0`;
    applyModelPreset(`${key}:0`);
  }
}

function applyModelPreset(value) {
  if (!value) return;
  const [provider, indexText] = value.split(":");
  const preset = PROVIDER_PRESETS[provider]?.models?.[Number(indexText)];
  if (!preset) return;
  const form = $("#model-form");
  selectProviderCard(provider);
  form.elements.provider.value = provider;
  form.elements.name.value = preset.name;
  form.elements.modelType.value = preset.modelType;
  form.elements.baseUrl.value = PROVIDER_PRESETS[provider].baseUrl;
  form.elements.modelName.value = preset.modelName;
  form.elements.temperature.value = preset.temperature ?? "";
  form.elements.topP.value = preset.topP ?? "";
  form.elements.maxTokens.value = preset.maxTokens ?? "";
}

function renderModels() {
  const current = $("#chat-model-select")?.value || "";
  const currentEmbedding = $("#kb-embedding-select")?.value || "";
  const chatModels = state.models.filter((model) => model.modelType === "chat");
  const embeddingModels = state.models.filter((model) => model.modelType === "embedding");

  const reactOwnsModelOptions = notifyReactModelOptionsUpdated(state.models, current, currentEmbedding);
  if (!reactOwnsModelOptions) {
    $("#chat-model-select").innerHTML =
      optionHtml(chatModels, (model) => `${model.name} / ${model.modelName}`) || '<option value="">本地备用模型</option>';
    restoreSelectValue("#chat-model-select", current);
    syncComposerSelectsFromMain();

    $("#kb-embedding-select").innerHTML =
      optionHtml(embeddingModels.length ? embeddingModels : state.models, (model) => `${model.name} / ${model.modelName}`) ||
      '<option value="0">本地 Hash 向量</option>';
  }

  if (window.__knowflowReactModelListEnabled) {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-models-updated", { detail: { models: state.models } }));
    return;
  }

  $("#model-list").innerHTML =
    state.models
      .map((model) => {
        const provider = PROVIDER_PRESETS[model.provider]?.label || model.provider;
        const statusClass = model.status === "available" ? "ok" : model.status === "unavailable" ? "warn" : "";
        return `
          <article class="item">
            <div class="item-head">
              <div>
                <h3>${escapeHtml(model.name)}</h3>
                <p>${escapeHtml(provider)} / ${escapeHtml(labelOf(MODEL_TYPE_TEXT, model.modelType))} / ${escapeHtml(model.modelName)}</p>
                <p>密钥 ${escapeHtml(model.apiKeyMasked || "未配置")} · <span class="badge ${statusClass}">${escapeHtml(labelOf(STATUS_TEXT, model.status))}</span> ${model.isDefault ? '<span class="badge ok">默认</span>' : ""}</p>
              </div>
              <div class="actions">
                <button type="button" onclick="editModel(${model.id})">编辑</button>
                <button type="button" onclick="testModel(${model.id})">测试</button>
                <button type="button" onclick="setDefaultModel(${model.id})">默认</button>
                <button type="button" class="danger" onclick="deleteModel(${model.id})">删除</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || '<p class="empty-state">还没有模型配置。先添加一个 DeepSeek、OpenAI 或 MiMo 模型。</p>';
}

function getSelectedKnowledgeBase() {
  const selectValue = $("#doc-kb-select")?.value;
  return (
    state.knowledgeBases.find((kb) => kb.id === state.selectedKnowledgeBaseId) ||
    state.knowledgeBases.find((kb) => String(kb.id) === String(selectValue || "")) ||
    state.knowledgeBases[0] ||
    null
  );
}

function renderKnowledgeBases() {
  const currentDocKb = $("#doc-kb-select")?.value || "";
  const currentChatKb = $("#chat-kb-select")?.value || "";
  const currentRetrievalKb = $("#retrieval-kb-select")?.value || "";
  const options = optionHtml(state.knowledgeBases, (kb) => kb.name);

  const selectedExists = state.knowledgeBases.some((kb) => kb.id === state.selectedKnowledgeBaseId);
  if (!selectedExists) {
    state.selectedKnowledgeBaseId = Number(currentDocKb || 0) || state.knowledgeBases[0]?.id || null;
  }

  const selectedDocumentKnowledgeBaseId = currentDocKb || state.selectedKnowledgeBaseId || state.knowledgeBases[0]?.id || "";
  const selectedRetrievalKnowledgeBaseId = currentRetrievalKb || state.selectedKnowledgeBaseId || state.knowledgeBases[0]?.id || "";
  const reactOwnsKnowledgeOptions = notifyReactKnowledgeOptionsUpdated(state.knowledgeBases, state.selectedKnowledgeBaseId, {
    selectedChatKnowledgeBaseId: currentChatKb,
    selectedDocumentKnowledgeBaseId,
    selectedRetrievalKnowledgeBaseId,
  });
  if (!reactOwnsKnowledgeOptions) {
    $("#chat-kb-select").innerHTML = '<option value="">不使用知识库</option>' + options;
    $("#doc-kb-select").innerHTML = options || '<option value="">暂无知识库</option>';
    $("#retrieval-kb-select").innerHTML = options || '<option value="">暂无知识库</option>';

    restoreSelectValue("#chat-kb-select", currentChatKb, "");
    restoreSelectValue("#doc-kb-select", currentDocKb, state.selectedKnowledgeBaseId || state.knowledgeBases[0]?.id || "");
    restoreSelectValue("#retrieval-kb-select", currentRetrievalKb, state.selectedKnowledgeBaseId || state.knowledgeBases[0]?.id || "");
    if ($("#doc-kb-hidden")) $("#doc-kb-hidden").value = $("#doc-kb-select").value || "";
    syncComposerSelectsFromMain();
  }
  renderToolStatus();

  if (window.__knowflowReactKnowledgeListEnabled) {
    window.dispatchEvent(
      new CustomEvent("knowflow:legacy-knowledge-bases-updated", {
        detail: {
          knowledgeBases: state.knowledgeBases,
          selectedKnowledgeBaseId: state.selectedKnowledgeBaseId,
        },
      }),
    );
    renderKnowledgeBaseDetail();
    return;
  }

  const keyword = (state.kbSearch || "").trim().toLowerCase();
  const bases = keyword
    ? state.knowledgeBases.filter((kb) => `${kb.name || ""} ${kb.description || ""}`.toLowerCase().includes(keyword))
    : state.knowledgeBases;

  $("#kb-list").innerHTML =
    bases
      .map((kb) => {
        const active = kb.id === state.selectedKnowledgeBaseId ? " active" : "";
        return `
          <article class="kb-row${active}" data-kb-row="${kb.id}">
            <button class="kb-row-main" type="button" onclick="selectKnowledgeBase(${kb.id})">
              <span class="kb-row-title">${escapeHtml(kb.name)}</span>
              <span class="kb-row-desc">${escapeHtml(kb.description || "暂无描述")}</span>
              <span class="kb-row-meta">${kb.document_count} 个文档 · ${kb.chunk_count} 个切片</span>
            </button>
            <button class="session-menu-button" type="button" onclick="toggleKnowledgeMenu(event, ${kb.id})" aria-label="知识库操作">···</button>
            <div class="session-popover kb-popover">
              <button type="button" onclick="selectKnowledgeBase(${kb.id})">打开</button>
              <button type="button" onclick="openRetrievalDrawer(${kb.id})">检索调试</button>
              <button class="danger" type="button" onclick="deleteKnowledgeBase(${kb.id})">删除</button>
            </div>
          </article>
        `;
      })
      .join("") || '<p class="empty-state">暂无知识库。点击右上角新建一个知识空间。</p>';

  renderKnowledgeBaseDetail();
}

function renderKnowledgeBaseDetail() {
  const selected = getSelectedKnowledgeBase();
  if (window.__knowflowReactKnowledgeDetailEnabled) {
    state.selectedKnowledgeBaseId = selected?.id || null;
    const embeddingModel = selected
      ? state.models.find((model) => Number(model.id) === Number(selected.embedding_model_config_id))
      : null;
    window.dispatchEvent(
      new CustomEvent("knowflow:legacy-knowledge-detail-updated", {
        detail: {
          selectedKnowledgeBase: selected || null,
          embeddingModel: embeddingModel || null,
        },
      }),
    );
    return;
  }
  if (!selected) {
    $("#kb-detail").innerHTML = '<p class="empty-state">当前还没有知识库。</p>';
    return;
  }
  state.selectedKnowledgeBaseId = selected.id;
  const embeddingModel = state.models.find((model) => Number(model.id) === Number(selected.embedding_model_config_id));
  $("#kb-detail").innerHTML = `
    <div class="metric"><span>当前知识库</span><strong>${escapeHtml(selected.name)}</strong></div>
    <div class="metric"><span>文档数</span><strong>${selected.document_count}</strong></div>
    <div class="metric"><span>切片数</span><strong>${selected.chunk_count}</strong></div>
    <div class="metric"><span>向量模型</span><strong>${escapeHtml(embeddingModel?.name || "未绑定")}</strong></div>
  `;
}

function toggleKnowledgeMenu(event, id) {
  event?.stopPropagation();
  const row = document.querySelector(`[data-kb-row="${id}"]`);
  const willOpen = !row?.classList.contains("menu-open");
  $all(".kb-row.menu-open").forEach((item) => item.classList.remove("menu-open"));
  if (willOpen) row?.classList.add("menu-open");
}

function renderDocuments() {
  if (window.__knowflowReactDocumentListEnabled) {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-documents-updated", { detail: { documents: mergePendingDocuments(state.documents) } }));
    return;
  }
  $("#document-list").innerHTML = renderDocumentRows();
}

function renderDocumentRows() {
  return (
    mergePendingDocuments(state.documents)
      .map((doc) => {
        const statusClass = doc.parse_status === "success" ? "ok" : doc.parse_status === "failed" ? "warn" : "progress";
        const retryLabel = doc.parse_status === "failed" ? "重试" : "重新入库";
        const errorBlock = doc.parse_status === "failed" && doc.error_message
          ? `<div class="document-error">失败原因：${escapeHtml(doc.error_message)}</div>`
          : "";
        const actions = Number(doc.id) > 0
          ? `
              <button type="button" onclick="loadChunks(${doc.id})">切片</button>
              <button type="button" onclick="reindexDocument(${doc.id})">${retryLabel}</button>
              <button class="danger" type="button" onclick="deleteDocument(${doc.id})">删除</button>
            `
          : doc.parse_status === "failed"
            ? `<button type="button" onclick="removePendingDocument(${doc.id})">移除</button>`
            : '<button type="button" disabled>等待入库</button>';
        return `
          <article class="document-row ${doc.temporary ? "queued-local " : ""}${escapeHtml(doc.parse_status || "")}">
            <div class="document-row-main">
              <h3>${escapeHtml(doc.filename)}</h3>
              <p>${escapeHtml(doc.file_type || "文件")} · ${formatBytes(doc.file_size)} · 更新于 ${escapeHtml(doc.updated_at || doc.created_at || "刚刚")}</p>
              ${errorBlock}
            </div>
            <div class="document-row-status">
              <span class="badge ${statusClass}">${escapeHtml(labelOf(STATUS_TEXT, doc.parse_status))}</span>
              ${renderDocumentSteps(doc)}
            </div>
            <div class="document-row-meta">
              <strong>${doc.chunk_count || 0}</strong>
              <span>切片</span>
            </div>
            <div class="document-row-actions">
              ${actions}
            </div>
          </article>
        `;
      })
      .join("") || '<p class="empty-state">暂无文档。上传资料后会在这里显示处理状态。</p>'
  );
}

function isDocumentProcessing(doc) {
  return ["uploading", "pending", "processing", "parsing", "chunking", "embedding"].includes(doc?.parse_status);
}

function renderDocumentSteps(doc) {
  const status = doc.parse_status || "pending";
  const activeIndex = DOCUMENT_STATUS_INDEX[status] ?? 0;
  return `
    <div class="document-steps">
      ${DOCUMENT_STEPS.map((step, index) => {
        const done = status === "success" ? index <= activeIndex : index < activeIndex;
        const current = status !== "success" && status !== "failed" && index === activeIndex;
        const failed = status === "failed" && index === activeIndex;
        const className = ["document-step", done ? "done" : "", current ? "current" : "", failed ? "failed" : ""].filter(Boolean).join(" ");
        return `<span class="${className}"><i></i>${step.label}</span>`;
      }).join("")}
    </div>
  `;
}

function renderReferences(references) {
  if (window.__knowflowReactEvidenceDrawerEnabled) {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-references-updated", { detail: { references } }));
    return;
  }
  $("#reference-list").innerHTML =
    references
      .map((ref) => {
        const score = Math.round(Number(ref.score || 0) * 100);
        return `
          <article class="item">
            <h3>${escapeHtml(ref.filename || `片段 #${ref.chunkId || ref.chunk_id}`)}</h3>
            <p><span class="badge ok">匹配 ${score}%</span></p>
            <p>${escapeHtml(ref.content || ref.chunk_text || "")}</p>
          </article>
        `;
      })
      .join("") || '<p class="empty-state">本次回答没有引用片段。</p>';
}

function openRetrievalDrawerFromRun(retrievalRun) {
  if (!retrievalRun?.id) return;
  toast(`检索运行 #${retrievalRun.id} 已记录，可在证据面板查看质量结果。`);
}

function renderRagQuality(ragQuality, retrievalRun) {
  if (window.__knowflowReactEvidenceDrawerEnabled) {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-rag-quality-updated", { detail: { ragQuality, retrievalRun } }));
    return;
  }
  const container = $("#rag-quality-card");
  if (!container) return;
  if (!ragQuality?.enabled) {
    container.innerHTML = "";
    return;
  }
  const level = ragQuality.qualityLevel || "no_match";
  container.innerHTML = `
    <div class="rag-quality-card">
      <span class="quality-level ${escapeHtml(level)}">${escapeHtml(level)}</span>
      <strong>RAG quality</strong>
      <p>${escapeHtml(ragQuality.reason || "已记录本次检索质量。")}</p>
      <button type="button" data-retrieval-run-id="${escapeHtml(String(retrievalRun?.id || ragQuality.retrievalRunId || ""))}">查看检索运行</button>
    </div>
  `;
}

function renderToolTimeline(calls) {
  if (window.__knowflowReactEvidenceDrawerEnabled) {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-tool-timeline-updated", { detail: { toolCalls: calls } }));
    return;
  }
  $("#tool-timeline-mini").innerHTML =
    calls
      .map((call) => {
        const name = call.toolName || call.tool_name || call.name || "knowledge_search";
        const input = call.inputJson || call.input_json || "";
        const output = call.outputText || call.output_text || call.content || "";
        const latency = call.latencyMs ?? call.latency_ms ?? 0;
        return `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div>
              <h4>${escapeHtml(labelOf(TOOL_TEXT, name, name))}</h4>
              <p>${latency ? `${latency} ms` : "已记录"}</p>
              ${input ? `<pre>${escapeHtml(typeof input === "string" ? input : JSON.stringify(input, null, 2))}</pre>` : ""}
              ${output ? `<p>${escapeHtml(output)}</p>` : ""}
            </div>
          </div>
        `;
      })
      .join("") || '<p class="empty-state">暂无检索过程。</p>';
}

function renderToolStatus() {
  updateComposerContextSummary();
}

function renderAttachmentTray() {
  const tray = $("#attachment-tray");
  if (!tray) return;
  if (window.__knowflowReactAttachmentTrayEnabled) {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-attachments-updated", { detail: { attachments: state.chatAttachments } }));
    return;
  }
  tray.innerHTML = state.chatAttachments
    .map(
      (attachment) => {
        const preview = attachment.previewUrl
          ? `<img class="attachment-thumb" src="${escapeHtml(attachment.previewUrl)}" alt="" />`
          : `<span class="attachment-thumb attachment-file-thumb">${escapeHtml((attachment.fileType || "file").slice(0, 3).toUpperCase())}</span>`;
        return `
        <span class="attachment-pill">
          ${preview}
          <span>${escapeHtml(attachment.filename)}</span>
          <button type="button" title="移除附件" onclick="removeChatAttachment('${attachment.attachmentId}')">x</button>
        </span>
      `;
      }
    )
    .join("");
}

function renderActiveSession() {
  const sessionId = state.currentSessionId || "";
  if (window.__knowflowReactActiveSessionEnabled) {
    window.dispatchEvent(new CustomEvent("knowflow:legacy-active-session-updated", { detail: { sessionId } }));
    return;
  }
  const activeSession = $("#active-session");
  if (activeSession) activeSession.value = sessionId;
}

function toggleComposerMenu(force) {
  const menu = $("#composer-menu");
  const button = $("#composer-plus-btn");
  const open = force === undefined ? !menu.classList.contains("open") : Boolean(force);
  menu.classList.toggle("open", open);
  button.classList.toggle("active", open);
}

async function uploadChatAttachment(file) {
  validateClientUploadFile(file);
  const data = new FormData();
  data.append("file", file);
  const attachment = await request("/api/chat/attachments", { method: "POST", body: data });
  state.chatAttachments.push(attachment);
  renderAttachmentTray();
  toast(`已添加附件：${attachment.filename}`);
}

async function handleComposerPaste(event) {
  const clipboardData = event.clipboardData;
  const items = Array.from(clipboardData ? clipboardData.items : []);
  const imageItems = items.filter((item) => item.kind === "file" && item.type.startsWith("image/"));
  if (!imageItems.length) return;

  event.preventDefault();
  try {
    for (const [index, item] of imageItems.entries()) {
      const file = item.getAsFile();
      if (!file) continue;
      const rawExt = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const ext = rawExt.includes("+") ? "png" : rawExt;
      const namedFile = new File([file], `screenshot-${Date.now()}-${index + 1}.${ext}`, { type: file.type || "image/png" });
      await uploadChatAttachment(namedFile);
    }
    toggleComposerMenu(false);
  } catch (error) {
    toast("截图粘贴失败：" + (error.message || "未知错误"));
  }
}

function removeChatAttachment(attachmentId) {
  state.chatAttachments = state.chatAttachments.filter((item) => item.attachmentId !== attachmentId);
  renderAttachmentTray();
}

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function fileSuffix(filename) {
  const name = String(filename || "");
  const dotIndex = name.lastIndexOf(".");
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
}

function validateClientUploadFile(file) {
  if (!file?.name) throw new Error("请选择文件");
  const suffix = fileSuffix(file.name);
  if (!CLIENT_ALLOWED_SUFFIXES.has(suffix)) {
    throw new Error(`暂不支持 ${suffix || "无扩展名"} 文件`);
  }
  if (file.size > MAX_CLIENT_UPLOAD_SIZE) {
    throw new Error(`文件不能超过 ${formatBytes(MAX_CLIENT_UPLOAD_SIZE)}`);
  }
}

function groupSessions(sessions) {
  const groups = { today: [], recent: [], earlier: [] };
  const now = new Date();
  sessions.forEach((session) => {
    const time = new Date(String(session.updated_at || session.created_at || "").replace(" ", "T"));
    if (Number.isNaN(time.getTime())) {
      groups.earlier.push(session);
      return;
    }
    const days = Math.floor((now - time) / 86400000);
    if (days <= 0) groups.today.push(session);
    else if (days <= 7) groups.recent.push(session);
    else groups.earlier.push(session);
  });
  return groups;
}

function filterSessions() {
  const keyword = ($("#sidebar-session-search")?.value || "").trim().toLowerCase();
  if (!keyword) return state.sessions;
  return state.sessions.filter((session) => {
    const haystack = `${session.title || ""} ${session.id || ""} ${session.updated_at || ""}`.toLowerCase();
    return haystack.includes(keyword);
  });
}

function renderSessionWorkspace() {
  renderSessions(state.sessions);
}

function notifyReactSessionsUpdated() {
  window.dispatchEvent(
    new CustomEvent("knowflow:legacy-sessions-updated", {
      detail: {
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      },
    }),
  );
}

function renderHistorySession(session) {
  const active = session.id === state.currentSessionId ? " active" : "";
  return `
    <div class="session-row${active}">
      <button class="sidebar-list-item" type="button" onclick="continueSession('${session.id}')">
        <span>${escapeHtml(session.title || "新会话")}</span>
        <small>${escapeHtml(session.updated_at || "")}</small>
      </button>
      <button class="session-menu-button" type="button" title="会话操作" onclick="toggleSessionMenu(event)">...</button>
      <div class="session-popover">
        <button type="button" onclick="continueSession('${session.id}')">继续对话</button>
        <button type="button" onclick="renameSession('${session.id}')">重命名</button>
        <button class="danger" type="button" onclick="deleteSession('${session.id}')">删除</button>
      </div>
    </div>
  `;
}

function toggleSessionMenu(event) {
  event.stopPropagation();
  const row = event.currentTarget.closest(".session-row");
  const shouldOpen = !row.classList.contains("menu-open");
  $all(".session-row.menu-open").forEach((item) => item.classList.remove("menu-open"));
  row.classList.toggle("menu-open", shouldOpen);
}

async function renameSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  const title = window.prompt("重命名会话", session?.title || "新会话");
  if (!title || !title.trim()) return;
  await request(`/api/sessions/${sessionId}`, { method: "PUT", body: JSON.stringify({ title: title.trim() }) });
  toast("会话已重命名");
  await refreshSessions();
}

function renderSessions(sessions) {
  state.sessions = sessions;
  if (window.__knowflowReactSessionListEnabled) {
    notifyReactSessionsUpdated();
    return;
  }
  const filtered = filterSessions();
  const groups = groupSessions(filtered);
  const groupDefs = [
    ["today", "今天"],
    ["recent", "最近 7 天"],
    ["earlier", "更早"],
  ];
  $("#session-list").innerHTML =
    groupDefs
      .filter(([key]) => groups[key].length)
      .map(
        ([key, label]) => `
          <section class="history-group">
            <div class="history-group-title">${label}</div>
            ${groups[key].map((session) => renderHistorySession(session)).join("")}
          </section>
        `
      )
      .join("") || '<p class="empty-state">暂无会话</p>';
}

function clearWelcome() {
  const welcome = $(".welcome-card");
  if (welcome) welcome.remove();
}

function appendMessage(role, content, options = {}) {
  const reactBubble = appendReactMessage(role, content, options);
  if (reactBubble) return reactBubble;
  clearWelcome();
  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  if (options.thinking) {
    row.classList.add("thinking-row");
    setMessageThinking(bubble, true);
  } else {
    setMessageContent(bubble, role, content);
  }
  row.appendChild(bubble);
  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "复制";
    if (window.__knowflowReactMessageActionsEnabled) {
      copy.dataset.messageAction = "copy";
    } else {
      copy.addEventListener("click", () =>
        copyAssistantMessageContent(getAssistantMessageContent(bubble)).catch(() => toast("复制失败")),
      );
    }
    actions.appendChild(copy);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-answer-button";
    retry.textContent = "重试";
    if (window.__knowflowReactMessageActionsEnabled) {
      retry.dataset.messageAction = "retry";
    } else {
      retry.addEventListener("click", () => retryLastAnswer().catch((error) => toast(error.message || "重试失败")));
    }
    actions.appendChild(retry);
    row.appendChild(actions);
  }
  $("#chat-messages").appendChild(row);
  $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
  return bubble;
}

function setSending(sending) {
  state.sending = sending;
  if (notifyReactSendingUpdated(sending)) return;
  const submit = $("#chat-form button[type='submit']");
  const input = $("#chat-form textarea");
  const plus = $("#composer-plus-btn");
  if (submit) submit.disabled = false;
  if (input) input.disabled = sending;
  if (plus) plus.disabled = sending;
  renderSendButton(sending);
}

function resizeComposer() {
  const input = $("#chat-form textarea");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

async function refreshRuntime() {
  try {
    const runtime = await request("/api/runtime");
    renderRuntime(runtime);
  } catch (error) {
    if (notifyReactRuntimeFailed()) return;
    $("#runtime-box").textContent = "运行状态读取失败";
  }
}

async function refreshModels() {
  state.models = await request("/api/model-configs");
  renderModels();
}

async function refreshKnowledgeBases() {
  state.knowledgeBases = await request("/api/knowledge-bases");
  renderKnowledgeBases();
}

async function refreshDocuments() {
  const kbId = $("#doc-kb-select").value;
  state.documents = kbId ? await request(`/api/knowledge-bases/${kbId}/documents`) : [];
  clearResolvedPendingDocuments(state.documents);
  renderDocuments();
  scheduleDocumentPolling();
}

function notifyReactKnowledgeTabChange(tab) {
  if (!window.__knowflowReactKnowledgeWorkspaceEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-knowledge-tab-change", { detail: { tab } }));
  return true;
}

function scheduleDocumentPolling() {
  if (state.documentPoller) {
    window.clearTimeout(state.documentPoller);
    state.documentPoller = null;
  }
  if (![...state.documents, ...state.pendingDocuments].some(isDocumentProcessing)) return;
  state.documentPoller = window.setTimeout(async () => {
    state.documentPoller = null;
    try {
      await refreshDocuments();
      await refreshKnowledgeBases();
    } catch (error) {
      toast(error.message);
    }
  }, 1400);
}

function setupKnowledgePageWorkspace() {
  document.body.dataset.knowledgeWorkspace = "ready";
  if (!window.__knowflowReactKnowledgeWorkspaceEnabled) {
    switchKnowledgeTab(state.knowledgeTab || "documents");
  }
}

let setupComposerControls = function () {
  const form = $("#chat-form");
  const shell = form?.querySelector(".composer-shell");
  if (!form || !shell || form.dataset.composerReady === "ready") return;
  form.dataset.composerReady = "ready";

  const submit = shell.querySelector("button[type='submit']");
  if (submit) {
    submit.id = "chat-submit-btn";
    submit.classList.add("composer-send-button");
    renderSendButton(false);
  }

  on("#composer-kb-select", "change", () => {
    syncMainSelectFromComposer("#composer-kb-select", "#chat-kb-select");
    renderToolStatus();
  });
  syncComposerSelectsFromMain();
}

function switchKnowledgeTab(tab = "documents") {
  state.knowledgeTab = tab;
  if (notifyReactKnowledgeTabChange(tab)) return;
  $all("[data-kb-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.kbTab === tab);
  });
  $all("[data-kb-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.kbTabPanel === tab);
  });
}

function notifyReactUploadModalOpen() {
  if (!window.__knowflowReactUploadModalEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-upload-modal-open"));
  return true;
}

function notifyReactUploadModalClose() {
  if (!window.__knowflowReactUploadModalEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-upload-modal-close"));
  return true;
}

function setupKnowledgeUploadModal() {
  document.body.dataset.uploadModal = "react";
}

function openUploadModal() {
  if (notifyReactUploadModalOpen()) return;
  setupKnowledgeUploadModal();
  const modal = document.getElementById("upload-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeUploadModal() {
  if (notifyReactUploadModalClose()) return;
  document.getElementById("upload-modal")?.classList.add("hidden");
}

async function refreshSessions() {
  const sessions = await request("/api/sessions");
  renderSessions(sessions);
}

async function refresh() {
  await refreshRuntime();
  await refreshModels();
  await refreshKnowledgeBases();
  await refreshDocuments();
  await refreshSessions();
}

async function editModel(id) {
  const model = await request(`/api/model-configs/${id}`);
  state.editingModelId = id;
  const form = $("#model-form");
  selectProviderCard(model.provider);
  buildPresetOptions(model.provider);
  $("#model-preset-select").value = "";
  form.elements.name.value = model.name;
  form.elements.modelType.value = model.modelType;
  form.elements.baseUrl.value = model.baseUrl;
  form.elements.apiKey.value = "";
  form.elements.modelName.value = model.modelName;
  form.elements.temperature.value = model.temperature ?? "";
  form.elements.topP.value = model.topP ?? "";
  form.elements.maxTokens.value = model.maxTokens ?? "";
  $("#model-form-title").textContent = "编辑模型配置";
  $("#model-submit-btn").textContent = "更新配置";
  switchPage("settings");
}

function resetModelForm() {
  state.editingModelId = null;
  $("#model-form").reset();
  $("#model-form-title").textContent = "新增模型配置";
  $("#model-submit-btn").textContent = "保存配置";
  applyProviderPreset("deepseek");
}

async function testModel(id) {
  const result = await request(`/api/model-configs/${id}/test`, { method: "POST" });
  toast(result.message || "模型连接测试完成");
  await refreshModels();
}

async function setDefaultModel(id) {
  await request(`/api/model-configs/${id}/default`, { method: "POST" });
  toast("默认模型已更新");
  await refreshModels();
}

async function deleteModel(id) {
  await request(`/api/model-configs/${id}`, { method: "DELETE" });
  toast("模型配置已删除");
  await refreshModels();
}

async function selectKnowledgeBase(id) {
  state.selectedKnowledgeBaseId = id;
  restoreSelectValue("#doc-kb-select", id);
  restoreSelectValue("#retrieval-kb-select", id);
  restoreSelectValue("#chat-kb-select", id);
  syncComposerSelectsFromMain();
  notifyReactKnowledgeSelectionUpdated(id, {
    selectedChatKnowledgeBaseId: id || "",
    selectedDocumentKnowledgeBaseId: id || "",
    selectedRetrievalKnowledgeBaseId: id || "",
  });
  renderKnowledgeBaseDetail();
  if (window.__knowflowReactKnowledgeListEnabled) {
    window.dispatchEvent(
      new CustomEvent("knowflow:legacy-knowledge-bases-updated", {
        detail: {
          knowledgeBases: state.knowledgeBases,
          selectedKnowledgeBaseId: state.selectedKnowledgeBaseId,
        },
      }),
    );
  }
  await refreshDocuments();
  switchPage("knowledge");
}

async function deleteKnowledgeBase(id) {
  await request(`/api/knowledge-bases/${id}`, { method: "DELETE" });
  if (state.selectedKnowledgeBaseId === id) state.selectedKnowledgeBaseId = null;
  toast("知识库已删除");
  await refreshKnowledgeBases();
  await refreshDocuments();
}

function openKnowledgeBaseModal() {
  setupKnowledgePageWorkspace();
  const modal = document.getElementById("kb-create-modal") || document.getElementById("kb-modal");
  modal?.classList.remove("hidden");
  window.setTimeout(() => document.querySelector("#kb-form input[name='name']")?.focus(), 30);
}

function closeKnowledgeBaseModal() {
  document.getElementById("kb-create-modal")?.classList.add("hidden");
  document.getElementById("kb-modal")?.classList.add("hidden");
}

function openRetrievalDrawer(knowledgeBaseId = null) {
  if (knowledgeBaseId) {
    state.selectedKnowledgeBaseId = Number(knowledgeBaseId);
    restoreSelectValue("#retrieval-kb-select", knowledgeBaseId);
    restoreSelectValue("#doc-kb-select", knowledgeBaseId);
    restoreSelectValue("#chat-kb-select", knowledgeBaseId);
    syncComposerSelectsFromMain();
    notifyReactKnowledgeSelectionUpdated(state.selectedKnowledgeBaseId, {
      selectedChatKnowledgeBaseId: knowledgeBaseId || "",
      selectedDocumentKnowledgeBaseId: knowledgeBaseId || "",
      selectedRetrievalKnowledgeBaseId: knowledgeBaseId || "",
    });
    renderKnowledgeBaseDetail();
  }
  switchPage("knowledge");
  switchKnowledgeTab("retrieval");
  document.getElementById("retrieval-drawer")?.classList.remove("hidden");
}

function closeRetrievalDrawer() {
  $("#retrieval-drawer")?.classList.add("hidden");
}

function openChunkModal() {
  $("#chunk-modal")?.classList.remove("hidden");
}

function closeChunkModal() {
  $("#chunk-modal")?.classList.add("hidden");
}

function notifyReactChunksLoading() {
  if (!window.__knowflowReactChunkListEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-chunks-loading"));
  return true;
}

function notifyReactChunksUpdated(chunks) {
  if (!window.__knowflowReactChunkListEnabled) return false;
  window.dispatchEvent(new CustomEvent("knowflow:legacy-chunks-updated", { detail: { chunks } }));
  return true;
}

async function loadChunks(documentId) {
  openChunkModal();
  if (!notifyReactChunksLoading()) {
    $("#chunk-list").innerHTML = '<p class="empty-state">正在加载切片...</p>';
  }
  let chunks;
  try {
    chunks = await request(`/api/documents/${documentId}/chunks`);
  } catch (error) {
    notifyReactChunksUpdated([]);
    throw error;
  }
  if (notifyReactChunksUpdated(chunks)) return;
  $("#chunk-list").innerHTML =
    chunks.map((chunk) => `<div class="chunk"><strong>#${chunk.chunk_index}</strong> ${escapeHtml(chunk.chunk_text)}</div>`).join("") ||
    '<p class="empty-state">暂无切片。</p>';
}

async function reindexDocument(documentId) {
  state.documents = state.documents.map((doc) =>
    Number(doc.id) === Number(documentId) ? { ...doc, parse_status: "parsing", error_message: "", updated_at: "刚刚" } : doc
  );
  renderDocuments();
  await request(`/api/documents/${documentId}/reindex`, { method: "POST" });
  toast("文档已开始重新入库");
  await refreshKnowledgeBases();
  await refreshDocuments();
}

async function deleteDocument(documentId) {
  await request(`/api/documents/${documentId}`, { method: "DELETE" });
  toast("文档已删除");
  await refreshKnowledgeBases();
  await refreshDocuments();
}

async function continueSession(sessionId) {
  const messages = await request(`/api/sessions/${sessionId}/messages`);
  if (!resetReactChatMessages(false)) $("#chat-messages").innerHTML = "";
  messages.forEach((message) => appendMessage(message.role, message.content));
  state.currentSessionId = sessionId;
  renderActiveSession();
  renderSessionWorkspace();
  switchPage("chat");
}

async function deleteSession(sessionId) {
  await request(`/api/sessions/${sessionId}`, { method: "DELETE" });
  if (state.currentSessionId === sessionId) startNewChat();
  toast("会话已删除");
  await refreshSessions();
}

function startNewChat() {
  state.currentSessionId = null;
  renderActiveSession();
  if (!resetReactChatMessages(true)) {
    $("#chat-messages").innerHTML = `
      <div class="welcome-card">
        <div class="welcome-orb">K</div>
        <h2>把资料交给 KnowFlow，然后直接提问。</h2>
        <p>它会在需要时检索知识库、展示引用片段，并把回答保存到当前会话。</p>
      </div>
    `;
  }
  renderReferences([]);
  renderToolTimeline([]);
  $("#chat-form").reset();
  syncComposerSelectsFromMain();
  state.chatAttachments = [];
  renderAttachmentTray();
  resizeComposer();
  renderSessionWorkspace();
  switchPage("chat");
  setTimeout(() => $("#chat-form textarea")?.focus(), 80);
}

function stopChatGeneration() {
  if (!state.activeChatController || state.activeChatController.signal.aborted) return;
  state.activeChatController.abort();
}

async function retryLastAnswer() {
  if (state.sending) {
    stopChatGeneration();
    return;
  }
  if (!state.lastChatRequest) {
    toast("还没有可重试的问题");
    return;
  }
  await submitChat({ retryRequest: state.lastChatRequest });
}

async function submitChat(options = {}) {
  if (state.sending) {
    stopChatGeneration();
    return;
  }
  const form = $("#chat-form");
  const retryRequest = options.retryRequest || null;
  let question = retryRequest?.question || String(new FormData(form).get("question") || "").trim();
  if (!question && state.chatAttachments.length) {
    question = "请总结我上传的文件。";
  }
  if (!question) return;

  const knowledgeBaseId = retryRequest?.payload?.knowledgeBaseId ?? ($("#chat-kb-select").value ? Number($("#chat-kb-select").value) : null);
  const chatModelConfigId = retryRequest?.payload?.chatModelConfigId ?? ($("#chat-model-select").value ? Number($("#chat-model-select").value) : null);
  const attachments =
    retryRequest?.payload?.attachments ||
    state.chatAttachments.map(({ filename, fileType, mimeType, content, previewUrl }) => ({
      filename,
      fileType,
      mimeType,
      content,
      previewUrl,
    }));
  const attachmentNames = attachments.map((item) => item.filename).filter(Boolean).join("、");
  const payload = {
    knowledgeBaseId,
    sessionId: state.currentSessionId,
    question,
    chatModelConfigId,
    useRag: Boolean(knowledgeBaseId),
    enableTools: false,
    autoAgent: false,
    toolMode: "auto",
    enabledTools: [],
    attachments: attachments,
  };
  if (retryRequest?.payload) {
    payload.enableTools = false;
    payload.autoAgent = false;
    payload.toolMode = "auto";
    payload.enabledTools = [];
  }
  state.lastChatRequest = { question, payload: { ...payload } };

  appendMessage("user", attachmentNames ? `${question}\n\n附件：${attachmentNames}` : question);
  const answer = appendMessage("assistant", "", { thinking: true });
  answer.classList.add("streaming");
  let answerBuffer = "";
  const controller = new AbortController();
  state.activeChatController = controller;
  setSending(true);
  renderReferences([]);
  renderToolTimeline([]);

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const references = [];
    const calls = [];
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop();
      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        const payload = JSON.parse(dataLine.slice(6));
        if (payload.type === "answer") {
          answer.classList.remove("streaming");
          answerBuffer += payload.content || "";
          setMessageContent(answer, "assistant", answerBuffer);
        }
        if (payload.type === "reference") {
          references.push(payload);
          renderReferences(references);
        }
        if (payload.type === "tool") {
          calls.push(payload);
          renderToolTimeline(calls);
        }
        if (payload.type === "quality") {
          renderRagQuality(payload.ragQuality, payload.retrievalRun);
          openRetrievalDrawerFromRun(payload.retrievalRun);
        }
        if (payload.type === "done") {
          state.currentSessionId = payload.sessionId;
          renderActiveSession();
        }
      }
    }
    if (answer.classList.contains("thinking")) {
      setMessageContent(answer, "assistant", answerBuffer || "没有收到模型输出。");
    }
    form.reset();
    syncComposerSelectsFromMain();
    state.chatAttachments = [];
    renderAttachmentTray();
    resizeComposer();
    await refreshSessions();
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      setMessageContent(answer, "assistant", answerBuffer || "已停止生成。");
      toast("已停止生成");
    } else {
      setMessageContent(answer, "assistant", "请求失败：" + (error.message || "未知错误"));
      toast("对话请求失败");
    }
  } finally {
    if (state.activeChatController === controller) state.activeChatController = null;
    answer.classList.remove("streaming");
    answer.classList.remove("thinking");
    setSending(false);
  }
}

renderSendButton = function (sending = state.sending) {
  const submit = $("#chat-submit-btn") || $("#chat-form button[type='submit']");
  if (!submit) return;
  submit.classList.toggle("is-generating", sending);
  submit.setAttribute("aria-label", sending ? "停止生成" : "发送消息");
  submit.title = sending ? "停止生成" : "发送消息";
  submit.innerHTML = sending
    ? '<span class="stop-square" aria-hidden="true"></span>'
    : '<svg class="send-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
};

updateComposerContextSummary = function () {
  const modelSelect = $("#chat-model-select");
  const kbSelect = $("#composer-kb-select") || $("#chat-kb-select");
  const summary = $("#composer-context-summary");
  if (!summary) return;
  const modelLabel = modelSelect?.selectedOptions?.[0]?.textContent?.trim() || "未选择模型";
  const kbLabel = kbSelect?.value ? kbSelect.selectedOptions?.[0]?.textContent?.trim() : "普通对话";
  summary.textContent = kbSelect?.value ? `上下文：${kbLabel}` : "普通对话，不使用知识库";
  summary.title = `${modelLabel} · ${kbLabel}`;
};

function normalizeComposerControlsLayout() {
  const form = $("#chat-form");
  const shell = form?.querySelector(".composer-shell");
  const menu = $("#composer-menu");
  if (!form || !shell || !menu) return;

  let settingsPanel = document.getElementById("composer-settings-panel");
  if (!settingsPanel) {
    settingsPanel = document.createElement("section");
    settingsPanel.id = "composer-settings-panel";
    settingsPanel.className = "composer-settings-panel";
    settingsPanel.innerHTML = `
      <div class="menu-section-title">
        <strong>知识库上下文</strong>
        <span>选择一个知识库，或者保持普通对话。</span>
      </div>
      <div class="composer-settings-grid"></div>
      <p class="composer-menu-summary" id="composer-context-summary">普通对话，不使用知识库</p>
    `;
    menu.insertBefore(settingsPanel, menu.firstChild);
  }
  if (!settingsPanel.querySelector("#composer-context-summary")) {
    const summary = document.createElement("p");
    summary.id = "composer-context-summary";
    summary.className = "composer-menu-summary";
    summary.textContent = "普通对话，不使用知识库";
    settingsPanel.appendChild(summary);
  }

  const settingsGrid = settingsPanel.querySelector(".composer-settings-grid");
  const kbSelect = $("#composer-kb-select");
  [kbSelect].forEach((select) => {
    const label = select?.closest("label");
    if (!label || !settingsGrid || settingsGrid.contains(label)) return;
    label.classList.remove("composer-select-pill", "context-pill");
    label.classList.add("menu-select-card");
    settingsGrid.appendChild(label);
  });

}

setupComposerControls = function () {
  const form = $("#chat-form");
  const shell = form?.querySelector(".composer-shell");
  if (!form || !shell || form.dataset.composerReady === "ready") return;
  form.dataset.composerReady = "ready";

  const submit = shell.querySelector("button[type='submit']");
  if (submit) {
    submit.id = "chat-submit-btn";
    submit.classList.add("composer-send-button");
    renderSendButton(false);
  }

  normalizeComposerControlsLayout();
  if (!window.__knowflowReactComposerChromeEnabled) {
    on("#composer-kb-select", "change", () => {
      syncMainSelectFromComposer("#composer-kb-select", "#chat-kb-select");
      renderToolStatus();
    });
  }
  syncComposerSelectsFromMain();
};

appendMessage = function (role, content, options = {}) {
  const reactBubble = appendReactMessage(role, content, options);
  if (reactBubble) return reactBubble;
  clearWelcome();
  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  if (options.thinking) {
    row.classList.add("thinking-row");
    setMessageThinking(bubble, true);
  } else {
    setMessageContent(bubble, role, content);
  }
  row.appendChild(bubble);
  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "复制";
    if (window.__knowflowReactMessageActionsEnabled) {
      copy.dataset.messageAction = "copy";
    } else {
      copy.addEventListener("click", () =>
        copyAssistantMessageContent(getAssistantMessageContent(bubble)).catch(() => toast("复制失败")),
      );
    }
    actions.appendChild(copy);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-answer-button";
    retry.textContent = "重试";
    if (window.__knowflowReactMessageActionsEnabled) {
      retry.dataset.messageAction = "retry";
    } else {
      retry.addEventListener("click", () => retryAnswer(bubble).catch((error) => toast(error.message || "重试失败")));
    }
    actions.appendChild(retry);
    row.appendChild(actions);
  }
  $("#chat-messages").appendChild(row);
  $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
  return bubble;
};

async function retryAnswer(targetBubble = null) {
  if (state.sending) {
    stopChatGeneration();
    return;
  }
  const fallbackBubble = $all("#chat-messages .message-row.assistant .message.assistant").at(-1) || null;
  const answerBubble = targetBubble || fallbackBubble;
  const retryRequest = answerBubble?.__retryRequest || state.lastChatRequest;
  if (!retryRequest) {
    toast("还没有可重试的问题");
    return;
  }
  await submitChat({
    retryRequest,
    replaceAnswer: answerBubble,
    suppressUserMessage: Boolean(answerBubble),
  });
}

retryLastAnswer = async function () {
  await retryAnswer();
};

submitChat = async function (options = {}) {
  if (state.sending) {
    stopChatGeneration();
    return;
  }
  const form = $("#chat-form");
  const retryRequest = options.retryRequest || null;
  const replaceAnswer = options.replaceAnswer || null;
  const suppressUserMessage = options.suppressUserMessage || Boolean(replaceAnswer);
  let question = retryRequest?.question || String(new FormData(form).get("question") || "").trim();
  if (!question && state.chatAttachments.length) {
    question = "请总结我上传的文件。";
  }
  if (!question) return;

  const knowledgeBaseId = retryRequest?.payload?.knowledgeBaseId ?? ($("#chat-kb-select").value ? Number($("#chat-kb-select").value) : null);
  const chatModelConfigId = retryRequest?.payload?.chatModelConfigId ?? ($("#chat-model-select").value ? Number($("#chat-model-select").value) : null);
  const attachments =
    retryRequest?.payload?.attachments ||
    state.chatAttachments.map(({ filename, fileType, mimeType, content, previewUrl }) => ({
      filename,
      fileType,
      mimeType,
      content,
      previewUrl,
    }));
  const attachmentNames = attachments.map((item) => item.filename).filter(Boolean).join("、");
  const payload = {
    knowledgeBaseId,
    sessionId: state.currentSessionId,
    question,
    chatModelConfigId,
    useRag: Boolean(knowledgeBaseId),
    enableTools: false,
    autoAgent: false,
    toolMode: "auto",
    enabledTools: [],
    attachments: attachments,
  };
  if (retryRequest?.payload) {
    payload.enableTools = false;
    payload.autoAgent = false;
    payload.toolMode = "auto";
    payload.enabledTools = [];
  }

  const requestSnapshot = { question, payload: { ...payload } };
  state.lastChatRequest = requestSnapshot;
  if (!suppressUserMessage) {
    appendMessage("user", attachmentNames ? `${question}\n\n附件：${attachmentNames}` : question);
  }

  const answer = replaceAnswer || appendMessage("assistant", "", { thinking: true });
  const answerRow = answer.closest(".message-row");
  answer.__retryRequest = requestSnapshot;
  if (replaceAnswer) {
    answerRow?.classList.add("thinking-row");
    answer.classList.add("streaming");
    setMessageThinking(answer, true);
  } else {
    answer.classList.add("streaming");
  }

  let answerBuffer = "";
  const controller = new AbortController();
  state.activeChatController = controller;
  setSending(true);
  renderReferences([]);
  renderToolTimeline([]);

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const references = [];
    const calls = [];
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop();
      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        const eventPayload = JSON.parse(dataLine.slice(6));
        if (eventPayload.type === "answer") {
          answer.classList.remove("streaming");
          answerBuffer += eventPayload.content || "";
          setMessageContent(answer, "assistant", answerBuffer);
        }
        if (eventPayload.type === "reference") {
          references.push(eventPayload);
          renderReferences(references);
        }
        if (eventPayload.type === "tool") {
          calls.push(eventPayload);
          renderToolTimeline(calls);
        }
        if (eventPayload.type === "quality") {
          renderRagQuality(eventPayload.ragQuality, eventPayload.retrievalRun);
          openRetrievalDrawerFromRun(eventPayload.retrievalRun);
        }
        if (eventPayload.type === "done") {
          state.currentSessionId = eventPayload.sessionId;
          renderActiveSession();
        }
      }
    }
    if (answer.classList.contains("thinking")) {
      setMessageContent(answer, "assistant", answerBuffer || "没有收到模型输出。");
    }
    if (!retryRequest) {
      form.reset();
      state.chatAttachments = [];
      renderAttachmentTray();
      resizeComposer();
    }
    syncComposerSelectsFromMain();
    await refreshSessions();
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      setMessageContent(answer, "assistant", answerBuffer || "已停止生成。");
      toast("已停止生成");
    } else {
      setMessageContent(answer, "assistant", "请求失败：" + (error.message || "未知错误"));
      toast("对话请求失败");
    }
  } finally {
    if (state.activeChatController === controller) state.activeChatController = null;
    answer.classList.remove("streaming");
    answer.classList.remove("thinking");
    answerRow?.classList.remove("thinking-row");
    setSending(false);
  }
};

function bindEvents() {
  setupKnowledgePageWorkspace();
  setupComposerControls();
  bindReactAuthBridge();
  bindReactMessageActionsBridge();
  bindReactProviderBridge();
  bindReactNavigationBridge();
  bindReactShellActionsBridge();
  bindReactKnowledgeActionsBridge();
  bindReactComposerChromeBridge();
  bindReactContextControlsBridge();
  bindReactSessionListBridge();
  bindReactModelListBridge();
  bindReactDocumentListBridge();
  bindReactSettingsControlsBridge();
  bindReactFormActionsBridge();
  bindReactChatInputBridge();
  bindReactDocumentUploadBridge();
  bindReactAttachmentTrayBridge();
  if (!window.__knowflowReactAuthEnabled) {
    on("#login-form", "submit", (event) => submitLogin(event).catch(() => {}));
    on("#register-form", "submit", (event) => submitRegister(event).catch(() => {}));
    $all("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
    on("#github-login-btn", "click", () => {
      if (state.oauthProviders.github?.enabled) window.location.href = "/api/auth/oauth/github/start";
      else toast("GitHub OAuth 尚未配置，请先在后端 .env 填写 Client ID 和 Secret");
    });
    on("#copy-github-callback-btn", "click", async () => {
      const value = $("#github-callback-url")?.textContent.trim() || "";
      try {
        await navigator.clipboard.writeText(value);
        toast("GitHub 回调地址已复制");
      } catch {
        toast(value);
      }
    });
    on("#logout-btn", "click", () => logout().catch((error) => toast(error.message || "退出失败")));
  }
  if (!window.__knowflowReactUserMenuEnabled) {
    on("#user-menu-btn", "click", (event) => {
      event.stopPropagation();
      $("#user-menu")?.classList.toggle("open");
    });
    document.addEventListener("click", () => $("#user-menu")?.classList.remove("open"));
  }

  if (!window.__knowflowReactShellActionsEnabled) {
    on("#sidebar-toggle", "click", toggleSidebar);
    on("#inspector-toggle", "click", () => toggleDrawer());
    on("#inspector-close", "click", () => toggleDrawer(true));
    on("#new-chat-btn", "click", startNewChat);
    on("#refresh-btn", "click", () => refresh().catch((error) => toast(error.message)));
  }
  if (!window.__knowflowReactComposerChromeEnabled) {
    on("#composer-plus-btn", "click", (event) => {
      event.stopPropagation();
      toggleComposerMenu();
    });
    on("#composer-menu", "click", (event) => event.stopPropagation());
    document.addEventListener("click", () => toggleComposerMenu(false));
    on("#chat-file-input", "change", async (event) => {
      const files = Array.from(event.target.files || []);
      try {
        for (const file of files) {
          await uploadChatAttachment(file);
        }
      } catch (error) {
        toast("附件上传失败：" + (error.message || "未知错误"));
      }
      event.target.value = "";
      toggleComposerMenu(false);
    });
  }
  if (!window.__knowflowReactContextControlsEnabled) {
    on("#chat-model-select", "change", syncComposerSelectsFromMain);
    on("#chat-kb-select", "change", () => {
      syncComposerSelectsFromMain();
      renderToolStatus();
    });
  }

  if (!window.__knowflowReactNavigationEnabled) {
    $all(".nav-item").forEach((button) => {
      button.addEventListener("click", () => switchPage(button.dataset.page));
    });

    $all(".mini-link, .sidebar-tool").forEach((button) => {
      if (!button.dataset.page) return;
      button.addEventListener("click", () => switchPage(button.dataset.page));
    });
  }

  if (!window.__knowflowReactContextControlsEnabled) {
    on("#sidebar-session-search", "input", () => renderSessions(state.sessions));
  }
  if (!window.__knowflowReactShellActionsEnabled) {
    on("#history-refresh-btn", "click", () => refreshSessions().catch((error) => toast(error.message)));
  }
  document.addEventListener("click", () => {
    $all(".session-row.menu-open").forEach((item) => item.classList.remove("menu-open"));
    $all(".kb-row.menu-open").forEach((item) => item.classList.remove("menu-open"));
  });

  if (!window.__knowflowReactProviderCardsEnabled) {
    $all(".provider-card").forEach((button) => {
      button.addEventListener("click", () => applyProviderPreset(button.dataset.provider));
    });
  }

  if (!window.__knowflowReactSettingsControlsEnabled) {
    on("#model-provider", "input", (event) => {
      const value = String(event.target.value || "").trim();
      const key = providerKey(value);
      selectProviderCard(value, false);
      buildPresetOptions(key);
      if ($("#model-preset-select")) $("#model-preset-select").value = "";
    });

    on("#model-preset-select", "change", (event) => applyModelPreset(event.target.value));
    on("#model-cancel-btn", "click", resetModelForm);
  }

  if (!window.__knowflowReactKnowledgeActionsEnabled) {
    on("#open-kb-modal-btn", "click", openKnowledgeBaseModal);
    on("#open-kb-modal-small-btn", "click", openKnowledgeBaseModal);
    on("#close-kb-modal-btn", "click", closeKnowledgeBaseModal);
    on("#cancel-kb-modal-btn", "click", closeKnowledgeBaseModal);
    on("#close-chunk-modal-btn", "click", closeChunkModal);
    on("#open-retrieval-drawer-btn", "click", () => openRetrievalDrawer());
    on("#open-retrieval-drawer-secondary-btn", "click", () => openRetrievalDrawer());
    on("#close-retrieval-drawer-btn", "click", closeRetrievalDrawer);
    on("#kb-search-input", "input", (event) => {
      state.kbSearch = event.target.value || "";
      renderKnowledgeBases();
    });
    $all(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) backdrop.classList.add("hidden");
      });
    });
  }

  if (!window.__knowflowReactFormActionsEnabled) {
    on("#model-form", "submit", async (event) => {
      event.preventDefault();
      await submitModelConfigForm(event.target);
    });

    on("#kb-form", "submit", async (event) => {
      event.preventDefault();
      await submitKnowledgeBaseForm(event.target);
    });
  }

  const documentFileInput = $("#document-file-input") || $("#document-form input[type='file']");
  const documentDropZone = $("#document-drop-zone") || $("#document-form .file-drop");
  if (documentFileInput && !documentFileInput.id) documentFileInput.id = "document-file-input";
  if (documentDropZone && !documentDropZone.id) documentDropZone.id = "document-drop-zone";
  if (documentDropZone && !$("#document-file-name")) {
    const fileName = document.createElement("strong");
    fileName.id = "document-file-name";
    fileName.className = "document-file-name";
    fileName.textContent = "尚未选择文件";
    documentDropZone.appendChild(fileName);
  }
  setupKnowledgeUploadModal();

  if (!window.__knowflowReactDocumentUploadEnabled) {
    on(documentFileInput, "change", (event) => {
      handleSelectedDocumentFile(event.target.files?.[0] || null);
    });

    ["dragenter", "dragover"].forEach((name) => {
      on(documentDropZone, name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        documentDropZone.classList.add("dragging");
      });
    });

    ["dragleave", "dragend"].forEach((name) => {
      on(documentDropZone, name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        documentDropZone.classList.remove("dragging");
      });
    });

    on(documentDropZone, "drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      documentDropZone.classList.remove("dragging");
      handleSelectedDocumentFile(event.dataTransfer?.files?.[0] || null);
    });
  }

  if (!window.__knowflowReactFormActionsEnabled) {
    on("#document-form", "submit", async (event) => {
      event.preventDefault();
      await submitDocumentForm(event.target);
    });

    on("#retrieval-form", "submit", async (event) => {
      event.preventDefault();
      await submitRetrievalForm(event.target);
    });

    on("#doc-kb-select", "change", async (event) => {
      await handleDocumentKnowledgeBaseSelection(event.target.value || "");
    });

    on("#chat-form", "submit", async (event) => {
      event.preventDefault();
      await submitChat();
    });
  }

  const chatInput = $("#chat-form textarea");
  if (!window.__knowflowReactChatInputEnabled) {
    on(chatInput, "input", resizeComposer);
    on(chatInput, "paste", handleComposerPaste);
    on(chatInput, "keydown", async (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await submitChat();
      }
    });
  }
}

window.editModel = editModel;
window.testModel = testModel;
window.setDefaultModel = setDefaultModel;
window.deleteModel = deleteModel;
window.selectKnowledgeBase = selectKnowledgeBase;
window.deleteKnowledgeBase = deleteKnowledgeBase;
window.toggleKnowledgeMenu = toggleKnowledgeMenu;
window.openKnowledgeBaseModal = openKnowledgeBaseModal;
window.closeKnowledgeBaseModal = closeKnowledgeBaseModal;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.openRetrievalDrawer = openRetrievalDrawer;
window.closeRetrievalDrawer = closeRetrievalDrawer;
window.openChunkModal = openChunkModal;
window.closeChunkModal = closeChunkModal;
window.loadChunks = loadChunks;
window.reindexDocument = reindexDocument;
window.deleteDocument = deleteDocument;
window.removePendingDocument = removePendingDocument;
window.continueSession = continueSession;
window.deleteSession = deleteSession;
window.toggleSessionMenu = toggleSessionMenu;
window.renameSession = renameSession;
window.switchPage = switchPage;
window.switchKnowledgeTab = switchKnowledgeTab;
window.removeChatAttachment = removeChatAttachment;
window.retryLastAnswer = retryLastAnswer;
window.stopChatGeneration = stopChatGeneration;

async function bootstrap() {
  initLayout();
  bindEvents();
  applyProviderPreset("deepseek");
  renderToolStatus();
  renderAttachmentTray();
  resizeComposer();
  const authenticated = await checkAuth();
  if (authenticated) {
    await refresh();
  }
}

function enableReactOwnershipFlags() {
  window.__knowflowReactAuthEnabled = true;
  window.__knowflowReactAuthStateEnabled = true;
  window.__knowflowReactComposerEnabled = true;
  window.__knowflowReactProviderCardsEnabled = true;
  window.__knowflowReactNavigationEnabled = true;
  window.__knowflowReactShellActionsEnabled = true;
  window.__knowflowReactKnowledgeActionsEnabled = true;
  window.__knowflowReactUserMenuEnabled = true;
  window.__knowflowReactComposerChromeEnabled = true;
  window.__knowflowReactContextControlsEnabled = true;
  window.__knowflowReactSettingsControlsEnabled = true;
  window.__knowflowReactFormActionsEnabled = true;
  window.__knowflowReactChatInputEnabled = true;
  window.__knowflowReactDocumentUploadEnabled = true;
  window.__knowflowReactSessionListEnabled = true;
  window.__knowflowReactKnowledgeListEnabled = true;
  window.__knowflowReactModelListEnabled = true;
  window.__knowflowReactDocumentListEnabled = true;
  window.__knowflowReactKnowledgeDetailEnabled = true;
  window.__knowflowReactEvidenceDrawerEnabled = true;
  window.__knowflowReactAttachmentTrayEnabled = true;
  window.__knowflowReactActiveSessionEnabled = true;
  window.__knowflowReactMessageActionsEnabled = true;
  window.__knowflowReactMessageListEnabled = true;
  window.__knowflowReactRuntimeStatusEnabled = true;
  window.__knowflowReactRetrievalResultsEnabled = true;
  window.__knowflowReactChunkListEnabled = true;
  window.__knowflowReactUploadModalEnabled = true;
  window.__knowflowReactKnowledgeWorkspaceEnabled = true;
  window.__knowflowReactModelOptionsEnabled = true;
  window.__knowflowReactKnowledgeOptionsEnabled = true;
  window.__knowflowReactSendingStateEnabled = true;
  window.__knowflowReactToastEnabled = true;
}

export function startKnowFlowController() {
  if (window.__knowflowControllerStarted) {
    return;
  }
  window.__knowflowControllerStarted = true;
  enableReactOwnershipFlags();
  bootstrap().catch((error) => {
    showAuthScreen();
    toast(error.message || "启动失败");
  });
}
