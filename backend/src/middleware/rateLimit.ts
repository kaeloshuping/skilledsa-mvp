import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';
import { env } from '../config/env.js';

/**
 * Login rate limiter.
 *
 * Policy (TDD §8 A07): 5 FAILED login attempts = 15-minute block.
 * Successful logins do not consume the budget (`skipSuccessfulRequests`).
 *
 * BUG-003 FIX: The RedisStore now uses an explicit `prefix: 'rl:login:'`
 * so its counter is isolated from `generalLimiter`. Previously both
 * limiters shared the default `rl:` prefix and the same IP key, causing
 * them to read/write the SAME counter. The general limiter (mounted
 * globally first) would increment the shared counter on every request,
 * and the login limiter would then see a count already over its `max`,
 * returning 429 even on the first login attempt.
 */
export const loginLimiter = rateLimit({
  store: new RedisStore({
    // Distinct prefix prevents collision with generalLimiter's counter.
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
 * General per-IP request limiter.
 *
 * BUG-003 FIX: Explicit `prefix: 'rl:general:'` ensures this limiter's
 * counter is independent of loginLimiter's counter.
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