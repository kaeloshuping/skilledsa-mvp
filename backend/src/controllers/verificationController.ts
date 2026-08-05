import { Request, Response } from 'express';
import { S3Service } from '../services/s3Service.js';
import { VerificationService } from '../services/verificationService.js';
import { getLogger } from '../utils/logger.js';
import {
  verificationSubmitSchema,
  verificationReviewSchema,
} from '../utils/validation.js';
import { ZodError } from 'zod';
import { RequestWithId } from '../middleware/requestTracing.js';

export class VerificationController {
  /**
   * POST /api/v1/verification/presigned-url
   * Generate a presigned URL for file upload.
   */
  static async getPresignedUrl(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { fileName, contentType } = req.body;
      if (!fileName || !contentType) {
        res.status(400).json({ error: 'fileName and contentType are required' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const { url, key } = await S3Service.generatePresignedUrl(
        fileName,
        contentType,
        req.user.user_id,
      );
      res.json({ url, key });
    } catch (error) {
      log.error('[BE1] - Presigned URL error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * POST /api/v1/verification/submit
   * Submit verification request with file keys/URLs.
   */
  static async submit(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const data = verificationSubmitSchema.parse(req.body);
      const result = await VerificationService.submit(req.user.user_id, data);
      res.status(201).json({ verification: result });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Submit verification error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * GET /api/v1/verification/status
   * Get current user's verification status.
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const status = await VerificationService.getStatus(req.user.user_id);
      res.json({ verification: status });
    } catch (error) {
      log.error('[BE1] - Get status error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/verification/queue
   * Admin: get pending verification requests.
   */
  static async getQueue(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const queue = await VerificationService.getPendingQueue();
      res.json({ queue });
    } catch (error) {
      log.error('[BE1] - Get queue error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/v1/verification/queue/:id/approve
   * Admin: approve a verification request.
   */
  static async approve(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { id } = req.params;
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const { notes } = verificationReviewSchema.parse(req.body);
      const result = await VerificationService.approve(
        id,
        req.user.user_id,
        (req as RequestWithId).requestId,
        notes,
      );
      // We could also update ip_address in admin log, but not critical.
      res.json({ verification: result });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Approve error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * PUT /api/v1/verification/queue/:id/reject
   * Admin: reject a verification request.
   */
  static async reject(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { id } = req.params;
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const { notes } = verificationReviewSchema.parse(req.body);
      if (!notes) {
        res.status(400).json({ error: 'Rejection reason (notes) is required' });
        return;
      }
      const result = await VerificationService.reject(
        id,
        req.user.user_id,
        (req as RequestWithId).requestId,
        notes,
      );
      res.json({ verification: result });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Reject error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }
}