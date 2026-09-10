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
}