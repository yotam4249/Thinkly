/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "./api";

export async function createChat(type: "dm" | "group", title?: string, members?: string[]) {
  const { data } = await api.post("/chat", { type, title, members });
  return data as { chatId: string };
}

export async function getMessages(chatId: string, cursor?: string) {
  const { data } = await api.get(`/chat/${chatId}/messages`, { params: { cursor, limit: 30 } });
  return data as { items: any[]; nextCursor: string | null };
}
