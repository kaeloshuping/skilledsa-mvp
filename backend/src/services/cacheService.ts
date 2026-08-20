import { getCached, setCached, deleteCached } from '../config/redis.js';

/**
 * Generate a cache key for distance between two coordinates.
 * Format: distance:{lat1},{lng1}:{lat2},{lng2}
 */
export function distanceCacheKey(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): string {
  // Round to 6 decimal places (approx 0.1m accuracy) to avoid too many keys
  const rounded = (v: number) => Math.round(v * 1e6) / 1e6;
  return `distance:${rounded(lat1)},${rounded(lng1)}:${rounded(lat2)},${rounded(lng2)}`;
}

/**
 * Get cached distance (in meters) between two points.
 * Returns null if not cached.
 */
export async function getCachedDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number | null> {
  const key = distanceCacheKey(lat1, lng1, lat2, lng2);
  const value = await getCached<number>(key);
  console.log(`[BE2] Cache ${value ? 'HIT' : 'MISS'} for distance key: ${key}`);
  return value;
}

/**
 * Store distance (in meters) with TTL of 7 days.
 */
export async function setCachedDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  distanceMeters: number
): Promise<void> {
  const key = distanceCacheKey(lat1, lng1, lat2, lng2);
  await setCached(key, distanceMeters, 7 * 24 * 60 * 60); // 7 days TTL
  console.log(`[BE2] Cached distance ${distanceMeters}m for key: ${key}`);
}