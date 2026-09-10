import prisma from '../config/database.js';
import { Prisma, JobStatus } from '@prisma/client';
import { getLogger } from '../utils/logger.js';

export class JobService {
  /**
   * Create a new job.
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
  }) {
    const log = getLogger();
    const { customerId, locationLat, locationLng, ...rest } = data;
    const locationWkt = `POINT(${locationLng} ${locationLat})`;

    const job = await prisma.job.create({
      data: {
        customer_id: customerId,
        title: rest.title,
        description: rest.description,
        trade: rest.trade,
        photos: rest.photos as unknown as Prisma.InputJsonValue,
        needsConsultation: rest.needsConsultation,
        travelFeeAccepted: rest.travelFeeAccepted,
        locationLat,
        locationLng,
        location: locationWkt,
        status: 'open',
      },
    });

    log.info('[BE1] - Job created', { jobId: job.id, customerId });
    return job;
  }

  /**
   * List jobs with optional filters.
   * Priority: if `city` is provided, it takes precedence and lat/lng/radius are ignored.
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
      status = 'open',
    } = filters;

    // Base where clause
    const where: Prisma.JobWhereInput = { status };
    if (customerId) where.customer_id = customerId;
    if (trade) where.trade = trade;
    if (travelFeeAccepted !== undefined) where.travelFeeAccepted = travelFeeAccepted;

    // City filter (case-insensitive). BE2 will add the `city` field to Job.
    if (city) {
      log.info('[BE1] - Filtering jobs by city:', { city });
      (
        where as Prisma.JobWhereInput & {
          city?: { equals: string; mode: 'insensitive' };
        }
      ).city = { equals: city, mode: 'insensitive' };
    }

    // Location filter (only when no city is provided and lat/lng given)
    let filteredIds: string[] | null = null;

    if (!city && lat !== undefined && lng !== undefined) {
      const effectiveRadius =
        travelFeeAccepted === false ? Math.min(radius, 35) : radius;

      const result = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Job"
        WHERE ST_DWithin(
          ST_GeomFromText(location, 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${effectiveRadius * 1000}
        )
        AND status = ${status}::"JobStatus"
        ${trade ? Prisma.sql`AND trade = ${trade}` : Prisma.empty}
        ${travelFeeAccepted !== undefined ? Prisma.sql`AND "travelFeeAccepted" = ${travelFeeAccepted}` : Prisma.empty}
        ${customerId ? Prisma.sql`AND customer_id = ${customerId}` : Prisma.empty}
      `;

      filteredIds = result.map((row) => row.id);
      if (filteredIds.length === 0) return [];
    }

    const finalWhere: Prisma.JobWhereInput = { ...where };
    if (filteredIds !== null) finalWhere.id = { in: filteredIds };

    const jobs = await prisma.job.findMany({
      where: finalWhere,
      orderBy: { created_at: 'desc' },
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
        contractor: {
          select: {
            id: true,
            full_name: true,
            verification_status: true,
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

    const totalPosted = await prisma.job.count({
      where: { customer_id: customerId },
    });

    const activeStatuses: JobStatus[] = [
      'open',
      'quoted',
      'accepted',
      'milestone1_pending',
      'milestone1_verified',
      'milestone2_pending',
    ];
    const activeCount = await prisma.job.count({
      where: {
        customer_id: customerId,
        status: { in: activeStatuses },
      },
    });

    const completedCount = await prisma.job.count({
      where: {
        customer_id: customerId,
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
    }>,
  ) {
    const log = getLogger();
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) throw new Error('Job not found');
    if (existing.customer_id !== customerId) throw new Error('Not authorized');

    const { locationLat, locationLng, photos, ...restData } = data;

    const updateData: Prisma.JobUpdateInput = { ...restData };
    if (photos !== undefined) {
      updateData.photos = photos as unknown as Prisma.InputJsonValue;
    }
    if (locationLat !== undefined) updateData.locationLat = locationLat;
    if (locationLng !== undefined) updateData.locationLng = locationLng;
    if (locationLat !== undefined && locationLng !== undefined) {
      updateData.location = `POINT(${locationLng} ${locationLat})`;
    }

    await prisma.job.update({ where: { id }, data: updateData });
    log.info('[BE1] - Job updated', { jobId: id, customerId });
    return this.getJobById(id);
  }

  static async deleteJob(id: string, customerId: string) {
    const log = getLogger();
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) throw new Error('Job not found');
    if (existing.customer_id !== customerId) throw new Error('Not authorized');
    await prisma.job.delete({ where: { id } });
    log.info('[BE1] - Job deleted', { jobId: id, customerId });
  }

  static async notifyContractors(jobId: string) {
    const log = getLogger();
    log.info('[BE1] - New job notification for contractors', { jobId });
    // Placeholder — real notification service will be added in a later sprint.
  }
}