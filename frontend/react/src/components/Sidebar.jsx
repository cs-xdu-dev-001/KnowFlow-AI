import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { sidebarTools } from "../data/navigation.js";
import { KnowFlowLogo } from "./KnowFlowLogo.jsx";

const sessionGroupLabels = [
  ["today", "今天"],
  ["recent", "最近 7 天"],
  ["earlier", "更早"],
];

const sessionActionEvents = {
  continue: "knowflow:react-session-continue",
  rename: "knowflow:react-session-rename",
  delete: "knowflow:react-session-delete",
};

const sessionMenuItems = [
  { action: "continue", icon: "message", label: "继续对话" },
  { action: "rename", icon: "pencil", label: "重命名" },
  { action: "delete", icon: "trash", label: "删除", danger: true, divider: true },
];

function SessionMenuIcon({ type }) {
  if (type === "pencil") {
    return (
      <svg aria-hidden={"true"} viewBox={"0 0 24 24"} focusable={"false"}>
        <path d={"M4 20h4.4L19.2 9.2a2.1 2.1 0 0 0 0-3L17.8 4.8a2.1 2.1 0 0 0-3 0L4 15.6V20Z"} />
        <path d={"M13.7 5.9l4.4 4.4"} />
      </svg>
    );
  }

  if (type === "trash") {
    return (
      <svg aria-hidden={"true"} viewBox={"0 0 24 24"} focusable={"false"}>
        <path d={"M4.5 7h15"} />
        <path d={"M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7"} />
        <path d={"M7 7l.8 12.1A2 2 0 0 0 9.8 21h4.4a2 2 0 0 0 2-1.9L17 7"} />
        <path d={"M10 11v6M14 11v6"} />
      </svg>
    );
  }

  return (
    <svg aria-hidden={"true"} viewBox={"0 0 24 24"} focusable={"false"}>
      <path d={"M5 6.8A3.8 3.8 0 0 1 8.8 3h6.4A3.8 3.8 0 0 1 19 6.8v4.4a3.8 3.8 0 0 1-3.8 3.8H10l-5 4V6.8Z"} />
      <path d={"M9 8h6M9 11.5h4"} />
    </svg>
  );
}

