import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

declare global {
  // eslint-disable-next-line no-unused-vars
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e: any) => {
    logger.debug({
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    }, 'Database query');
  });

  prisma.$on('error', (e: any) => {
    logger.error({ target: e.target }, 'Database error');
  });

  prisma.$on('info', (e: any) => {
    logger.info({ message: e.message }, 'Database info');
  });

  prisma.$on('warn', (e: any) => {
    logger.warn({ message: e.message }, 'Database warning');
  });
}

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };