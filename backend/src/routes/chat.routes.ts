import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { ChatController } from "src/controllers/chat.controller";

export const chatRouter = Router();

// יצירת צ’אט חדש
chatRouter.post("/", authMiddleware, ChatController.createChat);

// טעינת הודעות מצ’אט
chatRouter.get("/:chatId/messages", authMiddleware, ChatController.getMessages);
