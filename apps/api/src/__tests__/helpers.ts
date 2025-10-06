import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prismaTest } from './setup';
import { config } from '../config';

/**
 * Create a test user in the database
 */
export async function createTestUser(
  email: string = 'test@example.com',
  password: string = 'password123'
): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  return prismaTest.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
}

/**
 * Generate a JWT token for a test user
 */
export function generateTestToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );
}

/**
 * Create a test user and return both the user and a valid JWT token
 */
export async function createAuthenticatedUser(
  email: string = 'test@example.com',
  password: string = 'password123'
): Promise<{ user: User; token: string }> {
  const user = await createTestUser(email, password);
  const token = generateTestToken(user.id, user.email);
  
  return { user, token };
}

/**
 * Login a test user and return token and userId
 */
export async function loginTestUser(
  email: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const user = await prismaTest.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }

  const token = generateTestToken(user.id, user.email);
  return { token, userId: user.id };
}

/**
 * Clean up test database
 */
export async function cleanupDatabase(): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prismaTest.transaction.deleteMany({});
  await prismaTest.category.deleteMany({});
  await prismaTest.user.deleteMany({});
}
