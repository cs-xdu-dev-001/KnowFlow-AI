import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const actionEvents = {
  copy: "knowflow:react-message-copy",
  retry: "knowflow:react-message-retry",
};

function MessageBubble({ message }) {
  const bubbleClassName = [
    "message",
    message.role,
    message.thinking ? "thinking" : "",
    message.streaming ? "streaming" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const props = {
    className: bubbleClassName,
    "data-raw-content": message.rawContent,
    "data-react-message-id": message.id,
    "aria-busy": message.thinking ? "true" : undefined,
  };

  if (message.thinking) {
    return (
      <div {...props}>
        <div className={"thinking-indicator"} aria-label={"模型正在思考"}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    return <div {...props} dangerouslySetInnerHTML={{ __html: message.html }} />;
  }

  return <div {...props}>{message.rawContent}</div>;
}

function MessageRow({ message }) {
  const rowClassName = ["message-row", message.role, message.thinking ? "thinking-row" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rowClassName}>
      <MessageBubble message={message} />
      {message.role === "assistant" ? (
        <div className={"message-actions"}>
          <button type={"button"} data-message-action={"copy"}>
            {"复制"}
          </button>
          <button type={"button"} className={"retry-answer-button"} data-message-action={"retry"}>
            {"重试"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ChatMessages() {
  const messagesRef = useRef(null);
  const nextMessageIdRef = useRef(1);
  const [messages, setMessages] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);

  const findBubble = (messageId) =>
    messagesRef.current?.querySelector(`[data-react-message-id="${messageId}"]`) || null;

  const scrollToBottom = () => {
    const messagesNode = messagesRef.current;
    if (messagesNode) messagesNode.scrollTop = messagesNode.scrollHeight;
  };

  const normalizeMessage = (payload, id) => {
    const rawContent = String(payload.rawContent ?? payload.content ?? "");
    return {
      id,
      role: payload.role,
      rawContent: payload.thinking ? "" : rawContent,
      html: payload.thinking ? "" : payload.html || "",
      thinking: Boolean(payload.thinking),
      streaming: Boolean(payload.streaming),
    };
  };

  const updateMessage = (messageId, updater) => {
    flushSync(() => {
      setMessages((currentMessages) =>
        currentMessages.map((message) => (message.id === messageId ? updater(message) : message)),
      );
    });
    scrollToBottom();
    return findBubble(messageId);
  };

  const resetMessages = ({ showWelcome: nextShowWelcome = false } = {}) => {
    flushSync(() => {
      setMessages([]);
      setShowWelcome(Boolean(nextShowWelcome));
    });
    scrollToBottom();
    return messagesRef.current;
  };

  useEffect(() => {
    document.querySelector("#page-chat")?.classList.toggle("chat-empty", showWelcome);
    return () => document.querySelector("#page-chat")?.classList.remove("chat-empty");
  }, [showWelcome]);

  useEffect(() => {
    const messages = messagesRef.current;
    if (!messages) return undefined;

    const handleMessageActionClick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest("[data-message-action]");
      if (!button || !messages.contains(button)) return;

      const eventName = actionEvents[button.dataset.messageAction];
      if (!eventName) return;

      const bubble = button.closest(".message-row")?.querySelector(".message.assistant") || null;
      event.preventDefault();
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: {
            bubble,
            rawContent: bubble?.dataset.rawContent || bubble?.textContent || "",
          },
        }),
      );
    };

    messages.addEventListener("click", handleMessageActionClick);
    return () => messages.removeEventListener("click", handleMessageActionClick);
  }, []);

  useEffect(() => {
    const controller = {
      appendMessage(payload) {
        const messageId = `react-message-${nextMessageIdRef.current}`;
        nextMessageIdRef.current += 1;
        const message = normalizeMessage(payload || {}, messageId);
        flushSync(() => {
          setShowWelcome(false);
          setMessages((currentMessages) => [...currentMessages, message]);
        });
        scrollToBottom();
        return findBubble(messageId);
      },
      resetMessages,
      setMessageContent(messageId, payload = {}) {
        const rawContent = String(payload.rawContent ?? payload.content ?? "");
        return updateMessage(messageId, (message) => ({
          ...message,
          rawContent,
          html: payload.html || "",
          thinking: false,
          streaming: Boolean(payload.streaming),
        }));
      },
      setMessageThinking(messageId, payload = {}) {
        return updateMessage(messageId, (message) => ({
          ...message,
          rawContent: "",
          html: "",
          thinking: Boolean(payload.enabled),
          streaming: Boolean(payload.streaming),
        }));
      },
    };

    window.__knowflowReactMessages = controller;
    return () => {
      if (window.__knowflowReactMessages === controller) {
        delete window.__knowflowReactMessages;
      }
    };
  }, []);

  return (
    <div className={"messages"} id={"chat-messages"} ref={messagesRef}>
      {showWelcome ? (
        <div className={"welcome-card"}>
          <h2>{"What can I help with?"}</h2>
        </div>
      ) : null}
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
    </div>
  );
}
