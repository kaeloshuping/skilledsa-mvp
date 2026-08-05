import { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import { getLogger } from '../utils/logger.js';
import { updateProfileSchema } from '../utils/validation.js';
import { ZodError } from 'zod';
import { RequestWithId } from '../middleware/requestTracing.js';

export class UserController {
  /**
   * GET /api/v1/users/:id
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      // Optional: restrict to own profile or admin
      res.json({ user });
    } catch (error) {
      log.error('[BE1] - Get user error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/v1/users/:id
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { id } = req.params;
      // Ensure user is updating own profile (or admin)
      if (!req.user || req.user.user_id !== id) {
        res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
        return;
      }
      const data = updateProfileSchema.parse(req.body);
      const user = await UserService.updateUser(id, data);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      log.info('[BE1] - User profile updated', { userId: id });
      res.json({ user });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Update user error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}