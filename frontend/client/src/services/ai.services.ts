/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/ai.service.ts
import api from "./api";

export type QuizItem = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0..3
};

export type QuizPayload = {
  topic: string;
  level: string;
  items: QuizItem[];
};

/**
 * Ask a normal AI question (non-quiz)
 * Automatically includes JWT from api.ts
 */
export async function askQuestion(
  question: string
): Promise<{ cached: boolean; answer: string }> {
  console.log("[FE][AI] askQuestion →", { question });

  try {
    const { data } = await api.post<{ cached: boolean; answer: string }>(
      "/ai/qa", // ✅ no double /api
      { question }
    );

    console.log("[FE][AI] askQuestion response:", data);
    return data;
  } catch (err: any) {
    console.error("[FE][AI] askQuestion error:", err?.response || err);
    throw err;
  }
}

/**
 * Generate or fetch cached quiz
 * Each quiz has 5 questions × 4 options × 1 correct answer
 */
export async function getQuiz(
  topic: string,
  level: string
): Promise<{ cached: boolean; quiz: QuizPayload }> {
  console.log("[FE][AI] getQuiz →", { topic, level });

  try {
    const { data } = await api.post<{ cached: boolean; quiz: QuizPayload }>(
      "/ai/quiz", // ✅ no double /api
      { topic, level }
    );

    console.log("[FE][AI] getQuiz response:", data);
    return data;
  } catch (err: any) {
    console.error("[FE][AI] getQuiz error:", err?.response || err);
    throw err;
  }
}
