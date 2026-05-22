import { useEffect, useState } from "react";

const documentSteps = [
  { key: "uploading", label: "上传中" },
  { key: "parsing", label: "解析中" },
  { key: "chunking", label: "切分完成" },
  { key: "embedding", label: "向量化中" },
  { key: "success", label: "向量化完成" },
];

const documentStatusIndex = {
  uploading: 0,
  pending: 0,
  processing: 1,
  parsing: 1,
  chunking: 2,
  embedding: 3,
  success: 4,
  failed: 1,
};

const statusText = {
  pending: "待处理",
  processing: "处理中",
  uploading: "上传中",
  parsing: "解析中",
  chunking: "切分中",
  embedding: "向量化中",
  success: "完成",
  failed: "失败",
};

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

const valueOf = (value) => (value === undefined || value === null ? "" : String(value));

function pickKnowledgeValue(knowledgeBases, currentValue) {
  const wanted = valueOf(currentValue);
  if (knowledgeBases.some((kb) => valueOf(kb.id) === wanted)) return wanted;
  return "";
}

function DocumentSteps({ document }) {
  const status = document.parse_status || "pending";
  const activeIndex = documentStatusIndex[status] ?? 0;
  return (
    <div className={"document-steps"}>
      {documentSteps.map((step, index) => {
        const done = status === "success" ? index <= activeIndex : index < activeIndex;
        const current = status !== "success" && status !== "failed" && index === activeIndex;
        const failed = status === "failed" && index === activeIndex;
        const className = ["document-step", done ? "done" : "", current ? "current" : "", failed ? "failed" : ""].filter(Boolean).join(" ");
        return (
          <span className={className} key={step.key}>
            <span></span>
            {step.label}
          </span>
        );
      })}
    </div>
  );
}

