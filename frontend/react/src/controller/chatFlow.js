import { notifyAuthRequired } from "../api/client.js";
import { normalizeErrorMessage } from "../api/errors.js";

async function readStreamError(response) {
  const fallback = response.status === 401 ? "请先登录。" : "请求失败，请稍后重试。";
  const text = await response.text();
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text);
    return normalizeErrorMessage(payload.message || payload.detail?.message || payload.detail, fallback);
  } catch {
    return normalizeErrorMessage(text, fallback);
  }
}

export function createChatFlow({
  state,
  messageRetryRequests,
  request,
  toast,
  appendMessage,
  clearChatMessages,
  setMessageContent,
  setMessageThinking,
  setSending,
  renderActiveSession,
  renderAttachmentTray,
  renderReferences,
  renderRagQuality,
  renderToolTimeline,
  openRetrievalDrawerFromRun,
  requestComposerReset,
  requestReactSessionsRefresh,
  switchPage,
}) {
  async function continueSession(sessionId) {
    const messages = await request(`/api/sessions/${sessionId}/messages`);
    clearChatMessages(false);
    messages.forEach((message) => appendMessage(message.role, message.content));
    state.currentSessionId = sessionId;
    renderActiveSession();
    requestReactSessionsRefresh();
    switchPage("chat");
  }

  function startNewChat() {
    state.currentSessionId = null;
    renderActiveSession();
    clearChatMessages(true);
    renderReferences([]);
    renderToolTimeline([]);
    requestComposerReset({ focus: true });
    state.chatAttachments = [];
    renderAttachmentTray();
    requestReactSessionsRefresh();
    switchPage("chat");
  }

  function stopChatGeneration() {
    if (!state.activeChatController || state.activeChatController.signal.aborted) return;
    state.activeChatController.abort();
  }

  async function retryAnswer(messageId = null) {
    if (state.sending) {
      stopChatGeneration();
      return;
    }
    const retryRequest = messageId ? messageRetryRequests.get(messageId) : state.lastChatRequest;
    if (!retryRequest) {
      toast("暂无可重试的问题");
      return;
    }
    await submitChat({
      retryRequest,
      replaceAnswer: messageId ? { messageId, streaming: false, thinking: false } : null,
      suppressUserMessage: Boolean(messageId),
    });
  }

  async function submitChat(options = {}) {
    if (state.sending) {
      stopChatGeneration();
      return;
    }
    const retryRequest = options.retryRequest || null;
    const replaceAnswer = options.replaceAnswer || null;
    const suppressUserMessage = options.suppressUserMessage || Boolean(replaceAnswer);
    let question = retryRequest?.question || String(options.question || "").trim();
    if (!question && state.chatAttachments.length) {
      question = "请总结上传的文件。";
    }
    if (!question) return;

    const knowledgeBaseId = retryRequest?.payload?.knowledgeBaseId ?? (state.selectedChatKnowledgeBaseId ? Number(state.selectedChatKnowledgeBaseId) : null);
    const chatModelConfigId = retryRequest?.payload?.chatModelConfigId ?? (state.selectedChatModelConfigId ? Number(state.selectedChatModelConfigId) : null);
    const attachments =
      retryRequest?.payload?.attachments ||
      state.chatAttachments.map(({ filename, fileType, mimeType, content, previewUrl }) => ({
        filename,
        fileType,
        mimeType,
        content,
        previewUrl,
      }));
    const attachmentNames = attachments.map((item) => item.filename).filter(Boolean).join(", ");
    const payload = {
      knowledgeBaseId,
      sessionId: state.currentSessionId,
      question,
      chatModelConfigId,
      useRag: Boolean(knowledgeBaseId),
      enableTools: true,
      autoAgent: true,
      toolMode: "auto",
      enabledTools: [],
      attachments: attachments,
    };
    if (retryRequest?.payload) {
      payload.enableTools = true;
      payload.autoAgent = true;
      payload.toolMode = "auto";
      payload.enabledTools = [];
    }

    const requestSnapshot = { question, payload: { ...payload } };
    state.lastChatRequest = requestSnapshot;
    if (!suppressUserMessage) {
      appendMessage("user", attachmentNames ? `${question}\n\n附件：${attachmentNames}` : question);
    }

    const answer = replaceAnswer || appendMessage("assistant", "", { thinking: true, streaming: true });
    if (!answer?.messageId) {
      throw new Error("消息组件尚未准备好。");
    }
    answer.streaming = true;
    answer.thinking = true;
    messageRetryRequests.set(answer.messageId, requestSnapshot);
    if (replaceAnswer) {
      setMessageThinking(answer, true);
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
      if (!response.ok) {
        const message = await readStreamError(response);
        if (response.status === 401) {
          notifyAuthRequired({ path: "/api/chat/stream", status: response.status, message });
        }
        throw new Error(message);
      }

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
      if (answer.thinking) {
        setMessageContent(answer, "assistant", answerBuffer || "模型没有返回内容。");
      }
      if (!retryRequest) {
        requestComposerReset();
        state.chatAttachments = [];
        renderAttachmentTray();
      }
      requestReactSessionsRefresh();
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError") {
        setMessageContent(answer, "assistant", answerBuffer || "生成已停止。");
      } else {
        setMessageContent(answer, "assistant", `请求失败：${error.message || "未知错误"}`);
        toast("聊天请求失败", 4200, "error");
      }
    } finally {
      if (state.activeChatController === controller) state.activeChatController = null;
      answer.streaming = false;
      answer.thinking = false;
      setMessageThinking(answer, false);
      setSending(false);
    }
  }

  return {
    continueSession,
    retryAnswer,
    startNewChat,
    stopChatGeneration,
    submitChat,
  };
}
