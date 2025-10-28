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

  return (
    <div className={`row ${mine ? "me" : "other"}`}>
      <div className={`bubble ${mine ? "bubble-me" : "bubble-other"}`}>
        {m.text}
      </div>
      <div className="meta">
        <b>{displayName}</b> {fmtTime(m.createdAt)} {m.pending ? "• sending…" : ""}
      </div>
    </div>
  );
}
