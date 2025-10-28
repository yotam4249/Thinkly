import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { ChatController } from "../controllers/chat.controller";

export const chatRouter = Router();

chatRouter.get("/", authMiddleware, ChatController.listChats);
chatRouter.post("/", authMiddleware, ChatController.createChat);
chatRouter.get("/:chatId/messages", authMiddleware, ChatController.getMessages);
chatRouter.post("/:chatId/join", authMiddleware, ChatController.joinGroup);

// keep AFTER "/:chatId/messages" so it doesn't shadow it
chatRouter.get("/:chatId", authMiddleware, ChatController.getChat);
