/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "./api";
import type { ChatListItem } from "../types/chatList.type";

export async function createChat(type: "dm" | "group", title?: string, members?: string[]) {
  const { data } = await api.post("/chat", { type, title, members });
  return data as { chatId: string };
}

export async function getMessages(chatId: string, cursor?: string) {
  const { data } = await api.get(`/chat/${chatId}/messages`, { params: { cursor, limit: 30 } });
  return data as { items: any[]; nextCursor: string | null };
}

export async function listChats(page = 1, limit = 15) {
  const { data } = await api.get("/chat", { params: { page, limit } });
  return data as {
    items: ChatListItem[];
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
