import { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import { getLogger } from '../utils/logger.js';
import { listUsersQuerySchema } from '../utils/validation.js';
import { ZodError } from 'zod';
import { RequestWithId } from '../middleware/requestTracing.js';

export class AdminController {
  /**
   * GET /api/v1/admin/users
   * Admin-only. Paginated list with filters.
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const query = listUsersQuerySchema.parse(req.query);
      const result = await UserService.listUsers(query);
      log.debug('[BE1] - Admin listUsers served', {
        page: query.page,
        limit: query.limit,
        returned: result.users.length,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Admin list users error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/admin/users/:id/verify
   * Admin-only. Marks the user as verified and, if a pending verification request
   * exists, syncs it with `status = 'verified'` and a `reviewed_at` timestamp.
   */
  static async verifyUser(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }

      const { id } = req.params;

      const user = await UserService.setVerificationStatus(
        id,
        'verified',
        req.user.user_id,
      );

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      log.info('[BE1] - Admin verified user', {
        userId: id,
        adminId: req.user.user_id,
      });

      res.json({ user });
    } catch (error) {
      log.error('[BE1] - Verify user error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}