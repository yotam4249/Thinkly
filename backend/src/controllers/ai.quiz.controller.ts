// src/controllers/ai.quiz.controller.ts
import { Request, Response } from "express";
import {
  getCachedQuiz,
  setCachedQuiz,
  type QuizPayload,
} from "../services/aiCache.service";
import { generateOpenAIQuiz } from "../services/openai.service";

function isValidQuizShape(obj: any): obj is QuizPayload {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.topic !== "string" || typeof obj.level !== "string") return false;
  if (!Array.isArray(obj.items) || obj.items.length === 0) return false;
  for (const it of obj.items) {
    if (typeof it?.id !== "string") return false;
    if (!["mcq", "open"].includes(it?.type)) return false;
    if (typeof it?.question !== "string") return false;
    if (it.type === "mcq") {
      if (!Array.isArray(it.options) || it.options.length !== 4) return false;
      if (typeof it.answer !== "string") return false;
    } else {
      if (typeof it.answer !== "string") return false;
    }
  }
  return true;
}

export async function quizGenerate(req: Request, res: Response) {
  try {
    const topic = (req.body?.topic ?? "").toString();
    const level = (req.body?.level ?? "").toString();
    if (!topic.trim() || !level.trim()) {
      return res.status(400).json({ error: "Missing topic/level" });
    }

    // 1) Try cache
    const cached = await getCachedQuiz(topic, level);
    if (cached) {
      return res.json({ cached: true, quiz: cached });
    }

    // 2) Ask OpenAI for JSON quiz, validate, store, return
    const jsonStr = await generateOpenAIQuiz(topic, level);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(502).json({ error: "openai_bad_json" });
    }

    if (!isValidQuizShape(parsed)) {
      return res.status(502).json({ error: "openai_shape_invalid", data: parsed });
    }

    await setCachedQuiz(topic, level, parsed);
    return res.json({ cached: false, quiz: parsed });
  } catch (err) {
    console.error("[ai.quiz] error:", err);
    return res.status(500).json({ error: "server_error" });
  }
}
