import { Prisma } from '@prisma/client';

/**
 * Build a Prisma SQL filter that selects jobs within a radius (km) of a given point.
 * Uses PostGIS ST_DWithin on the geography column.
 *
 * @param lat - Latitude of center point
 * @param lng - Longitude of center point
 * @param radiusKm - Search radius in kilometers
 * @returns Prisma SQL fragment for use in a `where` clause.
 *
 * Example:
 *   const where = Prisma.sql`${geo.buildDistanceFilter(lat, lng, 10)}`;
 *   const jobs = await prisma.job.findMany({
 *     where: { ...where },
 *   });
 */
export function buildDistanceFilter(
  lat: number,
  lng: number,
  radiusKm: number
): Prisma.Sql {
  const radiusMeters = radiusKm * 1000;
  // Use ST_SetSRID and ST_MakePoint to create a geography point.
  // Note: PostGIS expects longitude first, then latitude.
  return Prisma.sql`
    ST_DWithin(
      "location",
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radiusMeters}
    )
  `;
}

/**
 * Alternative: if you need to order by distance, you can build a similar expression.
 */
export function buildDistanceOrderBy(
  lat: number,
  lng: number
): Prisma.Sql {
  return Prisma.sql`
    ST_Distance(
      "location",
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    )
  `;
}