/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useEffect, useMemo, useRef, useState } from "react";
// import { useLocation } from "react-router-dom";
// import { getMessages } from "../services/chat.service";
// import { getSocket } from "../services/socket.service";
// import { TokenManager } from "../services/api";
// import { ChatHeader } from "../components/chat/ChatHeader";
// import { MessageList } from "../components/chat/MessageList";
// import { Composer } from "../components/chat/Composer";
// import type { ChatMessage } from "../types/chat.type";
// import "../styles/chat.css";

// function decodeUserIdFromJWT(jwt?: string | null): string | null {
//   try {
//     if (!jwt) return null;
//     const [, payload] = jwt.split(".");
//     const json = JSON.parse(atob(payload));
//     // include `id` (many backends use this) in addition to `_id`, `userId`, `sub`
//     return json._id || json.id || json.userId || json.sub || null;
//   } catch {
//     return null;
//   }
// }

// function uuid() {
//   // stable temp ids for optimistic messages
//   return (crypto as any)?.randomUUID?.() ?? "tmp-" + Math.random().toString(36).slice(2);
// }

// type RouteState = { title?: string } | null;

// export default function ChatPage({ chatId }: { chatId: string }) {
//   const meId = useMemo(() => decodeUserIdFromJWT(TokenManager.access) || "me", []);
//   const location = useLocation();
//   const routeState = (location.state as RouteState) || null;
//   const chatTitle = routeState?.title || "(untitled)";

//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [sending, setSending] = useState(false);

//   // keep mutable helpers in refs so handlers always see latest state
//   const seenIdsRef = useRef<Set<string>>(new Set());
//   const msgsRef = useRef<ChatMessage[]>([]);
//   msgsRef.current = messages;

//   useEffect(() => {
//     const socket = getSocket();
//     socket.emit("chat:join", { chatId });

//     const onNew = (raw: any) => {
//       // normalize payload shape a bit (createdAt can be Date or string)
//       const m: ChatMessage = {
//         _id: String(raw._id),
//         chatId: String(raw.chatId),
//         senderId: String(raw.senderId),
//         text: String(raw.text ?? ""),
//         createdAt:
//           typeof raw.createdAt === "string"
//             ? raw.createdAt
//             : new Date(raw.createdAt ?? Date.now()).toISOString(),
//       };

//       if (m.chatId !== chatId) return;
//       if (m._id && seenIdsRef.current.has(m._id)) return;

//       setMessages((prev) => {
//         // Heuristic replace: match my last pending bubble with same sender+text within 60s
//         const echoedAt = new Date(m.createdAt ?? Date.now()).getTime();
//         const rev = [...prev].reverse();
//         const jRev = rev.findIndex(
//           (x) =>
//             x.pending &&
//             x.senderId === meId && // my pending bubble
//             x.text === m.text &&
//             Math.abs(echoedAt - new Date(x.createdAt ?? Date.now()).getTime()) < 60_000
//         );

//         if (jRev !== -1) {
//           const j = prev.length - 1 - jRev;
//           const next = prev.slice();
//           next[j] = { ...m, pending: false };
//           if (m._id) seenIdsRef.current.add(m._id);
//           return next;
//         }

//         // otherwise, if not already present by _id, append as a new message
//         if (m._id && prev.some((x) => x._id === m._id)) return prev;
//         if (m._id) seenIdsRef.current.add(m._id);
//         return prev.concat({ ...m, pending: false });
//       });
//     };

//     socket.on("message:new", onNew);

//     (async () => {
//       const data = await getMessages(chatId);
//       // mark the fetched history as seen & non-pending
//       data.items.forEach((m: ChatMessage) => m._id && seenIdsRef.current.add(m._id));
//       setMessages(
//         data.items.map((m: any) => ({
//           _id: String(m._id),
//           chatId: String(m.chatId),
//           senderId: String(m.senderId),
//           text: String(m.text ?? ""),
//           createdAt:
//             typeof m.createdAt === "string"
//               ? m.createdAt
//               : new Date(m.createdAt ?? Date.now()).toISOString(),
//           pending: false,
//         }))
//       );
//     })();

//     return () => {
//       socket.emit("chat:leave", { chatId });
//       socket.off("message:new", onNew);
//     };
//   }, [chatId, meId]);

//   const send = (text: string) => {
//     const clean = (text ?? "").trim();
//     if (!clean) return; // mirror server's empty-guard

//     const clientId = uuid();
//     const optimistic: ChatMessage = {
//       _id: clientId, // local React key only
//       clientId, // kept for future use; server doesn't echo it
//       chatId,
//       senderId: meId, // must match what server will echo back
//       text: clean, // trimmed to match server's "clean"
//       createdAt: new Date().toISOString(),
//       pending: true,
//     };

//     setSending(true);
//     setMessages((prev) => prev.concat(optimistic));

//     // send trimmed text; keep clientId in case you later choose to echo it server-side
//     getSocket().emit(
//       "message:send",
//       { chatId, text: clean, clientId },
//       (_ack?: { ok: boolean }) => {
//         setSending(false);
//         // we still rely on "message:new" to replace the optimistic bubble
//       }
//     );
//   };

//   return (
//     <div className="chat-shell">
//       <div className="chat-card">
//         <ChatHeader chatId={chatId} title={chatTitle} />
//         <MessageList messages={messages} meId={meId} />
//         <Composer disabled={sending} onSend={send} />
//       </div>
//     </div>
//   );
// }


