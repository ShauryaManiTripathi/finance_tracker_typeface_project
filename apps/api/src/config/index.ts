import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  databaseUrl: z.string(),
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiresIn: z.string().default('7d'),
  corsOrigin: z.string().default('http://localhost:5173'),
  geminiApiKey: z.string().optional(),
  geminiDefaultModel: z.string().default('gemini-1.5-flash'),
  geminiFallbackModel: z.string().default('gemini-1.5-flash'),
  aiPreviewTtlSec: z.number().default(900),
  maxReceiptSizeMb: z.number().default(10),
  maxStatementSizeMb: z.number().default(20),
  rateLimitWindowMs: z.number().default(15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: z.number().default(100),
});

const parseEnvNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const rawConfig = {
  port: parseEnvNumber(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiDefaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash',
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash',
  aiPreviewTtlSec: parseEnvNumber(process.env.AI_PREVIEW_TTL_SEC, 900),
  maxReceiptSizeMb: parseEnvNumber(process.env.MAX_RECEIPT_SIZE_MB, 10),
  maxStatementSizeMb: parseEnvNumber(process.env.MAX_STATEMENT_SIZE_MB, 20),
  rateLimitWindowMs: parseEnvNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMaxRequests: parseEnvNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
};

export const config = configSchema.parse(rawConfig);

export type Config = typeof config;