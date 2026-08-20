import { Request, Response } from 'express';
import { JobService } from '../services/jobService.js';
import { getLogger } from '../utils/logger.js';
import { createJobSchema, updateJobSchema, listJobsQuerySchema } from '../utils/validation.js';
import { ZodError } from 'zod';
import { RequestWithId } from '../middleware/requestTracing.js';

export class JobController {
  /**
   * POST /api/v1/jobs
   */
  static async createJob(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      // Only customers can create jobs
      if (req.user.role !== 'customer') {
        res.status(403).json({ error: 'Only customers can create jobs' });
        return;
      }

      const data = createJobSchema.parse(req.body);
      const job = await JobService.createJob({
        customerId: req.user.user_id,
        ...data,
      });

      // Trigger notification (asynchronously, but we can await for simplicity)
      await JobService.notifyContractors(job.id);

      res.status(201).json({ job });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Create job error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * GET /api/v1/jobs
   */
  static async listJobs(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const query = listJobsQuerySchema.parse(req.query);
      const jobs = await JobService.listJobs(query);
      res.json({ jobs });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - List jobs error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/jobs/:id
   */
  static async getJobById(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { id } = req.params;
      const job = await JobService.getJobById(id);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.json({ job });
    } catch (error) {
      log.error('[BE1] - Get job error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/v1/jobs/:id
   */
  static async updateJob(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      if (req.user.role !== 'customer') {
        res.status(403).json({ error: 'Only customers can update jobs' });
        return;
      }

      const { id } = req.params;
      const data = updateJobSchema.parse(req.body);
      const job = await JobService.updateJob(id, req.user.user_id, data);
      res.json({ job });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Update job error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * DELETE /api/v1/jobs/:id
   */
  static async deleteJob(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      if (req.user.role !== 'customer') {
        res.status(403).json({ error: 'Only customers can delete jobs' });
        return;
      }

      const { id } = req.params;
      await JobService.deleteJob(id, req.user.user_id);
      res.status(204).send();
    } catch (error) {
      log.error('[BE1] - Delete job error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }
}