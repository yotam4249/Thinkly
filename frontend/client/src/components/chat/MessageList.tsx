import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "../../types/chat.type";
import { DayDivider } from "./DayDivider";
import { MessageRow } from "./MessageRow";

const asDayKey = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
};

export function MessageList({
  messages,
  meId,
}: {
  messages: ChatMessage[];
  meId: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // group by day for dividers
  const grouped = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      const key = asDayKey(m.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [messages]);

  // keep to bottom on new messages if already near bottom
  useEffect(() => {
    if (!listRef.current) return;
    if (atBottomRef.current) {
      requestAnimationFrame(() => {
        listRef.current!.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom);
  };

  return (
    <>
      <div className="messages" ref={listRef} onScroll={handleScroll} aria-live="polite">
        {grouped.map(([dayKey, dayMsgs]) => (
          <div key={dayKey}>
            <DayDivider isoDay={dayKey} />
            {dayMsgs.map((m) => (
              <MessageRow key={m._id} msg={m} meId={meId} />
            ))}
          </div>
        ))}
      </div>

      <button
        className={`scroll-down ${showScrollDown ? "show" : ""}`}
        aria-label="Scroll to latest"
        onClick={() => {
          if (!listRef.current) return;
          listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
          atBottomRef.current = true;
          setShowScrollDown(false);
        }}
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </>
  );
}
