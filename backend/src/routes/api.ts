// src/api.ts
import express from "express";
import { authRouter } from "./auth.routes";
// import other routers here:
// import { userRouter } from "./routes/user.routes";
// import { postRouter } from "./routes/post.routes";

export const apiRouter = express.Router();

// ✅ Mount all sub-routers under logical paths
apiRouter.use("/auth", authRouter);
// apiRouter.use("/users", userRouter);
// apiRouter.use("/posts", postRouter);

// Simple health route (optional)
apiRouter.get("/health", (_req, res) => res.json({ ok: true }));
