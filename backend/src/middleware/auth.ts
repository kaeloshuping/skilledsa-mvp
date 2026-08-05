import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt.js';
import { getLogger } from '../utils/logger.js';
import { RequestWithId } from './requestTracing.js';

/**
 * Authentication middleware: verifies the JWT access token.
 * Attaches the decoded user payload to `req.user`.
 * If token is missing or invalid, returns 401.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const log = getLogger((req as RequestWithId).requestId);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log.warn('[BE1] - Missing or invalid Authorization header');
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    log.warn('[BE1] - Invalid or expired access token', { error: (error as Error).message });
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// Augment Express Request interface to include user
declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}