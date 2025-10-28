/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { getMessages } from "../services/chat.service";
import { getSocket } from "../services/socket.service";
import { TokenManager } from "../services/api"; // adjust path if needed
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { Composer } from "../components/chat/Composer";
import type { ChatMessage } from "../types/chat.type";
import "../styles/chat.css";

function decodeUserIdFromJWT(jwt?: string | null): string | null {
  try {
    if (!jwt) return null;
    const [, payload] = jwt.split(".");
    const json = JSON.parse(atob(payload));
    return json._id || json.userId || json.sub || null;
  } catch {
    return null;
  }
}

function uuid() {
  // stable temp ids for optimistic messages
  return (crypto as any)?.randomUUID?.() ?? "tmp-" + Math.random().toString(36).slice(2);
}

export default function ChatPage({ chatId }: { chatId: string }) {
  const meId = useMemo(() => decodeUserIdFromJWT(TokenManager.access) || "me", []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [seenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const socket = getSocket();
    socket.emit("chat:join", { chatId });

    const onNew = (m: ChatMessage) => {
      if (m.chatId !== chatId) return;

      // If we've already stored this server id, ignore
      if (m._id && seenIds.has(m._id)) return;

      setMessages(prev => {
        // If this is my echo, replace the most recent pending bubble that matches
        if (m.senderId === meId) {
          // find the last pending message from me with same text within 10s window
          const echoedAt = new Date(m.createdAt ?? Date.now()).getTime();
          const idx = [...prev]
            .reverse()
            .findIndex(x =>
              x.pending &&
              x.senderId === meId &&
              x.text === m.text &&
              echoedAt - new Date(x.createdAt ?? Date.now()).getTime() < 10000
            );

          if (idx !== -1) {
            const realIdx = prev.length - 1 - idx;
            const next = prev.slice();
            next[realIdx] = { ...m, pending: false }; // replace optimistic with real
            if (m._id) seenIds.add(m._id);
            return next;
          }
        }

        // Otherwise (not mine or no pending to replace) append if not already present
        if (m._id && prev.some(x => x._id === m._id)) return prev;
        if (m._id) seenIds.add(m._id);
        return prev.concat(m);
      });
    };

    socket.on("message:new", onNew);

    (async () => {
      const data = await getMessages(chatId);
      data.items.forEach((m: ChatMessage) => m._id && seenIds.add(m._id));
      setMessages(data.items);
    })();

    return () => {
      socket.emit("chat:leave", { chatId });
      socket.off("message:new", onNew);
    };
  }, [chatId, meId, seenIds]);

  const send = (text: string) => {
    const tempId = uuid();
    const optimistic: ChatMessage = {
      _id: tempId,           // temp key for React
      chatId,
      senderId: meId,
      text,
      createdAt: new Date().toISOString(),
      pending: true,         // <-- shows "sending…"
    };

    setSending(true);
    setMessages(prev => prev.concat(optimistic));

    // No backend change required: we still emit without clientId.
    // The onNew handler above will replace this optimistic bubble when the
    // server echoes my real message back.
    getSocket().emit("message:send", { chatId, text }, () => {
      // ack only clears button state; replacement happens when echo arrives
      setSending(false);
    });
  };

  return (
    <div className="chat-shell">
      <div className="chat-card">
        <ChatHeader chatId={chatId} title="Chat" />
        <MessageList messages={messages} meId={meId} />
        <Composer disabled={sending} onSend={send} />
      </div>
    </div>
  );
}
