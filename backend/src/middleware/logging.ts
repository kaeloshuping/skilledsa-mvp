import { RequestHandler } from 'express';
import { getLogger } from '../utils/logger.js';
import { RequestWithId } from './requestTracing.js';

/**
 * HTTP request logging middleware.
 * Logs each request with method, URL, status code, and response time.
 * Also logs uncaught errors.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  // Cast req to RequestWithId to access requestId
  const log = getLogger((req as RequestWithId).requestId);

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    log[level as 'info' | 'warn'](`HTTP ${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
};