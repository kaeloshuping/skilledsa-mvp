import { Redis } from 'ioredis';
import { env } from './env.js';

const redis = new Redis(env.REDIS_URL);

redis.on('error', (err: Error) => {
  console.error('[BE2] ❌ Redis error:', err);
});

redis.on('connect', () => {
  console.log('[BE2] ✅ Connected to Redis');
});

// ----- Caching helpers -----

/**
 * Get cached value by key. Returns parsed JSON, or null if not found.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Set cached value with TTL (seconds). If ttlSeconds is 0, no expiry.
 */
export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds: number = 60
): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttlSeconds > 0) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

/**
 * Delete cached value by key.
 */
export async function deleteCached(key: string): Promise<void> {
  await redis.del(key);
}

export default redis;