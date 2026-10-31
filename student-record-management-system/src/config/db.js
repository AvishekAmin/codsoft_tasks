import { PrismaClient } from '@prisma/client';
import env from './env.js';
import inMemoryPrisma from './testDb.js';

let prismaInstance;

if (env.NODE_ENV === 'test' && process.env.USE_REAL_DB !== 'true') {
  prismaInstance = inMemoryPrisma;
} else {
  const globalForPrisma = globalThis;
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;

/**
 * Checks database connectivity with a lightweight query.
 * @returns {Promise<{ connected: boolean, error?: string }>}
 */
export const checkDbConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

export default prisma;
