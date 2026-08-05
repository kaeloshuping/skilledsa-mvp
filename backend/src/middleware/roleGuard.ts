import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../utils/logger.js';
import { RequestWithId } from './requestTracing.js';

/**
 * Role-based access control middleware.
 * Requires the user to have one of the specified roles.
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const log = getLogger((req as RequestWithId).requestId);
    if (!req.user) {
      log.warn('[BE1] - Unauthenticated access attempt');
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      log.warn('[BE1] - Insufficient role', { userRole: req.user.role, required: roles });
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};