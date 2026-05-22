import { useEffect, useRef, useState } from "react";

export function KnowledgeRail() {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuKnowledgeBaseId, setOpenMenuKnowledgeBaseId] = useState(null);
  const railRef = useRef(null);

  useEffect(() => {
    const handleKnowledgeBasesUpdated = (event) => {
      setKnowledgeBases(Array.isArray(event.detail?.knowledgeBases) ? event.detail.knowledgeBases : []);
      setSelectedKnowledgeBaseId(event.detail?.selectedKnowledgeBaseId || null);
    };
    window.addEventListener("knowflow:legacy-knowledge-bases-updated", handleKnowledgeBasesUpdated);
    return () => window.removeEventListener("knowflow:legacy-knowledge-bases-updated", handleKnowledgeBasesUpdated);
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!railRef.current?.contains(event.target)) {
        setOpenMenuKnowledgeBaseId(null);
      }
    };
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const handleOpenKnowledgeBaseModal = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-open-kb-modal"));
  };

  const handleKnowledgeSearch = (event) => {
    const query = event.target.value || "";
    setSearchQuery(query);
    window.dispatchEvent(
      new CustomEvent("knowflow:react-knowledge-search-change", {
        detail: { query },
      }),
    );
  };

  const handleKnowledgeMenuToggle = (event, knowledgeBaseId) => {
    event.stopPropagation();
    setOpenMenuKnowledgeBaseId((current) => (current === knowledgeBaseId ? null : knowledgeBaseId));
  };

  const handleKnowledgeBaseAction = (eventName, knowledgeBaseId) => {
    setOpenMenuKnowledgeBaseId(null);
    window.dispatchEvent(new CustomEvent(eventName, { detail: { knowledgeBaseId } }));
  };

  const keyword = searchQuery.trim().toLowerCase();
  const filteredKnowledgeBases = keyword
    ? knowledgeBases.filter((kb) => `${kb.name || ""} ${kb.description || ""}`.toLowerCase().includes(keyword))
    : knowledgeBases;

  return (
    <aside className={"knowledge-rail"} ref={railRef}>
      <div className={"kb-list-header"}>
        <div>
          <span className={"section-label"}>{"知识空间"}</span>
          <h2>{"知识库"}</h2>
        </div>
        <button
          type={"button"}
          className={"icon-button"}
          id={"open-kb-modal-small-btn"}
          title={"新建知识库"}
          onClick={handleOpenKnowledgeBaseModal}
        >
          {"+"}
        </button>
      </div>
      <label className={"kb-search-box"}>
        <span>{"搜索知识库"}</span>
        <input id={"kb-search-input"} type={"search"} placeholder={"输入名称或描述"} value={searchQuery} onChange={handleKnowledgeSearch} />
      </label>
      <div className={"list kb-card-list"} id={"kb-list"}>
        {filteredKnowledgeBases.length ? (
          filteredKnowledgeBases.map((kb) => {
            const isActive = kb.id === selectedKnowledgeBaseId;
            const isOpen = openMenuKnowledgeBaseId === kb.id;
            return (
              <article className={["kb-row", isActive ? "active" : "", isOpen ? "menu-open" : ""].filter(Boolean).join(" ")} data-kb-row={kb.id} key={kb.id}>
                <button className={"kb-row-main"} type={"button"} onClick={() => handleKnowledgeBaseAction("knowflow:react-kb-select", kb.id)}>
                  <span className={"kb-row-title"}>{kb.name}</span>
                  <span className={"kb-row-desc"}>{kb.description || "暂无描述"}</span>
                  <span className={"kb-row-meta"}>{`${kb.document_count || 0} 个文档 · ${kb.chunk_count || 0} 个切片`}</span>
                </button>
                <button className={"session-menu-button"} type={"button"} onClick={(event) => handleKnowledgeMenuToggle(event, kb.id)} aria-label={"知识库操作"}>
                  {"···"}
                </button>
                <div className={"session-popover kb-popover"}>
                  <button type={"button"} onClick={() => handleKnowledgeBaseAction("knowflow:react-kb-select", kb.id)}>
                    {"打开"}
                  </button>
                  <button type={"button"} onClick={() => handleKnowledgeBaseAction("knowflow:react-open-retrieval-drawer", kb.id)}>
                    {"检索调试"}
                  </button>
                  <button className={"danger"} type={"button"} onClick={() => handleKnowledgeBaseAction("knowflow:react-kb-delete", kb.id)}>
                    {"删除"}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <p className={"empty-state"}>{"暂无知识库。点击右上角新建一个知识空间。"}</p>
        )}
      </div>
    </aside>
  );
}
