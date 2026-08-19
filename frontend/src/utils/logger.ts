// src/utils/logger.ts
export const getLogger = (prefix: string = 'FE1') => ({
  log: (...args: any[]) => console.log(`[${prefix}] -`, ...args),
  info: (...args: any[]) => console.info(`[${prefix}] -`, ...args),
  warn: (...args: any[]) => console.warn(`[${prefix}] -`, ...args),
  error: (...args: any[]) => console.error(`[${prefix}] -`, ...args),
});