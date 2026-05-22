import { useEffect, useState } from "react";

const valueOf = (value) => (value === undefined || value === null ? "" : String(value));

function pickKnowledgeValue(knowledgeBases, currentValue) {
  const wanted = valueOf(currentValue);
  if (knowledgeBases.some((kb) => valueOf(kb.id) === wanted)) return wanted;
  return "";
}

export function ChatComposerForm() {
  const [attachments, setAttachments] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const handleDocumentClick = () => {
      window.dispatchEvent(new CustomEvent("knowflow:react-composer-menu-close"));
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  useEffect(() => {
    const handleAttachmentsUpdated = (event) => {
      setAttachments(Array.isArray(event.detail?.attachments) ? event.detail.attachments : []);
    };
    window.addEventListener("knowflow:legacy-attachments-updated", handleAttachmentsUpdated);
    return () => window.removeEventListener("knowflow:legacy-attachments-updated", handleAttachmentsUpdated);
  }, []);

  useEffect(() => {
    const handleKnowledgeOptionsUpdated = (event) => {
      const nextKnowledgeBases = Array.isArray(event.detail?.knowledgeBases) ? event.detail.knowledgeBases : [];
      setKnowledgeBases(nextKnowledgeBases);
      setSelectedKnowledgeBaseId((current) =>
        pickKnowledgeValue(nextKnowledgeBases, event.detail?.selectedChatKnowledgeBaseId ?? current),
      );
    };
    const handleKnowledgeSelectionUpdated = (event) => {
      if (!Object.prototype.hasOwnProperty.call(event.detail || {}, "selectedChatKnowledgeBaseId")) return;
      setSelectedKnowledgeBaseId(valueOf(event.detail?.selectedChatKnowledgeBaseId));
    };
    window.addEventListener("knowflow:legacy-knowledge-options-updated", handleKnowledgeOptionsUpdated);
    window.addEventListener("knowflow:legacy-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    return () => {
      window.removeEventListener("knowflow:legacy-knowledge-options-updated", handleKnowledgeOptionsUpdated);
      window.removeEventListener("knowflow:legacy-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    };
  }, []);

  useEffect(() => {
    const handleSendingUpdated = (event) => {
      setSending(Boolean(event.detail?.sending));
    };
    window.addEventListener("knowflow:legacy-sending-updated", handleSendingUpdated);
    return () => window.removeEventListener("knowflow:legacy-sending-updated", handleSendingUpdated);
  }, []);

  const handleComposerMenuToggle = (event) => {
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent("knowflow:react-composer-menu-toggle"));
  };

  const handleComposerMenuClick = (event) => {
    event.stopPropagation();
  };

  const handleChatFileChange = (event) => {
    window.dispatchEvent(
      new CustomEvent("knowflow:react-chat-files-change", {
        detail: {
          files: Array.from(event.target.files || []),
          input: event.target,
        },
      }),
    );
  };

  const handleComposerKnowledgeBaseChange = (event) => {
    const value = event.target.value || "";
    setSelectedKnowledgeBaseId(value);
    window.dispatchEvent(new CustomEvent("knowflow:react-composer-kb-change", { detail: { value } }));
  };

  const handleChatSubmit = (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("knowflow:react-chat-submit"));
  };

  const handleChatInput = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-chat-input"));
  };

  const handleChatPaste = (event) => {
    window.dispatchEvent(
      new CustomEvent("knowflow:react-chat-paste", {
        detail: {
          clipboardData: event.clipboardData,
          preventDefault: () => event.preventDefault(),
        },
      }),
    );
  };

  const handleChatKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("knowflow:react-chat-enter-submit"));
  };

  const handleRemoveAttachment = (attachmentId) => {
    window.dispatchEvent(new CustomEvent("knowflow:react-attachment-remove", { detail: { attachmentId } }));
  };

  return (
    <form className={"composer"} id={"chat-form"} onSubmit={handleChatSubmit}>
      <div className={"attachment-tray"} id={"attachment-tray"}>
        {attachments.map((attachment) => {
          const preview = attachment.previewUrl ? (
            <img className={"attachment-thumb"} src={attachment.previewUrl} alt={""} />
          ) : (
            <span className={"attachment-thumb attachment-file-thumb"}>{String(attachment.fileType || "file").slice(0, 3).toUpperCase()}</span>
          );
          return (
            <span className={"attachment-pill"} key={attachment.attachmentId}>
              {preview}
              <span>{attachment.filename}</span>
              <button type={"button"} title={"移除附件"} onClick={() => handleRemoveAttachment(attachment.attachmentId)}>
                {"x"}
              </button>
            </span>
          );
        })}
      </div>
      <div className={"composer-shell"}>
        <button className={"composer-plus"} id={"composer-plus-btn"} type={"button"} aria-label={"添加文件或工具"} onClick={handleComposerMenuToggle} disabled={sending}>
          {"+"}
        </button>
        <div className={"composer-menu"} id={"composer-menu"} aria-label={"文件和工具菜单"} onClick={handleComposerMenuClick}>
          <section>
            <label className={"menu-card upload-item"}>
              <input
                id={"chat-file-input"}
                type={"file"}
                multiple
                accept={".txt,.md,.markdown,.pdf,.docx,.xlsx,.xlsm,.pptx,.html,.htm,.json,.csv,.tsv,.yaml,.yml,.xml,.log,.rtf,.png,.jpg,.jpeg,.webp,.gif,.bmp"}
                onChange={handleChatFileChange}
              />
              <span className={"menu-icon"}>{"↑"}</span>
              <span>
                <strong>{"上传文件"}</strong>
                <small>{"支持文档；截图可直接粘贴到输入框"}</small>
              </span>
            </label>
          </section>
          <section className={"composer-settings-panel"} id={"composer-settings-panel"}>
            <div className={"menu-section-title"}>
              <strong>{"知识库上下文"}</strong>
              <span>{"选择一个知识库，或者保持普通对话。"}</span>
            </div>
            <label className={"menu-select-card knowledge-select-card"}>
              <span>{"知识库"}</span>
              <select id={"composer-kb-select"} aria-label={"知识库上下文"} value={selectedKnowledgeBaseId} onChange={handleComposerKnowledgeBaseChange}>
                <option value={""}>{"不使用知识库"}</option>
                {knowledgeBases.map((kb) => (
                  <option value={valueOf(kb.id)} key={kb.id}>
                    {kb.name}
                  </option>
                ))}
              </select>
            </label>
            <p className={"composer-menu-summary"} id={"composer-context-summary"}>
              {selectedKnowledgeBaseId ? "已使用知识库上下文" : "普通对话，不使用知识库"}
            </p>
          </section>
        </div>
        <textarea
          name={"question"}
          rows={"1"}
          placeholder={"Ask anything."}
          disabled={sending}
          onInput={handleChatInput}
          onPaste={handleChatPaste}
          onKeyDown={handleChatKeyDown}
        />
        <button className={"composer-send-button"} id={"chat-submit-btn"} type={"submit"} aria-label={sending ? "停止生成" : "发送消息"} title={sending ? "停止生成" : "发送消息"}>
          {sending ? (
            <span className={"stop-square"} aria-hidden={"true"}></span>
          ) : (
            <svg className={"send-arrow"} viewBox={"0 0 24 24"} aria-hidden={"true"}>
              <path
                d={"M12 19V5m0 0-6 6m6-6 6 6"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"2.35"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              ></path>
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
