import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, json, colorize, printf } = winston.format;

// Custom format for development console
const consoleFormat = printf(({ level, message, timestamp, requestId, service, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  if (requestId) msg += ` [${requestId}]`;
  if (service) msg += ` ${service}`;
  msg += `: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Build transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat,
    ),
  }),
];

// Optional file transport
if (env.LOG_FILE_PATH) {
  transports.push(
    new winston.transports.File({
      filename: `${env.LOG_FILE_PATH}/skilledsa.log`,
      format: combine(timestamp(), json()),
    }),
  );
}

/**
 * Winston logger instance.
 * - In development, logs are colorised and human-readable.
 * - In production, logs are JSON for structured logging.
 * All log entries include `requestId` when provided.
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'api' },
  transports,
  exitOnError: false,
});

// Helper to log with requestId automatically
export const getLogger = (requestId?: string) => {
  return {
    error: (message: string, meta?: Record<string, unknown>) =>
      logger.error(message, { requestId, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logger.warn(message, { requestId, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) =>
      logger.info(message, { requestId, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) =>
      logger.debug(message, { requestId, ...meta }),
  };
};