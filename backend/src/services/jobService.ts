import prisma from '../config/database.js';
import { Prisma, JobStatus } from '@prisma/client';
import { getLogger } from '../utils/logger.js';

export class JobService {
  /**
   * Create a new job.
   *
   * `city` is required by the schema. `address` is optional.
   *
   * BUG-002 FIX: `Job.location` is an `Unsupported("geography(Point, 4326)")`
   * column in schema.prisma. Prisma cannot write to it through the standard
   * `create()` API, so we wrap the create and a raw-SQL UPDATE in a single
   * transaction. This preserves the PostGIS column used by `listJobs`'
   * ST_DWithin geographic search path.
   */
  static async createJob(data: {
    customerId: string;
    title: string;
    description: string;
    trade: string;
    photos: string[];
    locationLat: number;
    locationLng: number;
    needsConsultation: boolean;
    travelFeeAccepted: boolean;
    city: string;
    address?: string;
  }) {
    const log = getLogger();
    const { customerId, locationLat, locationLng, ...rest } = data;

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          // BUG-002 FIX: was `customer_id: customerId` (snake_case).
          customerId,
          title: rest.title,
          description: rest.description,
          trade: rest.trade,
          // BUG-002 FIX: removed `as unknown as Prisma.InputJsonValue` cast.
          // Schema declares `photos String[]`; migration declares `TEXT[]`.
          photos: rest.photos,
          needsConsultation: rest.needsConsultation,
          travelFeeAccepted: rest.travelFeeAccepted,
          locationLat,
          locationLng,
          status: 'open',
          city: rest.city,
          address: rest.address,
        },
      });

      // Populate the PostGIS `location` column via raw SQL. This is the only
      // way to write to an `Unsupported` field in Prisma.
      await tx.$executeRaw`
        UPDATE "Job"
        SET "location" = ST_SetSRID(ST_MakePoint(${locationLng}, ${locationLat}), 4326)::geography
        WHERE "id" = ${created.id}
      `;

      return created;
    });

    log.info('[BE1] - Job created', { jobId: job.id, customerId });
    return job;
  }

  /**
   * List jobs with optional filters.
   * Priority: if `city` is provided, it takes precedence and lat/lng/radius are ignored.
   *
   * BUG-002 FIX (cont.): all field references now use the Prisma camelCase
   * identifiers declared in schema.prisma:
   *   customer_id  → customerId
   *   created_at   → createdAt
   *
   * BUG-003 NOTE: Authorization is enforced by the controller. This service
   * accepts an already-vetted `filters` object and does not re-check ownership.
   */
  static async listJobs(filters: {
    customerId?: string;
    trade?: string;
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    travelFeeAccepted?: boolean;
    status?: JobStatus;
    limit?: number;
  }) {
    const log = getLogger();
    const {
      customerId,
      trade,
      city,
      lat,
      lng,
      radius = 35,
      travelFeeAccepted,
      status,
      limit = 20,
    } = filters;

    // Base where clause. `status` is now optional so callers can request
    // all statuses (customer history) or force a specific value.
    const where: Prisma.JobWhereInput = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (trade) where.trade = trade;
    if (travelFeeAccepted !== undefined) where.travelFeeAccepted = travelFeeAccepted;

    // City filter (case-insensitive).
    if (city) {
      log.info('[BE1] - Filtering jobs by city:', { city });
      where.city = { equals: city, mode: 'insensitive' };
    }

    // Location filter (only when no city is provided and lat/lng given)
    let filteredIds: string[] | null = null;

    if (!city && lat !== undefined && lng !== undefined) {
      const effectiveRadius = travelFeeAccepted === false ? Math.min(radius, 35) : radius;

      // Raw SQL: `status` is cast only when provided; otherwise omitted.
      const result = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Job"
        WHERE ST_DWithin(
          "location",
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${effectiveRadius * 1000}
        )
        ${status ? Prisma.sql`AND "status" = ${status}::"JobStatus"` : Prisma.empty}
        ${trade ? Prisma.sql`AND "trade" = ${trade}` : Prisma.empty}
        ${travelFeeAccepted !== undefined ? Prisma.sql`AND "travelFeeAccepted" = ${travelFeeAccepted}` : Prisma.empty}
        ${customerId ? Prisma.sql`AND "customerId" = ${customerId}` : Prisma.empty}
        LIMIT ${limit}
      `;

      filteredIds = result.map((row) => row.id);
      if (filteredIds.length === 0) return [];
    }

    const finalWhere: Prisma.JobWhereInput = { ...where };
    if (filteredIds !== null) finalWhere.id = { in: filteredIds };

    const jobs = await prisma.job.findMany({
      where: finalWhere,
      // BUG-002 FIX: was `orderBy: { created_at: 'desc' }`.
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            verification_status: true,
          },
        },
      },
    });

    log.debug('[BE1] - Jobs listed', { count: jobs.length, filters });
    return jobs;
  }

  /**
   * Fetch a single job.
   *
   * BUG-002 FIX: removed `contractor: {...}` from `include` — the `Job`
   * model has no `contractor` relation in the current schema. Contractors
   * are linked through `Quote`. We now include quotes with the contractor
   * summary so consumers can still obtain that data.
   */
  static async getJobById(id: string) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            verification_status: true,
          },
        },
        quotes: {
          include: {
            contractor: {
              select: {
                id: true,
                full_name: true,
                verification_status: true,
              },
            },
          },
        },
        escrow_transaction: true,
      },
    });
    return job;
  }

  static async getJobStats(customerId: string) {
    const log = getLogger();
    log.info('[BE1] - Fetching job stats', { customerId });

    // BUG-002 FIX: was `where: { customer_id: customerId }`.
    const totalPosted = await prisma.job.count({
      where: { customerId },
    });

    // BUG-002 FIX: removed enum values that no longer exist in the current
    // JobStatus enum (dropped by migration 20260820160419_).
    const activeStatuses: JobStatus[] = ['open', 'quoted', 'accepted', 'active'];
    const activeCount = await prisma.job.count({
      where: {
        customerId,
        status: { in: activeStatuses },
      },
    });

    const completedCount = await prisma.job.count({
      where: {
        customerId,
        status: 'completed',
      },
    });

    return { posted: totalPosted, active: activeCount, completed: completedCount };
  }

  static async updateJob(
    id: string,
    customerId: string,
    data: Partial<{
      title: string;
      description: string;
      trade: string;
      photos: string[];
      locationLat: number;
      locationLng: number;
      needsConsultation: boolean;
      travelFeeAccepted: boolean;
      status: JobStatus;
      city: string;
      address: string;
    }>,
  ) {
    const log = getLogger();
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) throw new Error('Job not found');
    // BUG-002 FIX: was `existing.customer_id !== customerId`.
    if (existing.customerId !== customerId) throw new Error('Not authorized');

    const { locationLat, locationLng, photos, ...restData } = data;

    const updateData: Prisma.JobUpdateInput = { ...restData };
    if (photos !== undefined) {
      // BUG-002 FIX: removed `as unknown as Prisma.InputJsonValue` cast.
      updateData.photos = photos;
    }
    if (locationLat !== undefined) updateData.locationLat = locationLat;
    if (locationLng !== undefined) updateData.locationLng = locationLng;

    await prisma.job.update({ where: { id }, data: updateData });

    // BUG-002 FIX: `location` is an Unsupported field — update via raw SQL
    // when both coordinates were supplied, mirroring `createJob`.
    if (locationLat !== undefined && locationLng !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Job"
        SET "location" = ST_SetSRID(ST_MakePoint(${locationLng}, ${locationLat}), 4326)::geography
        WHERE "id" = ${id}
      `;
    }

    log.info('[BE1] - Job updated', { jobId: id, customerId });
    return this.getJobById(id);
  }

  static async deleteJob(id: string, customerId: string) {
    const log = getLogger();
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) throw new Error('Job not found');
    // BUG-002 FIX: was `existing.customer_id !== customerId`.
    if (existing.customerId !== customerId) throw new Error('Not authorized');
    await prisma.job.delete({ where: { id } });
    log.info('[BE1] - Job deleted', { jobId: id, customerId });
  }

  static async notifyContractors(jobId: string) {
    const log = getLogger();
    log.info('[BE1] - New job notification for contractors', { jobId });
    // Placeholder — real notification service will be added in a later sprint.
  }
}
