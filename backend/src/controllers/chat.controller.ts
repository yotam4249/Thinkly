// import { Request, Response } from "express";
// import mongoose from "mongoose";
// import { ChatModel } from "../models/chat.model";
// import { MessageModel } from "../models/message.model";
// import { redis } from "../services/redis.service";

// const CACHE_TTL_SECONDS = 120;
// const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

// export class ChatController {
//   static async createChat(req: Request, res: Response) {
//     try {
//       const userId = req.user!.id;
//       const { title, members = [], type = "group" } = req.body ?? {};

//       if (!["dm", "group"].includes(type)) {
//         return res.status(400).json({ code: "BAD_TYPE" });
//       }
//       if (type === "group" && !title) {
//         return res.status(400).json({ code: "TITLE_REQUIRED" });
//       }

//       if (type === "dm") {
//         const unique = new Set<string>([userId, ...members.map(String)]);
//         if (unique.size !== 2) {
//           return res.status(400).json({ code: "DM_MUST_HAVE_EXACTLY_2_MEMBERS" });
//         }
//         const pair = Array.from(unique).map(toObjectId);

//         const existing = await ChatModel.findOne({
//           type: "dm",
//           members: { $all: pair },
//           $expr: { $eq: [{ $size: "$members" }, 2] },
//         }).lean();

//         if (existing) {
//           return res.status(200).json({
//             id: String(existing._id),
//             title: existing.title ?? "(DM)",
//             type: existing.type,
//             lastMessageText: existing.lastMessageText ?? "",
//             lastMessageAt: (existing.lastMessageAt ?? existing.updatedAt)?.toISOString(),
//             reused: true,
//           });
//         }

//         const chat = await ChatModel.create({
//           type: "dm",
//           title: "(DM)",
//           members: pair,
//         });

//         for (const m of pair) {
//           await redis.del(`u:${String(m)}:recent_chats`);
//         }

//         return res.status(201).json({
//           id: String(chat._id),
//           title: chat.title,
//           type: chat.type,
//           lastMessageText: chat.lastMessageText ?? "",
//           lastMessageAt: (chat.lastMessageAt ?? chat.updatedAt)?.toISOString(),
//         });
//       }

//       // GROUP
//       const unique = new Set<string>([userId, ...members.map(String)]);
//       const memberIds = Array.from(unique).map(toObjectId);

//       const chat = await ChatModel.create({
//         title,
//         type: "group",
//         members: memberIds,
//       });

//       await redis.del(`u:${userId}:recent_chats`);

//       return res.status(201).json({
//         id: String(chat._id),
//         title: chat.title ?? "(untitled)",
//         type: chat.type,
//         lastMessageText: chat.lastMessageText ?? "",
//         lastMessageAt: (chat.lastMessageAt ?? chat.updatedAt)?.toISOString(),
//       });
//     } catch (e) {
//       console.error("createChat error:", e);
//       return res.status(500).json({ code: "SERVER_ERROR" });
//     }
//   }

//   static async getMessages(req: Request, res: Response) {
//     try {
//       const userId = req.user!.id;
//       const { chatId } = req.params;
//       const { cursor, limit = "30" } = req.query as { cursor?: string; limit?: string };

//       const chat = await ChatModel.findById(chatId).select("_id type members").lean();
//       if (!chat) return res.status(404).json({ code: "CHAT_NOT_FOUND" });

//       if (chat.type === "dm") {
//         const isMember = (chat.members ?? []).some((m) => String(m) === userId);
//         if (!isMember) return res.status(403).json({ code: "FORBIDDEN" });
//       }
//       // groups are public-readable

//       const q: any = { chatId: toObjectId(chatId) };
//       if (cursor) q._id = { $lt: toObjectId(cursor) };

//       const pageSize = Math.min(parseInt(String(limit), 10) || 30, 100);
//       const msgs = await MessageModel.find(q).sort({ _id: -1 }).limit(pageSize);

//       return res.json({
//         items: msgs.reverse().map((m) => ({
//           _id: String(m._id),
//           chatId: String(m.chatId),
//           senderId: String(m.senderId),
//           type: m.type,
//           text: m.text,
//           createdAt: m.createdAt.toISOString(),
//         })),
//         nextCursor: msgs.length ? String(msgs[0]._id) : null,
//       });
//     } catch (err) {
//       console.error("getMessages error:", err);
//       return res.status(500).json({ code: "SERVER_ERROR" });
//     }
//   }

