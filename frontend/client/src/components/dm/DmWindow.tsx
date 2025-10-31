// src/components/dm/DmWindow.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDmWindows } from "./DmWindowsProvider";
import { getMessages } from "../../services/chat.service";
import { getSocket } from "../../services/socket.service";
import type { ChatMessage } from "../../types/chat.type";
import "../../styles/dm.css";

type Props = {
  chatId: string;
  title: string;
  index: number; // stacking offset/index
};

const DEBUG_DM = true;
const log = (...a: any[]) => DEBUG_DM && console.log("[DM]", ...a);

function uuid() {
  return (crypto as any)?.randomUUID?.() ?? "tmp-" + Math.random().toString(36).slice(2);
}

export function DmWindow({ chatId, title, index }: Props) {
  const { closeWindow, minimizeWindow, bringToFront, windows } = useDmWindows();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pendingEchos = useRef<Record<string, number>>({}); // clientId -> timestamp

  const minimized = useMemo(
    () => windows.find((w) => w.chatId === chatId)?.minimized ?? false,
    [windows, chatId]
  );

  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const normalize = (m: any): ChatMessage => ({
    _id: String(m._id ?? m.id ?? uuid()),
    chatId: String(m.chatId ?? chatId),
    senderId: String(m.senderId ?? m.sender?._id ?? ""),
    text: String(m.text ?? m.content ?? ""),
    createdAt: m.createdAt ?? m.timestamp ?? new Date().toISOString(),
    // pending/clientId are client-only
  });

  useEffect(() => {
    log("DmWindow mount", { chatId, title, index });

    (async () => {
      try {
        setLoading(true);
        log("Fetching history via getMessages", { chatId });
        const res = await getMessages(chatId);
        const list = Array.isArray(res) ? res : (res.items ?? []);
        log("History fetched", { count: list.length, sample: list[0] });
        setMsgs(list.slice(-30).map(normalize));
      } catch (e) {
        log("History fetch error:", e);
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 0);
      }
    })();

    const s = getSocket();

    // socket lifecycle logs
    if (s.connected) log("socket: connected", { id: s.id });
    else log("socket: not connected yet", { id: s.id });

    const onConnect = () => log("socket: connect", { id: s.id });
    const onDisconnect = (reason: any) => log("socket: disconnect", { reason });
    const onConnectError = (err: any) => log("socket: connect_error", err?.message ?? err);
    const onError = (err: any) => log("socket: error", err);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);
    s.on("error", onError);

    // RAW event spy (keep during debugging)
    const onAny = (event: string, ...args: any[]) =>
      console.log("%c[SOCKET RAW EVENT]", "color:#0ff", event, args?.[0]);
    (s as any).onAny?.(onAny);

    // ✅ USE YOUR SERVER EVENT NAMES
    log("emit -> chat:join", { chatId });
    s.emit?.("chat:join", { chatId });

    const onMessageNew = (payload: any) => {
      log("<- message:new", payload);

      // Some server messages might omit chatId; force it if missing
      const p = { chatId, ...payload };
      if (String(p.chatId) !== String(chatId)) {
        log("ignored (different chatId)", { expected: chatId, got: p.chatId });
        return;
      }

      const incoming = normalize(p);

      setMsgs((prev) => {
        // Try to reconcile with last pending message with same text
        const revIdx = [...prev].reverse().findIndex((m) => m.pending && m.text === incoming.text);
        if (revIdx !== -1) {
          const realIndex = prev.length - 1 - revIdx;
          const copy = prev.slice();
          copy[realIndex] = { ...incoming, pending: false, clientId: undefined };
          return copy;
        }
        return [...prev, incoming];
      });

      setTimeout(scrollToBottom, 0);
    };

    s.on?.("message:new", onMessageNew);

    return () => {
      log("DmWindow unmount", { chatId });

      s.off?.("message:new", onMessageNew);
      (s as any).offAny?.(onAny);
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.off("error", onError);

      // ✅ USE YOUR SERVER EVENT NAME
      s.emit?.("chat:leave", { chatId });
      log("emit -> chat:leave", { chatId });
    };
  }, [chatId]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    const clientId = uuid();

    // optimistic
    const optimistic: ChatMessage = {
      _id: clientId,
      chatId,
      senderId: "me",
      text,
      createdAt: new Date().toISOString(),
      pending: true,
      clientId,
    };
    setMsgs((prev) => [...prev, optimistic]);
    setInput("");
    setTimeout(scrollToBottom, 0);

    try {
      const s = getSocket();

      // ✅ USE YOUR SERVER EVENT NAME & PAYLOAD SHAPE
      const payload = { chatId, text };
      log("emit -> message:send", payload, { socketConnected: s.connected, socketId: s.id });
      s.emit?.("message:send", payload);

      // Warn if no echo within 4s (until we see message:new)
      pendingEchos.current[clientId] = Date.now();
      setTimeout(() => {
        if (pendingEchos.current[clientId]) {
          log("⚠️ No message:new echo after 4s", {
            clientId,
            chatId,
            text,
            socketConnected: s.connected,
            socketId: s.id,
          });
        }
      }, 4000);
    } catch (e) {
      log("send error", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`dm-window ${minimized ? "min" : ""}`}
      style={{ right: 20 + index * 320 }}
      onMouseDown={() => bringToFront(chatId)}
    >
      <div className="dmw-header" onDoubleClick={() => minimizeWindow(chatId, !minimized)}>
        <div className="dmw-title" title={title}>
          {title || "(DM)"}
        </div>
        <div className="dmw-actions">
          <button onClick={(e) => { e.stopPropagation(); minimizeWindow(chatId, !minimized); }}>
            {minimized ? "▢" : "—"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); closeWindow(chatId); }}>✕</button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="dmw-body" ref={scrollerRef}>
            {loading && <div className="dmw-loading">Loading…</div>}
            {!loading && msgs.length === 0 && <div className="dmw-empty">Say hi 👋</div>}
            {msgs.map((m) => (
              <div key={m._id} className={`dmw-msg ${m.pending ? "ghost" : ""}`}>
                <div className="dmw-bubble">
                  <div className="dmw-text">{m.text}</div>
                  <div className="dmw-time">
                    {new Date(m.createdAt ?? Date.now()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="dmw-composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Type a message…"
              disabled={sending}
            />
            <button onClick={send} disabled={sending || !input.trim()}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}
