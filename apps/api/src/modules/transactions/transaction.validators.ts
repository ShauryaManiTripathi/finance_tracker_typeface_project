import { z } from "zod";

/**
 * Validation schemas for transaction endpoints
 */

// Transaction type enum
export const TransactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

// Base transaction fields for creation
export const CreateTransactionSchema = z.object({
  type: TransactionTypeSchema,
  amount: z
    .number()
    .positive({ message: "Amount must be positive" })
    .finite({ message: "Amount must be finite" }),
  currency: z.string().min(1).max(10).default("INR"),
  occurredAt: z.coerce.date(),
  description: z.string().trim().min(1).max(500).optional(),
  merchant: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().cuid2().optional(),
  receiptUrl: z.string().url().optional(),
});

// Update transaction schema - all fields optional except type/amount constraints
export const UpdateTransactionSchema = z.object({
  type: TransactionTypeSchema.optional(),
  amount: z
    .number()
    .positive({ message: "Amount must be positive" })
    .finite({ message: "Amount must be finite" })
    .optional(),
  currency: z.string().min(1).max(10).optional(),
  occurredAt: z.coerce.date().optional(),
  description: z.string().trim().min(1).max(500).optional().nullable(),
  merchant: z.string().trim().min(1).max(200).optional().nullable(),
  categoryId: z.string().cuid2().optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
});

// List transactions query parameters
export const ListTransactionsQuerySchema = z.object({
  // Pagination
  page: z.coerce
    .number()
    .int()
    .min(1, { message: "Page must be at least 1" })
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, { message: "Page size must be at least 1" })
    .max(100, { message: "Page size cannot exceed 100" })
    .default(20),

  // Filters
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  type: TransactionTypeSchema.optional(),
  categoryId: z.string().cuid2().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

// Transaction ID parameter
export const TransactionIdParamSchema = z.object({
  id: z.string().cuid2({ message: "Invalid transaction ID format" }),
});

// Type exports for TypeScript inference
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;
export type TransactionIdParam = z.infer<typeof TransactionIdParamSchema>;
