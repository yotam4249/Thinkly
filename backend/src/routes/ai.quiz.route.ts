// src/routes/ai.quiz.route.ts
import express from "express";
import { quizGenerate } from "../controllers/ai.quiz.controller";

export const aiQuizRouter = express.Router();

// POST /api/ai/quiz
aiQuizRouter.post("/quiz", quizGenerate);
