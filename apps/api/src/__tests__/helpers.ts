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
