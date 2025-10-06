import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { prisma as prodPrisma } from '../db/prisma';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Use the production prisma client for tests if in test environment
export const prismaTest = process.env.NODE_ENV === 'test' 
  ? prodPrisma 
  : new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });

/**
 * Reset the test database before each test suite
 */
export async function resetDatabase() {
  // Delete all records in reverse order of dependencies
  try {
    await prismaTest.importPreview.deleteMany();
    await prismaTest.transaction.deleteMany();
    await prismaTest.category.deleteMany();
    await prismaTest.user.deleteMany();
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

/**
 * Run migrations on the test database
 */
export function runMigrations() {
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  try {
    execSync(`DATABASE_URL="${databaseUrl}" npx prisma migrate deploy`, {
      stdio: 'pipe',
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }
}

/**
 * Global setup - run once before all tests
 */
beforeAll(async () => {
  // Run migrations
  runMigrations();
  
  // Connect to database
  await prismaTest.$connect();
});

/**
 * Reset database before each test
 */
beforeEach(async () => {
  await resetDatabase();
});

/**
 * Global teardown - run once after all tests
 */
afterAll(async () => {
  await prismaTest.$disconnect();
});
