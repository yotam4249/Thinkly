import Redis from "ioredis";

const url = process.env.REDIS_URL || "redis://localhost:6379";
export const redis = new Redis(url, {
  maxRetriesPerRequest: 2,
});

redis.on("error", (e) => console.error("[redis] error:", e));
redis.on("connect", () => console.log("[redis] connected"));

export default redis;
