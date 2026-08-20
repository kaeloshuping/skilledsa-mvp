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

    // Build geography point WKT: "POINT(lng lat)"
    const locationWkt = `POINT(${locationLng} ${locationLat})`;

    const job = await prisma.job.create({
      data: {
        customerId,
        ...rest,
        locationLat,
        locationLng,
        location: Prisma.sql`ST_GeomFromText(${locationWkt}, 4326)::geography`,
        status: 'open',
      },
    });

    log.info('[BE1] - Job created', { jobId: job.id, customerId });
    return job;
  }

  /**
   * List jobs with filters.
   * - If lat/lng provided, filter by radius (default 35km) using PostGIS.
   * - If travelFeeAccepted is false, only show jobs within 35km (override radius).
   * - Additional filters: trade, status.
   */
  static async listJobs(filters: {
    trade?: string;
    lat?: number;
    lng?: number;
    radius?: number; // in km
    travelFeeAccepted?: boolean;
    status?: JobStatus;
  }) {
    const log = getLogger();
    const { trade, lat, lng, radius = 35, travelFeeAccepted, status = 'open' } = filters;

    // Build the base where clause using Prisma's type-safe approach
    const where: Prisma.JobWhereInput = {
      status,
    };

    if (trade) {
      where.trade = trade;
    }

    if (travelFeeAccepted !== undefined) {
      where.travelFeeAccepted = travelFeeAccepted;
    }

    // For location filtering, we need to use a raw SQL approach because
    // Prisma doesn't support geography columns in the standard where clause.
    // We'll use $queryRaw to get job IDs filtered by location, then use
    // those IDs in the standard findMany.
    let filteredIds: string[] | null = null;

    if (lat !== undefined && lng !== undefined) {
      // If travelFeeAccepted is false, force radius to 35km (or less)
      const effectiveRadius = travelFeeAccepted === false ? Math.min(radius, 35) : radius;

      // Use raw SQL with ST_DWithin for location filtering
      const result = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Job"
        WHERE ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${effectiveRadius * 1000}
        )
        AND status = ${status}::"JobStatus"
        ${trade ? Prisma.sql`AND trade = ${trade}` : Prisma.empty}
        ${travelFeeAccepted !== undefined ? Prisma.sql`AND "travelFeeAccepted" = ${travelFeeAccepted}` : Prisma.empty}
      `;

      filteredIds = result.map(row => row.id);

      // If no jobs found within radius, return empty array early
      if (filteredIds.length === 0) {
        return [];
      }
    }

    // Build the final where clause with ID filtering if location was used
    const finalWhere: Prisma.JobWhereInput = { ...where };

    if (filteredIds !== null) {
      finalWhere.id = { in: filteredIds };
    }

    // Fetch jobs with their relations
    const jobs = await prisma.job.findMany({
      where: finalWhere,
      orderBy: { createdAt: 'desc' },
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
          select: {
            id: true,
            price: true,
            contractorId: true,
          },
        },
      },
    });

    log.debug('[BE1] - Jobs listed', { count: jobs.length, filters });
    return jobs;
  }

  /**
   * Get a single job by ID with customer details and quotes.
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
      },
    });
    return job;
  }

  /**
   * Update a job (customer only).
   * Handles location update separately because Prisma doesn't support
   * geography columns in the standard update input.
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
    }>
  ) {
    const log = getLogger();
    // Check ownership
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Job not found');
    }
    if (existing.customerId !== customerId) {
      throw new Error('You are not authorized to update this job');
    }

    // Separate regular fields from location (which must be updated via raw SQL)
    const { locationLat, locationLng, ...restData } = data;

    // Update regular fields using Prisma's standard update
    const updateData: Prisma.JobUpdateInput = { ...restData };
    if (locationLat !== undefined) {
      updateData.locationLat = locationLat;
    }
    if (locationLng !== undefined) {
      updateData.locationLng = locationLng;
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    // If location coordinates are provided, update the geography column separately
    if (locationLat !== undefined && locationLng !== undefined) {
      const locationWkt = `POINT(${locationLng} ${locationLat})`;
      await prisma.$executeRaw`
        UPDATE "Job"
        SET location = ST_GeomFromText(${locationWkt}, 4326)::geography
        WHERE id = ${id}
      `;
    }

    log.info('[BE1] - Job updated', { jobId: id, customerId });
    // Fetch the updated job with relations
    const updatedJob = await prisma.job.findUnique({
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
        quotes: true,
      },
    });
    return updatedJob;
  }

  /**
   * Delete a job (customer only).
   */
  static async deleteJob(id: string, customerId: string) {
    const log = getLogger();
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Job not found');
    }
    if (existing.customerId !== customerId) {
      throw new Error('You are not authorized to delete this job');
    }

    await prisma.job.delete({ where: { id } });
    log.info('[BE1] - Job deleted', { jobId: id, customerId });
  }

  /**
   * Notify contractors about a new job (placeholder).
   * For now, just log the event.
   */
  static async notifyContractors(jobId: string) {
    const log = getLogger();
    log.info('[BE1] - New job notification for contractors', { jobId });
    // In future: fetch eligible contractors (trade, location) and send push/email.
  }
}