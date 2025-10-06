import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

declare global {
  // eslint-disable-next-line no-unused-vars
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  // Prisma logging is handled through the log option above
}

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };