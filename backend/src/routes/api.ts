// src/api.ts
import express from "express";
import { authRouter } from "./auth.routes";
import { chatRouter } from "./chat.routes";

export const apiRouter = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.get("/health", (_req, res) => res.json({ ok: true }));