function SessionMenuPopover({ anchor, onAction, sessionId }) {
  if (!anchor || !sessionId || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={"session-popover session-popover-floating"}
      role={"menu"}
      style={{ left: `${anchor.left}px`, top: `${anchor.top}px` }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {sessionMenuItems.map((item) => (
        <div className={item.divider ? "session-menu-group danger-group" : "session-menu-group"} key={item.action}>
          {item.divider ? <div className={"session-menu-divider"} /> : null}
          <button className={item.danger ? "session-menu-item danger" : "session-menu-item"} role={"menuitem"} type={"button"} onClick={() => onAction(item.action, sessionId)}>
            <span className={"session-menu-icon"}>
              <SessionMenuIcon type={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
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

function SessionHistory({ onHistoryRefresh }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const historyRef = useRef(null);

  useEffect(() => {
    const handleSessionsUpdated = (event) => {
      setSessions(Array.isArray(event.detail?.sessions) ? event.detail.sessions : []);
      setCurrentSessionId(event.detail?.currentSessionId || null);
    };
    window.addEventListener("knowflow:legacy-sessions-updated", handleSessionsUpdated);
    return () => window.removeEventListener("knowflow:legacy-sessions-updated", handleSessionsUpdated);
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!historyRef.current?.contains(event.target)) {
        setOpenMenuSessionId(null);
        setMenuAnchor(null);
      }
    };
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const handleSessionSearch = (event) => {
    const query = event.target.value || "";
    setSearchQuery(query);
    window.dispatchEvent(new CustomEvent("knowflow:react-session-search-change", { detail: { query } }));
  };

  const handleSessionAction = (action, sessionId) => {
    setOpenMenuSessionId(null);
    setMenuAnchor(null);
    window.dispatchEvent(new CustomEvent(sessionActionEvents[action], { detail: { sessionId } }));
  };

  const handleSessionMenuToggle = (event, sessionId) => {
    event.stopPropagation();
    const nextOpen = openMenuSessionId === sessionId ? null : sessionId;
    if (!nextOpen) {
      setOpenMenuSessionId(null);
      setMenuAnchor(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 214;
    const menuHeight = 142;
    const left = Math.max(12, Math.min(rect.right + 8, window.innerWidth - menuWidth - 12));
    const top = Math.max(8, Math.min(rect.top - 10, window.innerHeight - menuHeight - 12));
    setOpenMenuSessionId(sessionId);
    setMenuAnchor({ left, top });
  };

  useEffect(() => {
    if (!openMenuSessionId) return undefined;
    const closeFloatingMenu = () => {
      setOpenMenuSessionId(null);
      setMenuAnchor(null);
    };
    window.addEventListener("resize", closeFloatingMenu);
    window.addEventListener("scroll", closeFloatingMenu, true);
    return () => {
      window.removeEventListener("resize", closeFloatingMenu);
      window.removeEventListener("scroll", closeFloatingMenu, true);
    };
  }, [openMenuSessionId]);

  const keyword = searchQuery.trim().toLowerCase();
  const filteredSessions = keyword
    ? sessions.filter((session) => `${session.title || ""} ${session.id || ""} ${session.updated_at || ""}`.toLowerCase().includes(keyword))
    : sessions;
  const groups = groupSessions(filteredSessions);

  return (
    <section className={"chat-history-shell"} ref={historyRef}>
      <label className={"sidebar-search"}>
        <span>{"搜索对话"}</span>
        <input id={"sidebar-session-search"} placeholder={"搜索聊天"} value={searchQuery} onChange={handleSessionSearch} />
      </label>
      <div className={"sidebar-heading-row"}>
        <span className={"sidebar-heading"}>{"对话历史"}</span>
        <button className={"mini-link"} id={"history-refresh-btn"} type={"button"} onClick={onHistoryRefresh}>
          {"刷新"}
        </button>
      </div>
      <div className={"sidebar-list chat-history-list"} id={"session-list"}>
        {sessionGroupLabels.some(([key]) => groups[key].length) ? (
          sessionGroupLabels
            .filter(([key]) => groups[key].length)
            .map(([key, label]) => (
              <section className={"history-group"} key={key}>
                <div className={"history-group-title"}>{label}</div>
                {groups[key].map((session) => {
                  const isActive = session.id === currentSessionId;
                  const isOpen = openMenuSessionId === session.id;
                  return (
                    <div className={["session-row", isActive ? "active" : "", isOpen ? "menu-open" : ""].filter(Boolean).join(" ")} key={session.id}>
                      <button className={"sidebar-list-item"} type={"button"} onClick={() => handleSessionAction("continue", session.id)}>
                        <span>{session.title || "新会话"}</span>
                        <small>{session.updated_at || ""}</small>
                      </button>
                      <button className={"session-menu-button"} type={"button"} title={"会话操作"} onClick={(event) => handleSessionMenuToggle(event, session.id)}>
                        {"..."}
                      </button>
                    </div>
                  );
                })}
              </section>
            ))
        ) : (
          <p className={"empty-state"}>{"暂无会话"}</p>
        )}
      </div>
      <SessionMenuPopover anchor={menuAnchor} sessionId={openMenuSessionId} onAction={handleSessionAction} />
    </section>
  );
}

function UserMenu() {
  const { loading, logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const displayName = user?.displayName || user?.username || (loading ? "检查登录状态" : "未登录");
  const email = user?.email || user?.username || (loading ? "请稍候" : "请先登录");
  const avatarText = displayName.slice(0, 1).toUpperCase() || "K";
  const avatarStyle = user?.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")` } : undefined;

  useEffect(() => {
    const closeMenu = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const handleUserMenuToggle = (event) => {
    event.stopPropagation();
    setMenuOpen((current) => !current);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      window.dispatchEvent(new CustomEvent("knowflow:react-auth-logout", { detail: { message: "已退出登录" } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("knowflow:react-toast", { detail: { message: error.message || "退出失败" } }));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className={menuOpen ? "user-menu open" : "user-menu"} id={"user-menu"} ref={menuRef}>
      <button className={"user-menu-button"} id={"user-menu-btn"} type={"button"} onClick={handleUserMenuToggle}>
        <span className={user?.avatarUrl ? "user-avatar with-image" : "user-avatar"} id={"user-avatar"} style={avatarStyle}>
          {user?.avatarUrl ? "" : avatarText}
        </span>
        <span>
          <strong id={"user-display-name"}>{displayName}</strong>
          <small id={"user-email"}>{email}</small>
        </span>
      </button>
      <div className={"user-popover"} id={"user-popover"}>
        <button id={"logout-btn"} type={"button"} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>
    </div>
  );
}

function RuntimeStatus() {
  const [runtime, setRuntime] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const handleRuntimeUpdated = (event) => {
      setRuntime(event.detail?.runtime || null);
      setFailed(false);
    };
    const handleRuntimeFailed = () => {
      setRuntime(null);
      setFailed(true);
    };
    window.addEventListener("knowflow:legacy-runtime-updated", handleRuntimeUpdated);
    window.addEventListener("knowflow:legacy-runtime-failed", handleRuntimeFailed);
    return () => {
      window.removeEventListener("knowflow:legacy-runtime-updated", handleRuntimeUpdated);
      window.removeEventListener("knowflow:legacy-runtime-failed", handleRuntimeFailed);
    };
  }, []);

  if (failed) {
    return (
      <div className={"runtime-card"} id={"runtime-box"}>
        {"运行状态读取失败"}
      </div>
    );
  }

  if (!runtime) {
    return (
      <div className={"runtime-card"} id={"runtime-box"}>
        {"正在读取运行状态..."}
      </div>
    );
  }

  return (
    <div className={"runtime-card"} id={"runtime-box"}>
      <div>
        <strong>{"数据库"}</strong>
        {` ${runtime.database || "未知"}`}
      </div>
      <div>
        <strong>{"向量库"}</strong>
        {` ${runtime.vectorBackend || "未知"}`}
      </div>
    </div>
  );
}

export function Sidebar() {
  const handlePageChange = (page) => {
    window.dispatchEvent(new CustomEvent("knowflow:react-page-change", { detail: { page } }));
  };
  const handleNewChat = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-new-chat"));
  };
  const handleSidebarToggle = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-sidebar-toggle"));
  };
  const handleHistoryRefresh = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-history-refresh"));
  };
  return (
    <aside className={"sidebar"} id={"sidebar"}>
      <div className={"sidebar-brand"}>
        <div className={"brand-mark"}>
          <KnowFlowLogo />
        </div>
        <div className={"brand-copy"}>
          <strong>
            {"KnowFlow AI"}
          </strong>
          <span>
            {"个人知识库工作台"}
          </span>
        </div>
        <button className={"icon-button"} id={"sidebar-toggle"} type={"button"} title={"收起侧边栏"} onClick={handleSidebarToggle}>
          {"<"}
        </button>
      </div>
      <button className={"new-chat-button"} id={"new-chat-btn"} type={"button"} onClick={handleNewChat}>
        <span>
          {"+"}
        </span>
        <strong>
          {"新建对话"}
        </strong>
      </button>
      <SessionHistory onHistoryRefresh={handleHistoryRefresh} />
      <div className={"sidebar-bottom-tools"} id={"sidebar-bottom-tools"}>
        {sidebarTools.map((tool) =>
          tool.href ? (
            <a key={tool.key} className={"sidebar-tool"} href={tool.href} target={"_blank"} rel={"noreferrer"}>
              <span className={"nav-icon"}>{tool.icon}</span>
              <span>{tool.label}</span>
            </a>
          ) : (
            <button key={tool.key} className={"sidebar-tool"} data-page={tool.page} type={"button"} onClick={() => handlePageChange(tool.page)}>
              <span className={"nav-icon"}>{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ),
        )}
      </div>
      <UserMenu />
      <RuntimeStatus />
    </aside>
  );
}