//   // Helper to map chat doc -> response item with isMember flag
//   private static mapItem(c: any, userId: string) {
//     const isMember =
//       c.type === "dm"
//         ? true
//         : Array.isArray(c.members) && c.members.some((m: any) => String(m) === userId);

//     return {
//       id: String(c._id),
//       type: c.type,
//       title: c.title ?? "(untitled)",
//       lastMessageText: c.lastMessageText ?? "",
//       lastMessageAt: (c.lastMessageAt ?? c.updatedAt)?.toString(),
//       isMember,
//     };
//   }

//   static async listChats(req: Request, res: Response) {
//     try {
//       const userId = req.user!.id;

//       let page = parseInt(String(req.query.page ?? "1"), 10);
//       let limit = parseInt(String(req.query.limit ?? "15"), 10);
//       if (!Number.isFinite(page) || page < 1) page = 1;
//       if (!Number.isFinite(limit) || limit < 1) limit = 15;
//       if (limit > 50) limit = 50;

//       const cacheKey = `u:${userId}:recent_chats`;
//       let recent: any[] | null = null;

//       const cached = await redis.get(cacheKey);
//       if (cached) {
//         try { recent = JSON.parse(cached); } catch {}
//       }

//       if (!recent) {
//         // include members so we can compute isMember for groups
//         const myChats = await ChatModel.find({ members: toObjectId(userId) })
//           .sort({ updatedAt: -1 })
//           .limit(30)
//           .select("_id type title lastMessageText lastMessageAt updatedAt members")
//           .lean();

//         const publicGroups = await ChatModel.find({ type: "group" })
//           .sort({ updatedAt: -1 })
//           .limit(30)
//           .select("_id type title lastMessageText lastMessageAt updatedAt members")
//           .lean();

//         const map = new Map<string, any>();
//         for (const c of [...myChats, ...publicGroups]) {
//           map.set(String(c._id), c);
//         }
//         recent = Array.from(map.values()).sort(
//           (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//         );

//         await redis.set(cacheKey, JSON.stringify(recent), "EX", CACHE_TTL_SECONDS);
//       }

//       const start = (page - 1) * limit;
//       const end = start + limit;

//       if (end <= 30) {
//         const slice = recent.slice(start, end).map((c) => ChatController.mapItem(c, userId));
//         return res.json({
//           items: slice,
//           page,
//           pageSize: limit,
//           hasMore: recent.length > end,
//         });
//       }

//       // deep pages
//       const myChatsAll = await ChatModel.find({ members: toObjectId(userId) })
//         .sort({ updatedAt: -1 })
//         .select("_id type title lastMessageText lastMessageAt updatedAt members")
//         .lean();

//       const publicGroupsAll = await ChatModel.find({ type: "group" })
//         .sort({ updatedAt: -1 })
//         .select("_id type title lastMessageText lastMessageAt updatedAt members")
//         .lean();

//       const allMap = new Map<string, any>();
//       for (const c of [...myChatsAll, ...publicGroupsAll]) {
//         allMap.set(String(c._id), c);
//       }
//       const all = Array.from(allMap.values()).sort(
//         (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//       );

//       const pageItems = all.slice(start, end);

//       return res.json({
//         items: pageItems.map((c) => ChatController.mapItem(c, userId)),
//         page,
//         pageSize: limit,
//         hasMore: end < all.length,
//       });
//     } catch (e) {
//       console.error("listChats error:", e);
//       return res.status(500).json({ code: "SERVER_ERROR" });
//     }
//   }

//   static async joinGroup(req: Request, res: Response) {
//     try {
//       const userId = req.user!.id;
//       const { chatId } = req.params;

//       const chat = await ChatModel.findById(chatId).select("_id type members");
//       if (!chat) return res.status(404).json({ code: "CHAT_NOT_FOUND" });
//       if (chat.type !== "group") return res.status(400).json({ code: "NOT_A_GROUP" });

//       const already = chat.members.some((m) => String(m) === userId);
//       if (!already) {
//         chat.members.push(toObjectId(userId));
//         await chat.save();
//         await redis.del(`u:${userId}:recent_chats`);
//       }

