// src/services/aiCache.service.ts
import crypto from "crypto";
import redis from "./redis.service";
import { incrQuestion, incrQuiz } from "./popular.service";

const QNA_TTL_SECONDS = 7 * 24 * 60 * 60;   // 7 days
const QUIZ_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}
function h(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

// ---------- Q&A ----------
function qnaKey(normalizedQ: string) {
  return `ai:cache:qna:${h(normalizedQ)}`;
}

export async function getCachedAnswer(question: string): Promise<string | null> {
  const nq = norm(question);
  const key = qnaKey(nq);
  const ans = await redis.get(key);
  return ans ?? null;
}

export async function setCachedAnswer(question: string, answer: string): Promise<void> {
  const nq = norm(question);
  const key = qnaKey(nq);
  await redis.set(key, answer, "EX", QNA_TTL_SECONDS);
  // also bump popularity counters
  await incrQuestion(question);
}

// ---------- QUIZ ----------
function quizKey(topic: string, level: string) {
  const t = norm(topic);
  const l = norm(level);
  return `ai:cache:quiz:${h(`${t}|${l}`)}`;
}

export type QuizItem = {
  id: string;
  type: "mcq" | "open";
  question: string;
  options?: string[];
  answer: string; // canonical answer or correct option
};
export type QuizPayload = {
  topic: string;
  level: string;
  items: QuizItem[];
};

export async function getCachedQuiz(topic: string, level: string): Promise<QuizPayload | null> {
  const key = quizKey(topic, level);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuizPayload;
  } catch {
    return null;
  }
}

export async function setCachedQuiz(topic: string, level: string, quiz: QuizPayload): Promise<void> {
  const key = quizKey(topic, level);
  await redis.set(key, JSON.stringify(quiz), "EX", QUIZ_TTL_SECONDS);
  await incrQuiz(topic, level);
}
