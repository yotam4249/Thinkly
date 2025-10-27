import { Request, Response } from "express";
import mongoose from "mongoose";
import { ChatModel } from "../models/chat.model";
import { MessageModel } from "../models/message.model";
import { redis } from "../services/redis.service"; // ⬅️ relative path

const CACHE_TTL_SECONDS = 120;

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

export class ChatController {
  static async createChat(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { title, members = [], type = "group" } = req.body ?? {};

      // validations
      if (!title) return res.status(400).json({ code: "TITLE_REQUIRED" });
      if (!["dm", "group"].includes(type)) {
        return res.status(400).json({ code: "BAD_TYPE" });
      }

      // normalize + dedupe members, ensure creator included
      const unique = new Set<string>([userId, ...members.map(String)]);
      const memberIds = Array.from(unique).map(toObjectId);

      const chat = await ChatModel.create({
        title,
        type,
        members: memberIds,
      });

      // invalidate cache for all participants
      await redis.del(`u:${userId}:recent_chats`);
      for (const m of unique) {
        if (m !== userId) await redis.del(`u:${m}:recent_chats`);
      }

      // return minimal payload used by FE
      return res.status(201).json({
        id: String(chat._id),
        title: chat.title ?? "(untitled)",
        type: chat.type,
        lastMessageText: chat.lastMessageText ?? "",
        lastMessageAt: (chat.lastMessageAt ?? chat.updatedAt)?.toISOString(),
      });
    } catch (e) {
      console.error("createChat error:", e);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { chatId } = req.params;
      const { cursor, limit = "30" } = req.query as { cursor?: string; limit?: string };

      // verify membership
      const chat = await ChatModel.findById(chatId).select("_id members");
      if (!chat) return res.status(404).json({ code: "CHAT_NOT_FOUND" });
      const isMember = chat.members.some((m) => String(m) === userId);
      if (!isMember) return res.status(403).json({ code: "FORBIDDEN" });

      const q: any = { chatId: toObjectId(chatId) }; // ⬅️ ensure ObjectId
      if (cursor) q._id = { $lt: toObjectId(cursor) };

      const pageSize = Math.min(parseInt(String(limit), 10) || 30, 100);
      const msgs = await MessageModel.find(q).sort({ _id: -1 }).limit(pageSize);

      return res.json({
        items: msgs.reverse().map((m) => ({
          _id: String(m._id),
          chatId: String(m.chatId),
          senderId: String(m.senderId),
          type: m.type,
          text: m.text,
          createdAt: m.createdAt.toISOString(),
        })),
        nextCursor: msgs.length ? String(msgs[0]._id) : null,
      });
    } catch (err) {
      console.error("getMessages error:", err);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }

  static async listChats(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      let page = parseInt(String(req.query.page ?? "1"), 10);
      let limit = parseInt(String(req.query.limit ?? "15"), 10);
      if (!Number.isFinite(page) || page < 1) page = 1;
      if (!Number.isFinite(limit) || limit < 1) limit = 15;
      if (limit > 50) limit = 50;

      const cacheKey = `u:${userId}:recent_chats`;
      let recent: any[] | null = null;

      const cached = await redis.get(cacheKey);
      if (cached) {
        try { recent = JSON.parse(cached); } catch {}
      }

      if (!recent) {
        recent = await ChatModel.find({ members: toObjectId(userId) })
          .sort({ updatedAt: -1 })
          .limit(30)
          .select("_id type title lastMessageText lastMessageAt updatedAt")
          .lean();

        await redis.set(cacheKey, JSON.stringify(recent), "EX", CACHE_TTL_SECONDS);
      }

      const start = (page - 1) * limit;
      const end = start + limit;

      // serve from cache if the requested slice is within the first 30
      if (end <= 30) {
        const slice = recent.slice(start, end).map((c) => ({
          id: String(c._id),
          type: c.type,
          title: c.title ?? "(untitled)",
          lastMessageText: c.lastMessageText ?? "",
          lastMessageAt: (c.lastMessageAt ?? c.updatedAt)?.toString(), // or toISOString()
        }));
        return res.json({
          items: slice,
          page,
          pageSize: limit,
          hasMore: recent.length > end, // cache is capped to 30; beyond that we DB-scan
        });
      }

      // fall back to DB for deeper pages
      const items = await ChatModel.find({ members: toObjectId(userId) })
        .sort({ updatedAt: -1 })
        .skip(start)
        .limit(limit)
        .select("_id type title lastMessageText lastMessageAt updatedAt")
        .lean();

      return res.json({
        items: items.map((c) => ({
          id: String(c._id),
          type: c.type,
          title: c.title ?? "(untitled)",
          lastMessageText: c.lastMessageText ?? "",
          lastMessageAt: (c.lastMessageAt ?? c.updatedAt)?.toString(), // or toISOString()
        })),
        page,
        pageSize: limit,
        hasMore: items.length === limit,
      });
    } catch (e) {
      console.error("listChats error:", e);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }
}
