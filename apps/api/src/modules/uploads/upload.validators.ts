/**
 * Upload Module - Validators
 * 
 * Zod schemas for validating upload requests:
 * - Receipt upload (image files)
 * - Statement upload (PDF files)
 * - Commit requests (after frontend verification)
 * 
 * @module modules/uploads/validators
 */

import { z } from 'zod';

/**
 * Allowed MIME types for receipt images
 */
export const RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

/**
 * Allowed MIME types for transaction documents (images and PDFs)
 * Used for unified import endpoint that handles receipts, statements, and invoices
 */
export const STATEMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

/**
 * Transaction type enum (same as Prisma)
 */
export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

/**
 * Receipt commit request body
 * User sends verified/edited data after previewing AI extraction
 */
export const commitReceiptSchema = z.object({
  previewId: z.string().min(1, 'Preview ID is required'), // Accept any non-empty string
  
  // Verified transaction data (may be edited from AI preview)
  transaction: z.object({
    type: transactionTypeSchema,
    amount: z.number().positive('Amount must be positive'),
    description: z.string().min(1, 'Description is required').max(500),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    categoryName: z.string().min(1, 'Category name is required'), // Category name (will be created if doesn't exist)
  }),
  
  // Optional metadata
  metadata: z.object({
    merchant: z.string().optional(),
    currency: z.string().default('INR'),
    aiConfidence: z.number().min(0).max(1).optional(),
  }).optional(),
});

/**
 * Statement commit request body
 * User sends verified/edited transactions after previewing AI extraction
 */
export const commitStatementSchema = z.object({
  previewId: z.string().min(1, 'Preview ID is required'), // Accept any non-empty string
  
  // Array of verified transactions (user may have edited/deleted some)
  transactions: z.array(
    z.object({
      type: transactionTypeSchema,
      amount: z.number().positive('Amount must be positive'),
      description: z.string().min(1, 'Description is required').max(500),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
      categoryName: z.string().min(1, 'Category name is required'), // Category name (will be created if doesn't exist)
      merchant: z.string().optional(), // Optional merchant field
    })
  ).min(1, 'At least one transaction is required'),
  
  // Import options
  options: z.object({
    skipDuplicates: z.boolean().default(true),
  }).optional(),
});

/**
 * Query params for listing upload previews
 */
export const listPreviewsSchema = z.object({
  type: z.enum(['receipt', 'statement']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Receipt extraction preview response schema (for type inference)
 */
export const receiptPreviewSchema = z.object({
  previewId: z.string().uuid(),
  type: z.literal('receipt'),
  extractedData: z.object({
    merchant: z.string().nullable(),
    date: z.string(),
    amount: z.number(),
    currency: z.string().default('INR'),
    description: z.string().nullable(),
    confidence: z.number().min(0).max(1).optional(),
  }),
  suggestedTransaction: z.object({
    type: transactionTypeSchema,
    amount: z.number(),
    description: z.string(),
    date: z.string(),
    categoryName: z.string(), // Suggested category name (may not exist yet)
  }),
  expiresAt: z.string(), // ISO datetime
  createdAt: z.string(),
});

/**
 * Statement extraction preview response schema (for type inference)
 */
export const statementPreviewSchema = z.object({
  previewId: z.string().uuid(),
  type: z.literal('statement'),
  extractedData: z.object({
    accountInfo: z.object({
      accountNumber: z.string().nullable(),
      accountHolder: z.string().nullable(),
      bank: z.string().nullable(),
      period: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
    }),
    transactions: z.array(
      z.object({
        date: z.string(),
        description: z.string(),
        merchant: z.string().nullable(),
        amount: z.number(),
        type: transactionTypeSchema,
        balance: z.number().nullable(),
      })
    ),
    summary: z.object({
      totalIncome: z.number(),
      totalExpenses: z.number(),
      transactionCount: z.number(),
    }),
  }),
  suggestedTransactions: z.array(
    z.object({
      type: transactionTypeSchema,
      amount: z.number(),
      description: z.string(),
      date: z.string(),
      merchant: z.string().nullable(),
      categoryName: z.string(), // Suggested category name (may not exist yet)
    })
  ),
  expiresAt: z.string(),
  createdAt: z.string(),
});

/**
 * Type exports for use in controllers/services
 */
export type CommitReceiptInput = z.infer<typeof commitReceiptSchema>;
export type CommitStatementInput = z.infer<typeof commitStatementSchema>;
export type ListPreviewsInput = z.infer<typeof listPreviewsSchema>;
export type ReceiptPreview = z.infer<typeof receiptPreviewSchema>;
export type StatementPreview = z.infer<typeof statementPreviewSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;