//       return res.json({ ok: true });
//     } catch (e) {
//       console.error("joinGroup error:", e);
//       return res.status(500).json({ code: "SERVER_ERROR" });
//     }
//   }
// }
import { Request, Response } from "express";
import mongoose from "mongoose";
import { ChatModel } from "../models/chat.model";
import { MessageModel } from "../models/message.model";
import { redis } from "../services/redis.service";

const CACHE_TTL_SECONDS = 120;
const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

// Robust ISO formatter (handles Date | string | undefined)
const toIso = (v: any): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
};

// Build a nice display name from a populated user object
const computeSenderName = (u: any, fallbackId: string) =>
  u?.fullName || u?.username || u?.name || u?.email || fallbackId.slice(0, 6);

export class ChatController {
  static async createChat(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { title, members = [], type = "group" } = req.body ?? {};

      if (!["dm", "group"].includes(type)) {
        return res.status(400).json({ code: "BAD_TYPE" });
      }
      if (type === "group" && !title) {
        return res.status(400).json({ code: "TITLE_REQUIRED" });
      }

      if (type === "dm") {
        const unique = new Set<string>([userId, ...members.map(String)]);
        if (unique.size !== 2) {
          return res.status(400).json({ code: "DM_MUST_HAVE_EXACTLY_2_MEMBERS" });
        }
        const pair = Array.from(unique).map(toObjectId);

        const existing = await ChatModel.findOne({
          type: "dm",
          members: { $all: pair },
          $expr: { $eq: [{ $size: "$members" }, 2] },
        }).lean();

        if (existing) {
          return res.status(200).json({
            id: String(existing._id),
            title: existing.title ?? "(DM)",
            type: existing.type,
            lastMessageText: existing.lastMessageText ?? "",
            lastMessageAt: toIso(existing.lastMessageAt ?? existing.updatedAt),
            reused: true,
          });
        }

        const chat = await ChatModel.create({
          type: "dm",
          title: "(DM)",
          members: pair,
        });

        for (const m of pair) {
          await redis.del(`u:${String(m)}:recent_chats`);
        }

        return res.status(201).json({
          id: String(chat._id),
          title: chat.title,
          type: chat.type,
          lastMessageText: chat.lastMessageText ?? "",
          lastMessageAt: toIso(chat.lastMessageAt ?? chat.updatedAt),
        });
      }

      // GROUP
      const unique = new Set<string>([userId, ...members.map(String)]);
      const memberIds = Array.from(unique).map(toObjectId);

      const chat = await ChatModel.create({
        title,
        type: "group",
        members: memberIds,
      });

      await redis.del(`u:${userId}:recent_chats`);

      return res.status(201).json({
        id: String(chat._id),
        title: chat.title ?? "(untitled)",
        type: chat.type,
        lastMessageText: chat.lastMessageText ?? "",
        lastMessageAt: toIso(chat.lastMessageAt ?? chat.updatedAt),
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

      const chat = await ChatModel.findById(chatId).select("_id type members").lean();
      if (!chat) return res.status(404).json({ code: "CHAT_NOT_FOUND" });

      if (chat.type === "dm") {
        const isMember = (chat.members ?? []).some((m) => String(m) === userId);
        if (!isMember) return res.status(403).json({ code: "FORBIDDEN" });
      }
      // groups are public-readable

      const q: any = { chatId: toObjectId(chatId) };
      if (cursor) q._id = { $lt: toObjectId(cursor) };

      const pageSize = Math.min(parseInt(String(limit), 10) || 30, 100);

      const msgs = await MessageModel.find(q)
        .sort({ _id: -1 })
        .limit(pageSize)
        .populate({ path: "senderId", select: "_id username fullName name email" })
        .lean();

      const items = msgs.reverse().map((m: any) => {
        const senderObj = m.senderId && typeof m.senderId === "object" ? m.senderId : null;
        const senderId = String(senderObj?._id ?? m.senderId);
        const senderName = computeSenderName(senderObj, senderId);

        return {
          _id: String(m._id),
          chatId: String(m.chatId),
          senderId,
          type: m.type,
          text: m.text,
          createdAt: toIso(m.createdAt),
          senderName, // enriched here
        };
      });

      return res.json({
        items,
        nextCursor: msgs.length ? String(msgs[0]._id) : null,
      });
    } catch (err) {
      console.error("getMessages error:", err);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }

  // Helper to map chat doc -> response item with isMember flag
  private static mapItem(c: any, userId: string) {
    const isMember =
      c.type === "dm"
        ? true
        : Array.isArray(c.members) && c.members.some((m: any) => String(m) === userId);

    // IMPORTANT: lastMessageAt/updatedAt may be Date (DB) or string (Redis JSON)
    const lastIso = toIso(c.lastMessageAt ?? c.updatedAt);

    return {
      id: String(c._id),
      type: c.type,
      title: c.title ?? "(untitled)",
      lastMessageText: c.lastMessageText ?? "",
      lastMessageAt: lastIso, // safe ISO string (or undefined)
      isMember,
    };
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
        try {
          recent = JSON.parse(cached);
        } catch {}
      }

      if (!recent) {
        // include members so we can compute isMember for groups
        const myChats = await ChatModel.find({ members: toObjectId(userId) })
          .sort({ updatedAt: -1 })
          .limit(30)
          .select("_id type title lastMessageText lastMessageAt updatedAt members")
          .lean();

        const publicGroups = await ChatModel.find({ type: "group" })
          .sort({ updatedAt: -1 })
          .limit(30)
          .select("_id type title lastMessageText lastMessageAt updatedAt members")
          .lean();

        const map = new Map<string, any>();
        for (const c of [...myChats, ...publicGroups]) {
          map.set(String(c._id), c);
        }
        recent = Array.from(map.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        // (Optional) You could normalize dates here before caching.
        await redis.set(cacheKey, JSON.stringify(recent), "EX", CACHE_TTL_SECONDS);
      }

      const start = (page - 1) * limit;
      const end = start + limit;

      if (end <= 30) {
        const slice = recent.slice(start, end).map((c) => ChatController.mapItem(c, userId));
        return res.json({
          items: slice,
          page,
          pageSize: limit,
          hasMore: recent.length > end,
        });
      }

      // deep pages (no cache)
      const myChatsAll = await ChatModel.find({ members: toObjectId(userId) })
        .sort({ updatedAt: -1 })
        .select("_id type title lastMessageText lastMessageAt updatedAt members")
        .lean();

      const publicGroupsAll = await ChatModel.find({ type: "group" })
        .sort({ updatedAt: -1 })
        .select("_id type title lastMessageText lastMessageAt updatedAt members")
        .lean();

      const allMap = new Map<string, any>();
      for (const c of [...myChatsAll, ...publicGroupsAll]) {
        allMap.set(String(c._id), c);
      }
      const all = Array.from(allMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const pageItems = all.slice(start, end);

      return res.json({
        items: pageItems.map((c) => ChatController.mapItem(c, userId)),
        page,
        pageSize: limit,
        hasMore: end < all.length,
      });
    } catch (e) {
      console.error("listChats error:", e);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }

  static async joinGroup(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { chatId } = req.params;

      const chat = await ChatModel.findById(chatId).select("_id type members");
      if (!chat) return res.status(404).json({ code: "CHAT_NOT_FOUND" });
      if (chat.type !== "group") return res.status(400).json({ code: "NOT_A_GROUP" });

      const already = chat.members.some((m) => String(m) === userId);
      if (!already) {
        chat.members.push(toObjectId(userId));
        await chat.save();
        await redis.del(`u:${userId}:recent_chats`);
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error("joinGroup error:", e);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }

  // Chat meta (title + members with names/emails)
  static async getChat(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { chatId } = req.params;

      const chat = await ChatModel.findById(chatId)
        .populate({ path: "members", select: "_id username fullName name email" })
        .lean();

      if (!chat) return res.status(404).json({ code: "CHAT_NOT_FOUND" });

      // Privacy: DM meta only for members; groups are public
      if (chat.type === "dm") {
        const isMember = (chat.members ?? []).some((m: any) => String(m._id) === userId);
        if (!isMember) return res.status(403).json({ code: "FORBIDDEN" });
      }

      return res.json({
        id: String(chat._id),
        title: chat.title ?? "(untitled)",
        type: chat.type,
        members: (chat.members ?? []).map((u: any) => ({
          _id: String(u._id),
          username: u.username,
          fullName: u.fullName,
          name: u.name,
          email: u.email,
        })),
      });
    } catch (e) {
      console.error("getChat error:", e);
      return res.status(500).json({ code: "SERVER_ERROR" });
    }
  }
}
