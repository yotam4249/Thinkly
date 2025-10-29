// src/routes/ai.qa.route.ts
import express from "express";
import { qaAnswer } from "../controllers/ai.qa.controller";

export const aiQaRouter = express.Router();

// POST /api/ai/qa
aiQaRouter.post("/qa", qaAnswer);
