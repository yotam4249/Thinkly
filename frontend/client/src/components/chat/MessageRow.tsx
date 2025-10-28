import type { ChatMessage } from "../../types/chat.type";

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

export function MessageRow({ msg, meId }: { msg: ChatMessage; meId: string }) {
  const mine = msg.senderId === meId;
  return (
    <div className={`row ${mine ? "me" : "other"}`}>
      <div className={`bubble ${mine ? "bubble-me" : "bubble-other"}`}>
        {msg.text}
      </div>
      <div className="meta">
        {!mine && <b>{msg.senderId.slice(-4)}</b>} {fmtTime(msg.createdAt)}{" "}
        {msg.pending ? "• sending…" : ""}
      </div>
    </div>
  );
}
