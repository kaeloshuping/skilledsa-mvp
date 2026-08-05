import { RequestHandler, Request } from 'express';
import { randomUUID } from 'crypto';

/**
 * Custom request type that includes the `requestId` property.
 * Used to ensure type safety when accessing `req.requestId`.
 */
export type RequestWithId = Request & { requestId: string };

/**
 * Middleware that generates a unique X-Request-ID for every request.
 * Sets `req.requestId` and adds the header to the response.
 */
export const requestTracing: RequestHandler = (req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  // Cast to RequestWithId to add the property
  (req as RequestWithId).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};