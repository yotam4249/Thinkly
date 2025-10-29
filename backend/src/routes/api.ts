// src/routes/api.ts
import express from "express";
import { authRouter } from "./auth.routes";
import { chatRouter } from "./chat.routes";

// Your AI routers          // telemetry + popular
import { aiQaRouter } from "./ai.qa.route";       // cache-first Q&A
import { aiQuizRouter } from "./ai.quiz.route";   // cache-first quiz
// (Optional) streaming chat:
// import { aiChatRouter } from "./ai.chat.route";

export const apiRouter = express.Router();

// Core feature routes
apiRouter.use("/auth", authRouter);
apiRouter.use("/chat", chatRouter);

// AI
apiRouter.use("/ai", aiQaRouter);     // /qa
apiRouter.use("/ai", aiQuizRouter);   // /quiz
// Optional streaming chat:
// apiRouter.use("/ai", aiChatRouter); // /chat

// Health
apiRouter.get("/health", (_req, res) => res.json({ ok: true }));
