import prisma from '../config/database.js';
import { Prisma, JobStatus } from '@prisma/client';
import { getLogger } from '../utils/logger.js';

export class JobService {
  /**
   * Create a new job.
   *
   * `locationLat`/`locationLng` are optional. When both are provided,
   * the PostGIS `location` column is populated via raw SQL (Prisma
   * cannot write to Unsupported geography fields directly). When
   * neither is provided, the column stays NULL and geographic search
   * simply ignores the row — job matching during development relies
   * on the `city` and `address` fields instead.
   */
  static async createJob(data: {
    customerId: string;
    title: string;
    description: string;
    trade: string;
    photos: string[];
    locationLat?: number;
    locationLng?: number;
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
          customerId,
          title: rest.title,
          description: rest.description,
          trade: rest.trade,
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

      // PostGIS `location` is written only when both coordinates are
      // supplied. Jobs created without coordinates keep location NULL
      // and are matched by city + address instead.
      if (locationLat !== undefined && locationLng !== undefined) {
        await tx.$executeRaw`
          UPDATE "Job"
          SET "location" = ST_SetSRID(ST_MakePoint(${locationLng}, ${locationLat}), 4326)::geography
          WHERE "id" = ${created.id}
        `;
      }

      return created;
    });

    log.info('[BE1] - Job created', { jobId: job.id, customerId });
    return job;
  }

  /**
   * List jobs with optional filters.
   * Priority: if `city` is provided, it takes precedence and lat/lng/radius are ignored.
   * Authorization is enforced by the controller; this service accepts an
   * already-vetted `filters` object and does not re-check ownership.
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

    const where: Prisma.JobWhereInput = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (trade) where.trade = trade;
    if (travelFeeAccepted !== undefined) where.travelFeeAccepted = travelFeeAccepted;

    if (city) {
      log.info('[BE1] - Filtering jobs by city:', { city });
      where.city = { equals: city, mode: 'insensitive' };
    }

    let filteredIds: string[] | null = null;

    if (!city && lat !== undefined && lng !== undefined) {
      const effectiveRadius = travelFeeAccepted === false ? Math.min(radius, 35) : radius;

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
   * Fetch a single job including its customer and quotes.
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

  /**
   * Dashboard statistics for a customer's jobs.
   */
  static async getJobStats(customerId: string) {
    const log = getLogger();
    log.info('[BE1] - Fetching job stats', { customerId });

    const totalPosted = await prisma.job.count({
      where: { customerId },
    });

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

  /**
   * Update a job owned by the given customer.
   */
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
    if (existing.customerId !== customerId) throw new Error('Not authorized');

    const { locationLat, locationLng, photos, ...restData } = data;

    const updateData: Prisma.JobUpdateInput = { ...restData };
    if (photos !== undefined) {
      updateData.photos = photos;
    }
    if (locationLat !== undefined) updateData.locationLat = locationLat;
    if (locationLng !== undefined) updateData.locationLng = locationLng;

    await prisma.job.update({ where: { id }, data: updateData });

    // PostGIS `location` requires both coordinates; write via raw SQL
    // because it is an Unsupported field in the Prisma schema.
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

  /**
   * Delete a job owned by the given customer.
   */
  static async deleteJob(id: string, customerId: string) {
    const log = getLogger();
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) throw new Error('Job not found');
    if (existing.customerId !== customerId) throw new Error('Not authorized');
    await prisma.job.delete({ where: { id } });
    log.info('[BE1] - Job deleted', { jobId: id, customerId });
  }

  /**
   * Notify matching contractors that a new job has been posted.
   * Placeholder — notification service lands in a later sprint.
   */
  static async notifyContractors(jobId: string) {
    const log = getLogger();
    log.info('[BE1] - New job notification for contractors', { jobId });
  }
}
