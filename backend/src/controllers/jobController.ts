import { Request, Response } from 'express';
import { JobService } from '../services/jobService.js';
import { getLogger } from '../utils/logger.js';
import {
  createJobSchema,
  updateJobSchema,
  listJobsQuerySchema,
} from '../utils/validation.js';
import { ZodError } from 'zod';
import { RequestWithId } from '../middleware/requestTracing.js';

export class JobController {
  static async createJob(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      if (req.user.role !== 'customer') {
        res.status(403).json({ error: 'Only customers can create jobs' });
        return;
      }
      const data = createJobSchema.parse(req.body);
      const job = await JobService.createJob({
        customerId: req.user.user_id,
        ...data,
      });
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
   * List jobs.
   *
   * BUG-003 FIX (OWASP A01 — Broken Object Level Authorization):
   *   - Customer  → `customerId` is forced to their own session ID. Any
   *                 value supplied in the query string is discarded.
   *   - Contractor→ `customerId` is removed entirely; `status` is forced
   *                 to 'open'. Prevents enumeration of private histories.
   *   - Admin     → passes through untouched for oversight.
   */
  static async listJobs(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }

      const query = listJobsQuerySchema.parse(req.query);

      // --- BUG-003 FIX: role-scoped query rewriting -------------------
      if (req.user.role === 'customer') {
        // Ignore whatever customerId the client sent — lock to session.
        query.customerId = req.user.user_id;
        // Leave `status` as the client provided it (or undefined = all).
      } else if (req.user.role === 'contractor') {
        // Contractors may only browse open jobs; strip any customer scoping.
        delete query.customerId;
        query.status = 'open';
      }
      // admin: no rewrite — trusted for oversight.
      // ---------------------------------------------------------------

      if (query.city) {
        log.info('[BE1] - Filtering jobs by city:', { city: query.city });
      }

      const jobs = await JobService.listJobs(query);

      const summary = jobs.map((job) => ({
        id: job.id,
        title: job.title || 'Untitled',
        trade: job.trade || '',
        status: job.status,
        quoteCount: 0,
        // BUG-002 FIX: was `job.created_at.toISOString()`.
        createdAt: job.createdAt.toISOString(),
      }));

      res.json(summary);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - List jobs error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getJobStats(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      if (req.user.role !== 'customer') {
        res.status(403).json({ error: 'Only customers can view job stats' });
        return;
      }
      const stats = await JobService.getJobStats(req.user.user_id);
      res.json(stats);
    } catch (error) {
      log.error('[BE1] - Get job stats error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Fetch a single job by id.
   *
   * BUG-003 FIX (OWASP A01): customers may only fetch their OWN jobs.
   * Return 404 (not 403) on mismatch so we do not leak job existence.
   * Contractors may fetch open jobs (browse flow). Admin passes through.
   */
  static async getJobById(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }

      const { id } = req.params;
      const job = await JobService.getJobById(id);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // --- BUG-003 FIX: ownership check ------------------------------
      if (req.user.role === 'customer' && job.customerId !== req.user.user_id) {
        // 404 to avoid leaking existence of others' jobs
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      if (req.user.role === 'contractor' && job.status !== 'open') {
        // Contractors can only see open jobs they might apply to
        // (they will get access to accepted jobs via the Quote/job flow,
        //  which will be wired to a separate endpoint in a later sprint).
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      // admin: no restriction
      // ---------------------------------------------------------------

      res.json({ job });
    } catch (error) {
      log.error('[BE1] - Get job error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateJob(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user || req.user.role !== 'customer') {
        res.status(403).json({ error: 'Only customers can update jobs' });
        return;
      }
      const { id } = req.params;
      const data = updateJobSchema.parse(req.body);
      // Ownership is enforced inside JobService.updateJob via req.user.user_id.
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

  static async deleteJob(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user || req.user.role !== 'customer') {
        res.status(403).json({ error: 'Only customers can delete jobs' });
        return;
      }
      const { id } = req.params;
      // Ownership is enforced inside JobService.deleteJob via req.user.user_id.
      await JobService.deleteJob(id, req.user.user_id);
      res.status(204).send();
    } catch (error) {
      log.error('[BE1] - Delete job error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }
}