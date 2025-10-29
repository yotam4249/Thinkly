// src/routes/ai.quiz.route.ts
import express from "express";
import { quizGenerate } from "../controllers/ai.quiz.controller";

export const aiQuizRouter = express.Router();

aiQuizRouter.post("/quiz", (req, res, next) => {
  console.log("[ROUTE] POST /api/ai/quiz body:", req.body);
  next();
}, quizGenerate);
