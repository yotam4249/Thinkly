// src/controllers/ai.qa.controller.ts
import { Request, Response } from "express";
import { getCachedAnswer, setCachedAnswer } from "../services/aiCache.service";
import { askOpenAIQuestion } from "../services/openai.service";

export async function qaAnswer(req: Request, res: Response) {
  try {
    const q = (req.body?.question ?? "").toString();
    if (!q.trim()) return res.status(400).json({ error: "Missing question" });

    // 1) Try cache
    const cached = await getCachedAnswer(q);
    if (cached) {
      return res.json({ cached: true, answer: cached });
    }

    // 2) Ask OpenAI, cache, return
    const answer = await askOpenAIQuestion(q);
    if (!answer) {
      return res.status(502).json({ error: "openai_empty_answer" });
    }
    await setCachedAnswer(q, answer);
    return res.json({ cached: false, answer });
  } catch (err) {
    console.error("[ai.qa] error:", err);
    return res.status(500).json({ error: "server_error" });
  }
}
