/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listChats, createChat } from "../services/chat.service";
import "../styles/home.css"; // imports ui.css inside

import type { ChatListItem } from "../types/chatList.type";
import avatarIcon from "../assets/avatar.svg";
import groupIcon from "../assets/group.svg";

function fmt(iso?: string) {
  return iso ? new Date(iso).toLocaleString() : "";
}

export default function Home() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ChatListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"dm" | "group">("group");
  const [newMembers, setNewMembers] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

  const load = async (p: number) => {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await listChats(p, 15);
      setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (e: any) {
      setErr(e?.response?.data?.code ?? "FAILED_TO_LOAD_CHATS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loading) {
          load(page + 1);
        }
      },
      { rootMargin: "200px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, page, loading]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setCreateErr("TITLE_REQUIRED");
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const members = newMembers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { chatId } = await createChat(
        newType,
        newTitle.trim(),
        members.length ? members : undefined
      );

      // optimistic prepend
      setItems((prev) => [
        {
          id: chatId,
          type: newType,
          title: newTitle.trim(),
          lastMessageText: "",
          lastMessageAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      setNewTitle("");
      setNewMembers("");
      setNewType("group");
      setShowNewChat(false);

      navigate(`/chat/${chatId}`);
    } catch (e: any) {
      setCreateErr(e?.response?.data?.code ?? "FAILED_TO_CREATE_CHAT");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="shell">
      <div className="gradient-bg" />

      <div className="card">
        {/* header */}
        <header className="sticky-header">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>
              Chats
            </h1>
            <span className="count-pill">{items.length}</span>
          </div>

          <button
            className="new-chat-btn focusable"
            onClick={() => setShowNewChat(true)}
            aria-haspopup="dialog"
            aria-expanded={showNewChat}
            aria-controls="new-chat-modal"
          >
            + New Chat
          </button>
        </header>

        {/* errors */}
        {err && <div className="toast error" role="alert">{err}</div>}

        {/* body */}
        <div className="card-body">
          {!loading && !items.length && !err && (
            <div className="center" style={{ textAlign: "center", padding: "56px 10px 40px" }}>
              <div className="empty-illustration" />
              <h3 style={{ margin: "6px 0 4px" }}>No chats yet</h3>
              <p className="text-muted" style={{ marginTop: 4, marginBottom: 14 }}>
                Create your first chat to get the conversation started.
              </p>
            </div>
          )}

          <ul className="list chat-list">
            {items.map((c) => {
              const isGroup = c.type === "group";
              return (
                <li
                  key={c.id}
                  className="list-item chat-item focusable"
                  tabIndex={0}
                  role="button"
                  aria-label={`Open chat ${c.title || "untitled"}`}
                  onClick={() => navigate(`/chat/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/chat/${c.id}`);
                  }}
                >
                  {/* avatar */}
                  <img
                    src={avatarIcon}
                    alt=""
                    className="avatar-img"
                    width={34}
                    height={34}
                    aria-hidden="true"
                  />

                  {/* info */}
                  <div className="item-info">
                    <div className="item-title-row">
                      <div className="item-title">
                        {c.title || "(untitled)"}
                      </div>

                      {/* type badge */}
                      <span className="badge" aria-label={isGroup ? "Group chat" : "Direct message"}>
                        <img
                          src={isGroup ? groupIcon : avatarIcon}
                          alt=""
                          width={14}
                          height={14}
                          style={{ opacity: 0.9 }}
                          aria-hidden="true"
                        />
                        <span className="badge-label">{isGroup ? "Group" : "DM"}</span>
                      </span>
                    </div>

                    <div className="item-sub">
                      {c.lastMessageText || "No messages yet"}
                    </div>
                  </div>

                  {/* time */}
                  <div className="item-time">{fmt(c.lastMessageAt)}</div>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="center" style={{ padding: "8px 0 6px" }}>
              <button
                className="load-more-btn btn-ghost focusable"
                onClick={() => load(page + 1)}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Load more"}
              </button>
            </div>
          )}

          <div ref={sentinelRef} className="sentinel" />
        </div>
      </div>

      {/* modal */}
      <div
        className={`modal-backdrop ${showNewChat ? "show" : ""}`}
        onClick={() => !creating && setShowNewChat(false)}
        aria-hidden={!showNewChat}
      >
        {showNewChat && (
          <div
            id="new-chat-modal"
            className="modal animate-in"
            role="dialog"
            aria-modal="true"
            aria-label="Create a new chat"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Create a New Chat</h2>

            {createErr && <div className="toast error compact" role="alert">{createErr}</div>}

            <label className="field">
              <span>Title</span>
              <input
                className="input"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Project Alpha, Weekend Group, …"
              />
            </label>

            <fieldset className="radios" aria-label="Chat type">
              <label className="radio-pill">
                <input
                  type="radio"
                  name="chat-type"
                  value="group"
                  checked={newType === "group"}
                  onChange={() => setNewType("group")}
                />
                Group
              </label>
              <label className="radio-pill">
                <input
                  type="radio"
                  name="chat-type"
                  value="dm"
                  checked={newType === "dm"}
                  onChange={() => setNewType("dm")}
                />
                DM
              </label>
            </fieldset>

            <label className="field">
              <span>Members <span className="text-muted">(optional)</span></span>
              <input
                className="input"
                type="text"
                value={newMembers}
                onChange={(e) => setNewMembers(e.target.value)}
                placeholder="userId1, userId2, …"
              />
              <small className="small">Leave empty to start with just you.</small>
            </label>

            <div className="modal-actions">
              <button
                className="btn-ghost focusable"
                onClick={() => setShowNewChat(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="btn-primary focusable"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? <span className="spinner" /> : "Create chat"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
