/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { getMessages } from "../services/chat.service";
import { getSocket } from "../services/socket.service";

export default function ChatPage({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("chat:join", { chatId });

    socket.on("message:new", (m: any) => {
      if (m.chatId === chatId) setMessages(prev => [...prev, m]);
    });

    (async () => {
      const data = await getMessages(chatId);
      setMessages(data.items);
    })();

    return () => {
      socket.emit("chat:leave", { chatId });
      socket.off("message:new");
    };
  }, [chatId]);

  const send = () => {
    const text = inputRef.current?.value?.trim();
    if (!text) return;
    getSocket().emit("message:send", { chatId, text });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh" }}>
      <div style={{ flex:1, overflowY:"auto", padding:12 }}>
        {messages.map(m => (
          <div key={m._id} style={{ marginBottom:8 }}>
            <b>{m.senderId.slice(-4)}:</b> {m.text}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, padding:12 }}>
        <input ref={inputRef} placeholder="כתוב הודעה…" style={{ flex:1 }} onKeyDown={(e)=>e.key==='Enter' && send()}/>
        <button onClick={send}>שלח</button>
      </div>
    </div>
  );
}
