import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';
import { env } from '../config/env.js';

export const loginLimiter = rateLimit({
  store: new RedisStore({
    // The Redis call returns a promise with the Redis reply type.
    // We use 'any' here because the exact reply type varies by command
    // and this is a well-known integration point with rate-limit-redis.
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
  skipSuccessfulRequests: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  store: new RedisStore({
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