export function KnowledgeDocuments() {
  const [dragging, setDragging] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    const handleDocumentsUpdated = (event) => {
      setDocuments(Array.isArray(event.detail?.documents) ? event.detail.documents : []);
    };
    window.addEventListener("knowflow:legacy-documents-updated", handleDocumentsUpdated);
    return () => window.removeEventListener("knowflow:legacy-documents-updated", handleDocumentsUpdated);
  }, []);

  useEffect(() => {
    const handleKnowledgeOptionsUpdated = (event) => {
      const nextKnowledgeBases = Array.isArray(event.detail?.knowledgeBases) ? event.detail.knowledgeBases : [];
      setKnowledgeBases(nextKnowledgeBases);
      setSelectedKnowledgeBaseId((current) =>
        pickKnowledgeValue(nextKnowledgeBases, event.detail?.selectedDocumentKnowledgeBaseId ?? current),
      );
    };
    const handleKnowledgeSelectionUpdated = (event) => {
      if (!Object.prototype.hasOwnProperty.call(event.detail || {}, "selectedDocumentKnowledgeBaseId")) return;
      setSelectedKnowledgeBaseId(valueOf(event.detail?.selectedDocumentKnowledgeBaseId));
    };
    window.addEventListener("knowflow:legacy-knowledge-options-updated", handleKnowledgeOptionsUpdated);
    window.addEventListener("knowflow:legacy-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    return () => {
      window.removeEventListener("knowflow:legacy-knowledge-options-updated", handleKnowledgeOptionsUpdated);
      window.removeEventListener("knowflow:legacy-knowledge-selection-updated", handleKnowledgeSelectionUpdated);
    };
  }, []);

  useEffect(() => {
    const handleUploadModalOpen = () => setUploadModalOpen(true);
    const handleUploadModalClose = () => setUploadModalOpen(false);
    window.addEventListener("knowflow:legacy-upload-modal-open", handleUploadModalOpen);
    window.addEventListener("knowflow:legacy-upload-modal-close", handleUploadModalClose);
    return () => {
      window.removeEventListener("knowflow:legacy-upload-modal-open", handleUploadModalOpen);
      window.removeEventListener("knowflow:legacy-upload-modal-close", handleUploadModalClose);
    };
  }, []);

  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
  };

  const handleUploadModalBackdrop = (event) => {
    if (event.target === event.currentTarget) {
      handleCloseUploadModal();
    }
  };

  const handleOpenRetrievalDrawer = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-open-retrieval-drawer"));
  };

  const dispatchDocumentFile = (file) => {
    window.dispatchEvent(
      new CustomEvent("knowflow:react-document-file-select", {
        detail: { file },
      }),
    );
  };

  const handleDocumentFileChange = (event) => {
    dispatchDocumentFile(event.target.files?.[0] || null);
  };

  const handleDocumentDragStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  };

  const handleDocumentDragEnd = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  };

  const handleDocumentDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    dispatchDocumentFile(event.dataTransfer?.files?.[0] || null);
  };

  const handleDocumentKnowledgeBaseChange = (event) => {
    const value = event.target.value || "";
    setSelectedKnowledgeBaseId(value);
    window.dispatchEvent(
      new CustomEvent("knowflow:react-document-kb-change", {
        detail: { value },
      }),
    );
  };

  const handleDocumentSubmit = (event) => {
    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("knowflow:react-document-submit", {
        detail: { form: event.currentTarget },
      }),
    );
  };

  const handleDocumentAction = (eventName, documentId) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { documentId } }));
  };

  return (
    <section className={"documents-tab-content"}>
      <div className={"document-toolbar compact-toolbar"}>
        <div>
          <span className={"eyebrow"}>{"DOCUMENTS"}</span>
          <h2>{"文档管理"}</h2>
          <p>{"上传后会展示解析、切分、向量化状态；失败文档可以直接重试。"}</p>
        </div>
        <label className={"active-kb-select"}>
          <span>{"当前知识库"}</span>
          <select id={"doc-kb-select"} name={"knowledgeBaseId"} value={selectedKnowledgeBaseId} onChange={handleDocumentKnowledgeBaseChange}>
            {knowledgeBases.length ? (
              knowledgeBases.map((kb) => (
                <option value={valueOf(kb.id)} key={kb.id}>
                  {kb.name}
                </option>
              ))
            ) : (
              <option value={""}>{"暂无知识库"}</option>
            )}
          </select>
        </label>
        <button className={"upload-modal-trigger"} id={"upload-modal-trigger"} type={"button"} onClick={handleOpenUploadModal}>
          {"上传文档"}
        </button>
      </div>
      <div className={uploadModalOpen ? "modal-backdrop upload-modal" : "modal-backdrop upload-modal hidden"} id={"upload-modal"} onClick={handleUploadModalBackdrop}>
        <section className={"modal-panel upload-modal-panel"} role={"dialog"} aria-modal={"true"} aria-labelledby={"upload-modal-title"}>
          <header className={"modal-head"}>
            <div>
              <span className={"eyebrow"}>{"UPLOAD"}</span>
              <h2 id={"upload-modal-title"}>{"上传文档到知识库"}</h2>
              <p>{"先在前端进入处理队列，后端完成解析、切片和向量化后会自动刷新为正式文档。"}</p>
            </div>
            <button className={"icon-button"} type={"button"} onClick={handleCloseUploadModal} aria-label={"关闭上传窗口"}>
              {"×"}
            </button>
          </header>
          <div className={"upload-modal-body"}>
            <form className={"upload-zone upload-zone-compact"} id={"document-form"} onSubmit={handleDocumentSubmit}>
              <input name={"knowledgeBaseId"} id={"doc-kb-hidden"} type={"hidden"} value={selectedKnowledgeBaseId} readOnly />
              <label
                className={dragging ? "file-drop dragging" : "file-drop"}
                id={"document-drop-zone"}
                onDragEnter={handleDocumentDragStart}
                onDragOver={handleDocumentDragStart}
                onDragLeave={handleDocumentDragEnd}
                onDragEnd={handleDocumentDragEnd}
                onDrop={handleDocumentDrop}
              >
                <input
                  name={"file"}
                  id={"document-file-input"}
                  type={"file"}
                  accept={".txt,.md,.markdown,.pdf,.docx,.xlsx,.xlsm,.pptx,.html,.htm,.json,.csv,.tsv,.yaml,.yml,.xml,.log,.rtf"}
                  onChange={handleDocumentFileChange}
                />
                <span>{"拖入或选择文档"}</span>
                <small>{"支持 txt、md、pdf、docx、xlsx、pptx、html、json、csv、xml、rtf 等资料"}</small>
                <small className={"file-selected-text"} id={"document-file-name"}>
                  {"尚未选择文件"}
                </small>
              </label>
              <button type={"submit"}>{"上传并入库"}</button>
            </form>
            <aside className={"upload-queue-summary"}>
              <strong>{"入库流程"}</strong>
              <span>{"上传中"}</span>
              <span>{"解析中"}</span>
              <span>{"切分完成"}</span>
              <span>{"向量化完成"}</span>
              <small>{"未完成、失败或等待入库的文件会保留在文档队列里。"}</small>
            </aside>
          </div>
        </section>
      </div>
      <section className={"panel document-table-panel"}>
        <div className={"panel-title compact-title document-table-title"}>
          <div>
            <h2>{"文档列表"}</h2>
            <p>{"点击文档的“切片”查看入库内容，检索调试放在右侧抽屉中。"}</p>
          </div>
          <button type={"button"} id={"open-retrieval-drawer-secondary-btn"} onClick={handleOpenRetrievalDrawer}>
            {"打开检索调试"}
          </button>
        </div>
        <div className={"document-table"} id={"document-list"}>
          {documents.length ? (
            documents.map((document) => {
              const statusClass = document.parse_status === "success" ? "ok" : document.parse_status === "failed" ? "warn" : "progress";
              const retryLabel = document.parse_status === "failed" ? "重试" : "重新入库";
              const rowClassName = ["document-row", document.temporary ? "queued-local" : "", document.parse_status || ""].filter(Boolean).join(" ");
              return (
                <article className={rowClassName} key={document.id}>
                  <div className={"document-row-main"}>
                    <h3>{document.filename}</h3>
                    <p>{`${document.file_type || "文件"} · ${formatBytes(document.file_size)} · 更新于 ${document.updated_at || document.created_at || "刚刚"}`}</p>
                    {document.parse_status === "failed" && document.error_message ? (
                      <div className={"document-error"}>{`失败原因：${document.error_message}`}</div>
                    ) : null}
                  </div>
                  <div className={"document-row-status"}>
                    <span className={["badge", statusClass].filter(Boolean).join(" ")}>{statusText[document.parse_status] || document.parse_status || "未设置"}</span>
                    <DocumentSteps document={document} />
                  </div>
                  <div className={"document-row-meta"}>
                    <strong>{document.chunk_count || 0}</strong>
                    <span>{"切片"}</span>
                  </div>
                  <div className={"document-row-actions"}>
                    {Number(document.id) > 0 ? (
                      <>
                        <button type={"button"} onClick={() => handleDocumentAction("knowflow:react-document-chunks", document.id)}>
                          {"切片"}
                        </button>
                        <button type={"button"} onClick={() => handleDocumentAction("knowflow:react-document-reindex", document.id)}>
                          {retryLabel}
                        </button>
                        <button className={"danger"} type={"button"} onClick={() => handleDocumentAction("knowflow:react-document-delete", document.id)}>
                          {"删除"}
                        </button>
                      </>
                    ) : document.parse_status === "failed" ? (
                      <button type={"button"} onClick={() => handleDocumentAction("knowflow:react-document-remove-pending", document.id)}>
                        {"移除"}
                      </button>
                    ) : (
                      <button type={"button"} disabled>
                        {"等待入库"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <p className={"empty-state"}>{"暂无文档。上传资料后会在这里显示处理状态。"}</p>
          )}
        </div>
      </section>
    </section>
  );
}
