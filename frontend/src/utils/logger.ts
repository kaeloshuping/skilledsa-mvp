// src/utils/logger.ts
export const getLogger = (prefix: string = 'FE1') => ({
  log: (...args: unknown[]) => console.log(`[${prefix}] -`, ...args),
  info: (...args: unknown[]) => console.info(`[${prefix}] -`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${prefix}] -`, ...args),
  error: (...args: unknown[]) => console.error(`[${prefix}] -`, ...args),
});