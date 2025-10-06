import { z } from 'zod';

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must not exceed 100 characters'),
  }),
});

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, 'Password is required'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
