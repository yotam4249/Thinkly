/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listChats } from "../services/chat.service";
import "../styles/home.css";
import type { ChatListItem } from "../types/chatList.type";

export default function Home() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ChatListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
  }, []);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;

    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !loading) {
        load(page + 1);
      }
    }, { rootMargin: "200px 0px" });

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, page, loading]);

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "");

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Your Chats</h1>
        <span className="chat-count">{items.length}</span>
      </header>

      {err && <div className="error-box">{err}</div>}

      {!loading && !items.length && !err && (
        <div className="empty-state">No chats yet.</div>
      )}

      <ul className="chat-list">
        {items.map((c) => (
          <li key={c.id} className="chat-item" onClick={() => navigate(`/chat/${c.id}`)}>
            <div className="chat-info">
              <div className="chat-title">{c.title || "(untitled)"}</div>
              <div className="chat-preview">{c.lastMessageText || "No messages yet"}</div>
            </div>
            <div className="chat-time">{fmt(c.lastMessageAt)}</div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="load-more-container">
          <button
            className="load-more-btn"
            onClick={() => load(page + 1)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      <div ref={sentinelRef} className="sentinel" />
    </div>
  );
}
