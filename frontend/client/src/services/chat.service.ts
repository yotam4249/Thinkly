// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import api from "./api";
// import type { ChatListItem } from "../types/chatList.type";

// type CreateChatServer =
//   | { id: string; reused?: boolean; type: "dm" | "group"; lastMessageText?: string; lastMessageAt?: string }
//   | { chatId: string; reused?: boolean };

// export async function createChat(
//   type: "dm" | "group",
//   title?: string,
//   members?: string[]
// ) {
//   const { data } = await api.post<CreateChatServer>("/chat", { type, title, members });
//   if ("chatId" in data) return { chatId: data.chatId, reused: Boolean((data as any).reused) };
//   return { chatId: data.id, reused: Boolean((data as any).reused) };
// }

// export async function getMessages(chatId: string, cursor?: string) {
//   const { data } = await api.get(`/chat/${chatId}/messages`, { params: { cursor, limit: 30 } });
//   return data as { items: any[]; nextCursor: string | null };
// }

// export async function listChats(page = 1, limit = 15) {
//   const { data } = await api.get("/chat", { params: { page, limit } });
//   return data as {
//     items: ChatListItem[];
//     page: number;
//     pageSize: number;
//     hasMore: boolean;
//   };
// }

// export async function joinGroup(chatId: string) {
//   const { data } = await api.post(`/chat/${chatId}/join`);
//   return data as { ok: boolean };
// }


// export async function getChatMeta(chatId: string) {
//   // Assumes your backend exposes: GET /chat/:chatId  -> { id, title, type, members: [{ _id, username, fullName?, name?, email? }] }
//   const { data } = await api.get(`/chat/${chatId}`);
//   return data as {
//     id: string;
//     title?: string;
//     type: "dm" | "group";
//     members: Array<{ _id: string; username?: string; fullName?: string; name?: string; email?: string }>;
//   };
// }

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "./api";
import type { ChatListItem } from "../types/chatList.type";

type CreateChatServer =
  | { id: string; reused?: boolean; type: "dm" | "group"; lastMessageText?: string; lastMessageAt?: string }
  | { chatId: string; reused?: boolean };

export async function createChat(
  type: "dm" | "group",
  title?: string,
  members?: string[]
) {
  const { data } = await api.post<CreateChatServer>("/chat", { type, title, members });
  if ("chatId" in data) return { chatId: (data as any).chatId as string, reused: Boolean((data as any).reused) };
  return { chatId: (data as any).id as string, reused: Boolean((data as any).reused) };
}

export async function getMessages(chatId: string, cursor?: string) {
  const { data } = await api.get(`/chat/${chatId}/messages`, { params: { cursor, limit: 30 } });
  // items may include senderName if backend enriched it
  return data as { items: Array<any>; nextCursor: string | null };
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

export async function joinGroup(chatId: string) {
  const { data } = await api.post(`/chat/${chatId}/join`);
  return data as { ok: boolean };
}

export async function getChatMeta(chatId: string) {
  // GET /chat/:chatId  -> { id, title, type, members: [{ _id, username, fullName?, name?, email? }] }
  const { data } = await api.get(`/chat/${chatId}`);
  return data as {
    id: string;
    title?: string;
    type: "dm" | "group";
    members: Array<{ _id: string; username?: string; fullName?: string; name?: string; email?: string }>;
  };
}
