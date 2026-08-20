import { env } from '../config/env.js';
import { getLogger } from '../utils/logger.js';
import { getCachedDistance, setCachedDistance } from './cacheService.js'; // provided by BE2

/**
 * Get distance in kilometers between two points using Google Distance Matrix API.
 * Caches the result in Redis for 7 days.
 *
 * @param originLat - Latitude of origin
 * @param originLng - Longitude of origin
 * @param destLat - Latitude of destination
 * @param destLng - Longitude of destination
 * @returns Distance in kilometers, or null if calculation fails.
 */
export async function getDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<number | null> {
  const log = getLogger();

  // 1. Check cache
  const cached = await getCachedDistance(originLat, originLng, destLat, destLng);
  if (cached !== null) {
    log.debug('[BE1] - Distance cache HIT', { origin: `${originLat},${originLng}`, dest: `${destLat},${destLng}`, distance: cached });
    return cached;
  }

  // 2. Call Google API
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.append('origins', `${originLat},${originLng}`);
  url.searchParams.append('destinations', `${destLat},${destLng}`);
  url.searchParams.append('key', env.GOOGLE_MAPS_API_KEY);
  url.searchParams.append('units', 'metric');

  try {
    const response = await fetch(url.toString());
    const data = await response.json() as any;

    if (data.status !== 'OK') {
      log.error('[BE1] - Google Distance Matrix API error', { status: data.status, errorMessage: data.error_message });
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      log.error('[BE1] - Invalid distance response', { element });
      return null;
    }

    // distance in meters, convert to km
    const distanceMeters = element.distance?.value;
    if (typeof distanceMeters !== 'number') {
      log.error('[BE1] - Missing distance value', { element });
      return null;
    }

    const distanceKm = distanceMeters / 1000;

    // 3. Cache the result
    await setCachedDistance(originLat, originLng, destLat, destLng, distanceKm);
    log.debug('[BE1] - Distance cached', { origin: `${originLat},${originLng}`, dest: `${destLat},${destLng}`, distance: distanceKm });

    return distanceKm;
  } catch (error) {
    log.error('[BE1] - Distance API call failed', { error: (error as Error).message });
    return null;
  }
}