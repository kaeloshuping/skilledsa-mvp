// src/config/redis.ts
import { Redis } from "ioredis";
import { env } from "./env.js";

/**
 * Redis client instance.
 * Uses the REDIS_URL from environment.
 * Listens for errors and connection events.
 */
const redis = new Redis(env.REDIS_URL);

redis.on("error", (err: Error) => {
  console.error("❌ Redis error:", err);
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

export default redis;
