import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis.js';
import { env } from '../config/env.js';

/**
 * Rate limiter for login endpoints.
 * Allows a maximum of `RATE_LIMIT_MAX_REQUESTS` attempts per IP
 * within a sliding window of `RATE_LIMIT_WINDOW_MS` milliseconds.
 */
export const loginLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip, // or use req.body.email for per‑user limits
  skipSuccessfulRequests: false,  // counts all attempts (including failures)
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,          // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,           // Disable `X-RateLimit-*` headers
});

/**
 * General rate limiter for all other API endpoints.
 * Allows up to `RATE_LIMIT_GENERAL_MAX` requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: env.RATE_LIMIT_GENERAL_WINDOW_MS,
  max: env.RATE_LIMIT_GENERAL_MAX,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});