/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getMessages, getChatMeta } from "../services/chat.service";
import { getSocket } from "../services/socket.service";
import { TokenManager } from "../services/api";
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
    return json._id || json.id || json.userId || json.sub || null;
  } catch {
    return null;
  }
}

function uuid() {
  return (crypto as any)?.randomUUID?.() ?? "tmp-" + Math.random().toString(36).slice(2);
}

type RouteState = { title?: string } | null;

// UI-only extension to include the display name
type MsgWithName = ChatMessage & { senderName?: string };

export default function ChatPage({ chatId }: { chatId: string }) {
  const meId = useMemo(() => decodeUserIdFromJWT(TokenManager.access) || "me", []);
  const location = useLocation();
  const routeState = (location.state as RouteState) || null;
  const chatTitleFromNav = routeState?.title || "(untitled)";

  const [messages, setMessages] = useState<MsgWithName[]>([]);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState(chatTitleFromNav);
  const [nameById, setNameById] = useState<Record<string, string>>({}); // { userId -> displayName }

  // mutable helpers
  const seenIdsRef = useRef<Set<string>>(new Set());
  const msgsRef = useRef<MsgWithName[]>([]);
  msgsRef.current = messages;

  // Helper: extract a nice display name from chat meta member row
  const pickDisplayName = (u: any, fallbackId: string) =>
    u?.fullName || u?.username || u?.name || u?.email || fallbackId.slice(0, 6);

  // Load chat meta (title + members) and first page of messages
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) fetch chat meta (members w/ usernames)
      try {
        const meta = await getChatMeta(chatId);
        if (cancelled) return;
        setTitle(meta.title ?? chatTitleFromNav);

        const map: Record<string, string> = {};
        for (const m of meta.members || []) {
          if (m?._id) {
            map[m._id] = pickDisplayName(m, m._id);
          }
        }
        setNameById(map);
      } catch {
        // if meta fails, keep whatever we had from nav
      }

      // 2) fetch messages
      try {
        const data = await getMessages(chatId);
        if (cancelled) return;

        data.items.forEach((m: any) => m._id && seenIdsRef.current.add(String(m._id)));

        // prefer server-provided senderName; else fall back to nameById
        setMessages(
          data.items.map((m: any) => ({
            _id: String(m._id),
            chatId: String(m.chatId),
            senderId: String(m.senderId),
            text: String(m.text ?? ""),
            createdAt:
              typeof m.createdAt === "string"
                ? m.createdAt
                : new Date(m.createdAt ?? Date.now()).toISOString(),
            pending: false,
            senderName: m.senderName ?? nameById[String(m.senderId)],
          }))
        );
      } catch {
        setMessages([]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // We want to run once per chatId; nameById will be set inside
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // When nameById arrives/changes (from chat meta), patch messages missing senderName
  useEffect(() => {
    if (!Object.keys(nameById).length || !messages.length) return;
    setMessages((prev) =>
      prev.map((m) => (m.senderName ? m : { ...m, senderName: nameById[m.senderId] }))
    );
  }, [nameById, messages.length]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("chat:join", { chatId });

    const onNew = (raw: any) => {
      // normalize; prefer raw.senderName from server if present
      const m: MsgWithName = {
        _id: String(raw._id),
        chatId: String(raw.chatId),
        senderId: String(raw.senderId),
        text: String(raw.text ?? ""),
        createdAt:
          typeof raw.createdAt === "string"
            ? raw.createdAt
            : new Date(raw.createdAt ?? Date.now()).toISOString(),
        pending: false,
        senderName: raw.senderName ?? nameById[String(raw.senderId)],
      };

      if (m.chatId !== chatId) return;
      if (m._id && seenIdsRef.current.has(m._id)) return;

      setMessages((prev) => {
        // replace my optimistic bubble heuristically (same sender+text, 60s)
        const echoedAt = new Date(m.createdAt ?? Date.now()).getTime();
        const rev = [...prev].reverse();
        const jRev = rev.findIndex(
          (x) =>
            x.pending &&
            x.senderId === meId &&
            x.text === m.text &&
            Math.abs(echoedAt - new Date(x.createdAt ?? Date.now()).getTime()) < 60_000
        );
        if (jRev !== -1) {
          const j = prev.length - 1 - jRev;
          const next = prev.slice();
          next[j] = { ...m, pending: false };
          if (m._id) seenIdsRef.current.add(m._id);
          return next;
        }

        if (m._id && prev.some((x) => x._id === m._id)) return prev;
        if (m._id) seenIdsRef.current.add(m._id);
        return prev.concat(m);
      });
    };

    socket.on("message:new", onNew);

    return () => {
      socket.emit("chat:leave", { chatId });
      socket.off("message:new", onNew);
    };
  }, [chatId, meId, nameById]);

  const send = (text: string) => {
    const clean = (text ?? "").trim();
    if (!clean) return;

    const clientId = uuid();
    const optimistic: MsgWithName = {
      _id: clientId, // local key only
      clientId,
      chatId,
      senderId: meId,
      text: clean,
      createdAt: new Date().toISOString(),
      pending: true,
      // show my name immediately if we have it from chat meta map
      senderName: nameById[meId] ?? "You",
    };

    setSending(true);
    setMessages((prev) => prev.concat(optimistic));

    getSocket().emit(
      "message:send",
      { chatId, text: clean, clientId },
      (_ack?: { ok: boolean }) => setSending(false)
    );
  };

  return (
    <div className="chat-shell">
      <div className="chat-card">
        <ChatHeader chatId={chatId} title={title} />
        <MessageList messages={messages} meId={meId} />
        <Composer disabled={sending} onSend={send} />
      </div>
    </div>
  );
}
