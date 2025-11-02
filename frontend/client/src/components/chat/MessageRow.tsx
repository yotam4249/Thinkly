import type { ChatMessage } from "../../types/chat.type";

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

// We allow an extra UI-only field `senderName` that ChatPage injects.
type MsgWithName = ChatMessage & { senderName?: string };

export function MessageRow({ msg, meId }: { msg: ChatMessage; meId: string }) {
  const m = msg as MsgWithName;
  const mine = m.senderId === meId;

  // Prefer username if provided; otherwise fall back to short id.
  // For own messages, show your username if present; else "You".
  const displayName = mine
    ? m.senderName ?? "You"
    : m.senderName ?? m.senderId.slice(-4);

  const timeStr = fmtTime(m.createdAt);
  const isPending = m.pending;

  return (
    <article 
      className={`row ${mine ? "me" : "other"}`}
      role="article"
      aria-label={`Message from ${displayName}${timeStr ? ` at ${timeStr}` : ""}`}
    >
      <div 
        className={`bubble ${mine ? "bubble-me" : "bubble-other"}`}
        aria-label={isPending ? "Sending message" : undefined}
      >
        <div className="bubble-content">{m.text}</div>
      </div>
      <footer className="meta" aria-label="Message metadata">
        <span className="meta-name" aria-label={`Sender: ${displayName}`}>
          {displayName}
        </span>
        {timeStr && (
          <time className="meta-time" dateTime={m.createdAt} aria-label={`Sent at ${timeStr}`}>
            {timeStr}
          </time>
        )}
        {isPending && (
          <span className="meta-pending" aria-label="Message is being sent">
            • sending…
          </span>
        )}
      </footer>
    </article>
  );
}
