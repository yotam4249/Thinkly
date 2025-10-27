import dotenv from "dotenv";
import http from "http";
import { Server as IOServer, type Socket } from "socket.io";
import { connectMongo, createApp, disconnectMongo } from "./server";
import { verifyAccess } from "./services/auth.service";
import { ChatModel } from "./models/chat.model";
import { MessageModel } from "./models/message.model";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI as string;

async function start() {
  await connectMongo(MONGO_URI, process.env.MONGO_DBNAME || "adwise");
  const app = createApp();

  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: true, credentials: true } });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));
    try {
      const p = verifyAccess(token);
      socket.data.user = { id: p.sub as string, username: p.username as string };
      next();
    } catch { next(new Error("INVALID_TOKEN")); }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string; username: string };

    socket.on("chat:join", async ({ chatId }: { chatId: string }) => {
      const chat = await ChatModel.findById(chatId).select("_id members");
      if (!chat) return;
      if (!chat.members.some(m => String(m) === user.id)) return;
      socket.join(`chat:${chatId}`);
    });

    socket.on("chat:leave", ({ chatId }: { chatId: string }) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on("message:send", async ({ chatId, text }: { chatId: string; text: string }) => {
      const clean = (text ?? "").trim();
      if (!clean) return;

      const chat = await ChatModel.findById(chatId).select("_id members");
      if (!chat) return;
      if (!chat.members.some(m => String(m) === user.id)) return;

      const msg = await MessageModel.create({
        chatId,
        senderId: user.id,
        type: "text",
        text: clean,
      });

      await ChatModel.updateOne(
        { _id: chatId },
        { $set: { lastMessageText: clean, lastMessageAt: msg.createdAt }, $inc: { messageCount: 1 } }
      );

      io.to(`chat:${chatId}`).emit("message:new", {
        _id: String(msg._id),
        chatId,
        senderId: user.id,
        type: "text",
        text: clean,
        createdAt: msg.createdAt,
      });
    });
  });

  server.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));

  const bye = (sig: string) => {
    console.log(`${sig} shutting down...`);
    server.close(async () => { await disconnectMongo(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => bye("SIGINT"));
  process.on("SIGTERM", () => bye("SIGTERM"));
}

start();
