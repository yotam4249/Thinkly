// src/services/popular.service.ts
import redis from "../services/redis.service";


const MAX_ZSET_SIZE = 5000;

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

async function trimIfNeeded(key: string) {
  try {
    const size = await redis.zcard(key);
    if (size > MAX_ZSET_SIZE) {
      // remove the lowest scorers, keep the top MAX_ZSET_SIZE
      await redis.zremrangebyrank(key, 0, size - MAX_ZSET_SIZE - 1);
    }
  } catch (err) {
    console.warn(`[popular] trim failed for ${key}:`, err);
  }
}

export async function incrQuestion(question: string) {
  const member = norm(question).slice(0, 512); // avoid overly long members
  if (!member) return;
  await redis.zincrby("ai:popular:questions", 1, member);
  // best-effort trim
  trimIfNeeded("ai:popular:questions");
}

export async function incrQuiz(topic: string, level: string) {
  const t = norm(topic).slice(0, 256);
  const l = norm(level).slice(0, 64);
  if (!t || !l) return;
  const member = `${t}|${l}`;
  await redis.zincrby("ai:popular:quizzes", 1, member);
  // best-effort trim
  trimIfNeeded("ai:popular:quizzes");
}

export async function getTopQuestions(limit = 50) {
  // returns [{ item, count }]
  const raw = await redis.zrevrange("ai:popular:questions", 0, limit - 1, "WITHSCORES");
  const out: { item: string; count: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    out.push({ item: raw[i], count: Number(raw[i + 1]) });
  }
  return out;
}

export async function getTopQuizzes(limit = 50) {
  const raw = await redis.zrevrange("ai:popular:quizzes", 0, limit - 1, "WITHSCORES");
  const out: { topic: string; level: string; count: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const [topic, level] = raw[i].split("|");
    out.push({ topic, level, count: Number(raw[i + 1]) });
  }
  return out;
}
