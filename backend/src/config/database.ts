import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 * In development, logs all queries; in production, only errors.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;