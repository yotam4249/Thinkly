import { Request, Response } from "express";
import mongoose from "mongoose";
import { ChatModel } from "../models/chat.model";
import { MessageModel } from "../models/message.model";

export class ChatController {
  static async createChat(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { type, title, members = [] } = req.body ?? {};

      if (!["dm", "group"].includes(type)) {
        return res.status(400).json({ code: "BAD_TYPE" });
      }

      const memberSet = new Set<string>([userId, ...members.map(String)]);
      const chat = await ChatModel.create({
        type,
        title,
        members: Array.from(memberSet).map((id) => new mongoose.Types.ObjectId(id)),
      });

      return res.json({ chatId: chat._id });
    } catch (err) {
      console.error("createChat error:", err);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { chatId } = req.params;
      const { cursor, limit = "30" } = req.query as { cursor?: string; limit?: string };

      const chat = await ChatModel.findById(chatId).select("_id members");
      if (!chat) return res.status(404).json({ code: "CHAT_NOT_FOUND" });
      const isMember = chat.members.some((m) => String(m) === userId);
      if (!isMember) return res.status(403).json({ code: "FORBIDDEN" });

      const q: any = { chatId };
      if (cursor) q._id = { $lt: new mongoose.Types.ObjectId(cursor) };

      const pageSize = Math.min(parseInt(String(limit), 10) || 30, 100);
      const msgs = await MessageModel.find(q).sort({ _id: -1 }).limit(pageSize);

      return res.json({
        items: msgs.reverse().map((m) => ({
          _id: String(m._id),
          chatId: String(m.chatId),
          senderId: String(m.senderId),
          type: m.type,
          text: m.text,
          createdAt: m.createdAt,
        })),
        nextCursor: msgs.length ? String(msgs[0]._id) : null,
      });
    } catch (err) {
      console.error("getMessages error:", err);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }
}
