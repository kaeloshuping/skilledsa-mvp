/**
 * Cache service — provides Redis-backed caching helpers.
 *
 * Created by BE2 (Sprint 2). Used by mapsService (BE1) to cache distances
 * returned from the Google Distance Matrix API.
 *
 * All cache values are stored as JSON strings. Distance entries use a
 * 7-day TTL to minimise Google API costs.
 */
import redis from '../config/redis.js';

// ----- Generic helpers (small, reusable) -----

/**
 * Get a cached value by key. Returns the parsed JSON value, or null if missing.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    // Corrupted/legacy value — treat as a miss.
    return null;
  }
}

/**
 * Set a cached value with a TTL (in seconds). If ttlSeconds <= 0, no expiry.
 */
export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds: number = 60,
): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttlSeconds > 0) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

/**
 * Delete a cached value by key.
 */
export async function deleteCached(key: string): Promise<void> {
  await redis.del(key);
}

// ----- Distance-specific helpers -----

/** 7 days, in seconds. */
const DISTANCE_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Build a deterministic cache key for a distance calculation.
 * Rounds coordinates to 6 decimal places (~0.1 m precision) to avoid
 * cache fragmentation from floating-point noise.
 */
export function distanceCacheKey(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): string {
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  return `distance:${r(lat1)},${r(lng1)}:${r(lat2)},${r(lng2)}`;
}

/**
 * Retrieve a cached distance (km) between two points. Returns null on miss.
 */
export async function getCachedDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): Promise<number | null> {
  const key = distanceCacheKey(lat1, lng1, lat2, lng2);
  const value = await getCached<number>(key);
  console.log(`[BE2] Distance cache ${value !== null ? 'HIT' : 'MISS'}: ${key}`);
  return value;
}

/**
 * Store a distance (km) between two points with a 7-day TTL.
 */
export async function setCachedDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  distanceKm: number,
): Promise<void> {
  const key = distanceCacheKey(lat1, lng1, lat2, lng2);
  await setCached(key, distanceKm, DISTANCE_TTL_SECONDS);
  console.log(`[BE2] Distance cached (${distanceKm} km): ${key}`);
}