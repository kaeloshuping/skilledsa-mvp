import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';
import { env } from '../config/env.js';

/**
 * Login rate limiter.
 *
 * Policy (TDD §8 A07): 5 failed login attempts per 15-minute window,
 * keyed by client IP. Successful requests do not consume the budget,
 * so a legitimate user who authenticates repeatedly is never blocked.
 *
 * Uses a dedicated Redis key namespace (`rl:login:`) so its counter is
 * isolated from the general per-IP limiter. Sharing the default `rl:`
 * prefix would cause both limiters to read and write the same counter,
 * making the login limiter trip on unrelated traffic.
 */
export const loginLimiter = rateLimit({
  store: new RedisStore({
    prefix: 'rl:login:',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (command: string, ...args: string[]): Promise<any> =>
      redis.call(command, ...args) as Promise<unknown>,
  }),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return ipKeyGenerator(ip);
  },
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General per-IP request limiter for non-authentication routes.
 *
 * Uses a dedicated Redis key namespace (`rl:general:`) so its counter
 * is independent of the login limiter's counter.
 */
export const generalLimiter = rateLimit({
  store: new RedisStore({
    prefix: 'rl:general:',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (command: string, ...args: string[]): Promise<any> =>
      redis.call(command, ...args) as Promise<unknown>,
  }),
  windowMs: env.RATE_LIMIT_GENERAL_WINDOW_MS,
  max: env.RATE_LIMIT_GENERAL_MAX,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return ipKeyGenerator(ip);
  },
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
