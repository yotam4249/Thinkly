import type { Server, Socket } from "socket.io";
import { ChatModel } from "../models/chat.model";
import { MessageModel } from "../models/message.model";
import { redis } from "../services/redis.service";

function roomId(chatId: string) {
  return `chat:${chatId}`;
}

export function registerChatSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    // user injected by auth middleware in initSocket (socket.data.user)
    const user = socket.data.user as { id: string; username: string } | undefined;
    if (!user) return; // just in case

    // join a chat
    socket.on("chat:join", async ({ chatId }: { chatId: string }) => {
      const chat = await ChatModel.findById(chatId).select("_id members");
      if (!chat) return;
      if (!chat.members.some((m) => String(m) === user.id)) return;
      socket.join(roomId(chatId));
    });

    // leave a chat
    socket.on("chat:leave", ({ chatId }: { chatId: string }) => {
      socket.leave(roomId(chatId));
    });

    // send message
    socket.on("message:send", async ({ chatId, text, imageUrls, type }: { 
      chatId: string; 
      text?: string; 
      imageUrls?: string[]; 
      type?: "text" | "image"; 
    }) => {
      const clean = text ? (text ?? "").trim() : "";
      const images = imageUrls && Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
      
      // Must have either text or images
      if (!clean && images.length === 0) return;

      const chat = await ChatModel.findById(chatId).select("_id members");
      if (!chat) return;
      if (!chat.members.some((m) => String(m) === user.id)) return;

      const msgType = type || (images.length > 0 ? "image" : "text");
      const lastMessageText = clean || (images.length > 0 ? `${images.length} image${images.length > 1 ? "s" : ""}` : "");

      const msg = await MessageModel.create({
        chatId,
        senderId: user.id,
        type: msgType,
        text: clean || undefined,
        imageUrls: images.length > 0 ? images : undefined,
      });

      // update chat denormalized fields
      await ChatModel.updateOne(
        { _id: chatId },
        {
          $set: { lastMessageText, lastMessageAt: msg.createdAt },
          $inc: { messageCount: 1 },
        }
      );

      // broadcast
      io.to(roomId(chatId)).emit("message:new", {
        _id: String(msg._id),
        chatId,
        senderId: user.id,
        type: msgType,
        text: clean || undefined,
        imageUrls: images.length > 0 ? images : undefined,
        createdAt: msg.createdAt,
      });

      // invalidate recent chats cache for all members
      for (const m of chat.members) {
        await redis.del(`u:${String(m)}:recent_chats`);
      }
    });
  });
}
