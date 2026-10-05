import { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import { getLogger } from '../utils/logger.js';
import { updateProfileSchema, updateMeSchema } from '../utils/validation.js';
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
      res.json({ user });
    } catch (error) {
      log.error('[BE1] - Get user error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/v1/users/me
   * Update the currently authenticated user's own profile.
   */
  static async updateMe(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const data = updateMeSchema.parse(req.body);
      const user = await UserService.updateMe(req.user.user_id, data);
      log.info('[BE1] - User profile updated via /me', { userId: req.user.user_id });
      res.json({ user });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Update me error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * PUT /api/v1/users/:id
   * Admin can update any user; non-admin can only update self.
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }

      const isAdmin = req.user.role === 'admin';
      const isSelf = req.user.user_id === id;

      if (!isAdmin && !isSelf) {
        log.warn('[BE1] - Forbidden profile update attempt', {
          callerId: req.user.user_id,
          targetId: id,
        });
        res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
        return;
      }

      const data = updateProfileSchema.parse(req.body);
      const user = await UserService.updateUser(id, data, { isAdmin });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      log.info('[BE1] - User profile updated (/:id)', { userId: id, isAdmin });
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