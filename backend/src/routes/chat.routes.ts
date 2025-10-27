import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { ChatController } from "../controllers/chat.controller";

export const chatRouter = Router();

chatRouter.get("/", authMiddleware, ChatController.listChats);
chatRouter.post("/", authMiddleware, ChatController.createChat);
chatRouter.get("/:chatId/messages", authMiddleware, ChatController.getMessages);
