/**
 * Upload Module - Service Layer
 * 
 * Business logic for receipt and statement processing:
 * - Extract transaction data from receipts using Gemini Vision
 * - Extract multiple transactions from PDF statements using Gemini
 * - Store previews temporarily for frontend verification
 * - Commit verified data to transactions table
 * - Handle deduplication and category suggestions
 * 
 * @module modules/uploads/service
 */

import { v4 as uuidv4 } from 'uuid';
import { uploadAndExtract } from '../../utils/gemini';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type { CommitReceiptInput, CommitStatementInput, ReceiptPreview, StatementPreview } from './upload.validators';
import { prisma } from '../../db/prisma';
import type { TransactionType } from '@prisma/client';

/**
 * Receipt extraction schema for Gemini structured output
 */
const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    merchant: {
      type: 'string',
      description: 'Name of the merchant or business',
    },
    date: {
      type: 'string',
      description: 'Transaction date in YYYY-MM-DD format',
    },
    amount: {
      type: 'number',
      description: 'Total amount as a positive number',
    },
    currency: {
      type: 'string',
      description: 'Currency code (e.g., INR, USD)',
      default: 'INR',
    },
    description: {
      type: 'string',
      description: 'Brief description or itemized list',
    },
    confidence: {
      type: 'number',
      description: 'Confidence score between 0 and 1',
      minimum: 0,
      maximum: 1,
    },
  },
  required: ['date', 'amount'],
};

/**
 * Statement extraction schema for Gemini structured output
 */
const STATEMENT_SCHEMA = {
  type: 'object',
  properties: {
    accountInfo: {
      type: 'object',
      properties: {
        accountNumber: { type: 'string' },
        accountHolder: { type: 'string' },
        statementPeriod: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
          },
        },
      },
    },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Transaction date in YYYY-MM-DD format',
          },
          description: {
            type: 'string',
            description: 'Transaction description',
          },
          amount: {
            type: 'number',
            description: 'Absolute amount (always positive)',
          },
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE'],
            description: 'Transaction type',
          },
          balance: {
            type: 'number',
            description: 'Account balance after transaction',
          },
        },
        required: ['date', 'description', 'amount', 'type'],
      },
    },
  },
  required: ['transactions'],
};

/**
 * Receipt extraction prompt for Gemini
 */
const RECEIPT_PROMPT = `You are a financial assistant. Extract transaction details from this receipt image.

Instructions:
1. Identify the merchant/business name
2. Find the transaction date (format as YYYY-MM-DD)
3. Extract the TOTAL amount (not individual items)
4. Determine the currency (default to INR if unclear)
5. Create a brief description (mention main items if visible)
6. Provide a confidence score (0-1) based on image clarity

If any field is unclear, set it to null. Return valid JSON only.`;

/**
 * Statement extraction prompt for Gemini
 */
const STATEMENT_PROMPT = `You are a financial assistant. Extract ALL transactions from this bank statement PDF.

Instructions:
1. Identify account information if visible (account number, holder name, statement period)
2. Extract EVERY transaction row with:
   - Date (YYYY-MM-DD format)
   - Description (as written in statement)
   - Amount (always positive number, use 'type' field for INCOME vs EXPENSE)
   - Type (INCOME for credits/deposits, EXPENSE for debits/withdrawals)
   - Balance (if shown in statement)
3. Ignore summary rows, headers, and footers
4. Maintain chronological order

Return valid JSON with an array of transactions. Be thorough and extract all visible transactions.`;

/**
 * Interface for Gemini receipt extraction result
 */
interface GeminiReceiptData {
  merchant?: string | null;
  date: string;
  amount: number;
  currency?: string;
  description?: string | null;
  confidence?: number;
}

/**
 * Interface for Gemini statement extraction result
 */
interface GeminiStatementData {
  accountInfo?: {
    accountNumber?: string;
    accountHolder?: string;
    statementPeriod?: {
      from?: string;
      to?: string;
    };
  };
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    balance?: number;
  }>;
}

/**
 * Extract transaction data from a receipt image using Gemini Vision
 * 
 * @param filePath - Path to uploaded receipt file
 * @param mimeType - File MIME type
 * @param userId - User ID for storing preview
 * @returns Receipt preview with AI-extracted data
 */
export async function extractReceiptData(
  filePath: string,
  mimeType: string,
  userId: string
): Promise<ReceiptPreview> {
  logger.info({
    msg: 'Extracting receipt data',
    userId,
    mimeType,
  });

  try {
    // Step 1: Upload to Gemini and extract with structured output
    const extracted = await uploadAndExtract<GeminiReceiptData>(
      filePath,
      mimeType,
      RECEIPT_PROMPT,
      RECEIPT_SCHEMA,
      'receipt'
    );

    logger.info({
      msg: 'Receipt extracted successfully',
      merchant: extracted.merchant,
      amount: extracted.amount,
      confidence: extracted.confidence,
    });

    // Step 2: Suggest category based on merchant/description
    const suggestedCategoryId = await suggestCategory(
      extracted.merchant || extracted.description || 'Expense',
      'EXPENSE'
    );

    // Step 3: Create preview record in database
    const previewId = uuidv4();
    const expiresAt = new Date(Date.now() + config.aiPreviewTtlSec * 1000);

    const preview = await prisma.uploadPreview.create({
      data: {
        id: previewId,
        userId,
        type: 'receipt',
        data: {
          extracted,
          suggested: {
            type: 'EXPENSE',
            amount: extracted.amount,
            description: extracted.description || `Purchase at ${extracted.merchant || 'Unknown'}`,
            date: extracted.date,
            categoryId: suggestedCategoryId,
          },
        } as any, // Cast to any to satisfy Prisma JSON type
        expiresAt,
      },
    });

    // Step 4: Return formatted preview
    return {
      previewId: preview.id,
      type: 'receipt',
      extractedData: {
        merchant: extracted.merchant || null,
        date: extracted.date,
        amount: extracted.amount,
        currency: extracted.currency || 'INR',
        description: extracted.description || null,
        confidence: extracted.confidence,
      },
      suggestedTransaction: {
        type: 'EXPENSE',
        amount: extracted.amount,
        description: extracted.description || `Purchase at ${extracted.merchant || 'Unknown'}`,
        date: extracted.date,
        categoryId: suggestedCategoryId,
      },
      expiresAt: preview.expiresAt.toISOString(),
      createdAt: preview.createdAt.toISOString(),
    };
  } catch (error) {
    logger.error({
      msg: 'Error extracting receipt data',
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw new Error('Failed to extract receipt data. Please ensure the image is clear and contains a valid receipt.');
  }
}

/**
 * Extract multiple transactions from a bank statement PDF using Gemini
 * 
 * @param filePath - Path to uploaded statement PDF
 * @param userId - User ID for storing preview
 * @returns Statement preview with AI-extracted transactions
 */
export async function extractStatementData(
  filePath: string,
  userId: string
): Promise<StatementPreview> {
  logger.info({
    msg: 'Extracting statement data',
    userId,
  });

  try {
    // Step 1: Upload PDF to Gemini and extract with structured output
    const extracted = await uploadAndExtract<GeminiStatementData>(
      filePath,
      'application/pdf',
      STATEMENT_PROMPT,
      STATEMENT_SCHEMA,
      'statement'
    );

    logger.info({
      msg: 'Statement extracted successfully',
      transactionCount: extracted.transactions.length,
      accountInfo: extracted.accountInfo,
    });

    // Step 2: Suggest categories for each transaction
    const suggestedTransactions = await Promise.all(
      extracted.transactions.map(async (txn) => {
        const categoryId = await suggestCategory(txn.description, txn.type);
        return {
          type: txn.type,
          amount: txn.amount,
          description: txn.description,
          date: txn.date,
          categoryId,
        };
      })
    );

    // Step 3: Calculate summary
    const summary = {
      totalIncome: extracted.transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: extracted.transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0),
      transactionCount: extracted.transactions.length,
    };

    // Step 4: Create preview record
    const previewId = uuidv4();
    const expiresAt = new Date(Date.now() + config.aiPreviewTtlSec * 1000);

    const preview = await prisma.uploadPreview.create({
      data: {
        id: previewId,
        userId,
        type: 'statement',
        data: {
          extracted,
          suggested: suggestedTransactions,
          summary,
        } as any, // Cast to any to satisfy Prisma JSON type
        expiresAt,
      },
    });

    // Step 5: Return formatted preview
    return {
      previewId: preview.id,
      type: 'statement',
      extractedData: {
        accountInfo: extracted.accountInfo,
        transactions: extracted.transactions,
        summary,
      },
      suggestedTransactions,
      expiresAt: preview.expiresAt.toISOString(),
      createdAt: preview.createdAt.toISOString(),
    };
  } catch (error) {
    logger.error({
      msg: 'Error extracting statement data',
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw new Error('Failed to extract statement data. Please ensure the PDF is a valid bank statement.');
  }
}

/**
 * Commit a verified receipt transaction to the database
 * 
 * @param input - Commit request with verified transaction data
 * @param userId - User ID
 * @returns Created transaction
 */
export async function commitReceipt(input: CommitReceiptInput, userId: string) {
  logger.info({
    msg: 'Committing receipt transaction',
    previewId: input.previewId,
    userId,
  });

  // Step 1: Verify preview exists and belongs to user
  const preview = await prisma.uploadPreview.findUnique({
    where: { id: input.previewId },
  });

  if (!preview) {
    throw new Error('Preview not found or expired');
  }

  if (preview.userId !== userId) {
    throw new Error('Unauthorized: Preview belongs to another user');
  }

  if (preview.expiresAt < new Date()) {
    throw new Error('Preview has expired. Please re-upload the receipt.');
  }

  // Step 2: Verify category exists and belongs to user
  const category = await prisma.category.findUnique({
    where: { id: input.transaction.categoryId },
  });

  if (!category || category.userId !== userId) {
    throw new Error('Invalid category ID');
  }

  // Step 3: Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: input.transaction.type,
      amount: input.transaction.amount,
      description: input.transaction.description,
      occurredAt: new Date(input.transaction.date),
      categoryId: input.transaction.categoryId,
    },
    include: {
      category: true,
    },
  });

  // Step 4: Delete preview (cleanup)
  await prisma.uploadPreview.delete({
    where: { id: input.previewId },
  });

  logger.info({
    msg: 'Receipt transaction committed successfully',
    transactionId: transaction.id,
    amount: transaction.amount,
  });

  return transaction;
}

/**
 * Commit verified statement transactions to the database (bulk import)
 * 
 * @param input - Commit request with array of verified transactions
 * @param userId - User ID
 * @returns Summary of created transactions
 */
export async function commitStatement(input: CommitStatementInput, userId: string) {
  logger.info({
    msg: 'Committing statement transactions',
    previewId: input.previewId,
    transactionCount: input.transactions.length,
    userId,
  });

  // Step 1: Verify preview exists and belongs to user
  const preview = await prisma.uploadPreview.findUnique({
    where: { id: input.previewId },
  });

  if (!preview) {
    throw new Error('Preview not found or expired');
  }

  if (preview.userId !== userId) {
    throw new Error('Unauthorized: Preview belongs to another user');
  }

  if (preview.expiresAt < new Date()) {
    throw new Error('Preview has expired. Please re-upload the statement.');
  }

  // Step 2: Verify all categories exist and belong to user
  const categoryIds = [...new Set(input.transactions.map((t) => t.categoryId))];
  const categories = await prisma.category.findMany({
    where: {
      id: { in: categoryIds },
      userId,
    },
  });

  if (categories.length !== categoryIds.length) {
    throw new Error('One or more invalid category IDs');
  }

  // Step 3: Optional deduplication (check for existing transactions on same dates)
  let transactionsToCreate = input.transactions;

  if (input.options?.skipDuplicates) {
    const dates = input.transactions.map((t) => new Date(t.date));
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { in: dates },
      },
      select: {
        occurredAt: true,
        amount: true,
        description: true,
      },
    });

    // Simple deduplication: skip if exact match on date + amount + description
    transactionsToCreate = input.transactions.filter((newTxn) => {
      const isDuplicate = existingTransactions.some(
        (existing) =>
          existing.occurredAt.toISOString().split('T')[0] === newTxn.date &&
          Math.abs(Number(existing.amount) - newTxn.amount) < 0.01 &&
          existing.description?.toLowerCase() === newTxn.description.toLowerCase()
      );
      return !isDuplicate;
    });

    logger.info({
      msg: 'Deduplication applied',
      original: input.transactions.length,
      afterDedup: transactionsToCreate.length,
      skipped: input.transactions.length - transactionsToCreate.length,
    });
  }

  // Step 4: Bulk create transactions
  const created = await prisma.transaction.createMany({
    data: transactionsToCreate.map((txn) => ({
      userId,
      type: txn.type,
      amount: txn.amount,
      description: txn.description,
      occurredAt: new Date(txn.date),
      categoryId: txn.categoryId,
    })),
  });

  // Step 5: Delete preview (cleanup)
  await prisma.uploadPreview.delete({
    where: { id: input.previewId },
  });

  logger.info({
    msg: 'Statement transactions committed successfully',
    created: created.count,
    skipped: input.transactions.length - transactionsToCreate.length,
  });

  return {
    created: created.count,
    skipped: input.transactions.length - transactionsToCreate.length,
    total: input.transactions.length,
  };
}

/**
 * Get preview by ID (for verification or re-editing)
 * 
 * @param previewId - Preview ID
 * @param userId - User ID (for authorization)
 * @returns Preview data
 */
export async function getPreview(previewId: string, userId: string) {
  const preview = await prisma.uploadPreview.findUnique({
    where: { id: previewId },
  });

  if (!preview) {
    throw new Error('Preview not found or expired');
  }

  if (preview.userId !== userId) {
    throw new Error('Unauthorized: Preview belongs to another user');
  }

  if (preview.expiresAt < new Date()) {
    // Auto-delete expired preview
    await prisma.uploadPreview.delete({ where: { id: previewId } });
    throw new Error('Preview has expired');
  }

  return preview;
}

/**
 * List all active previews for a user
 * 
 * @param userId - User ID
 * @param type - Optional filter by type
 * @returns Array of previews
 */
export async function listPreviews(userId: string, type?: 'receipt' | 'statement') {
  const previews = await prisma.uploadPreview.findMany({
    where: {
      userId,
      type: type || undefined,
      expiresAt: { gt: new Date() },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return previews;
}

/**
 * Suggest a category based on description/merchant name
 * Uses simple keyword matching. Can be enhanced with ML later.
 * 
 * @param text - Description or merchant name
 * @param type - Transaction type (INCOME or EXPENSE)
 * @returns Suggested category ID or null
 */
async function suggestCategory(text: string, type: TransactionType): Promise<string | null> {
  const lowerText = text.toLowerCase();

  // Get all categories for the system (or user-specific)
  // For simplicity, we'll match against predefined keywords
  const keywords: Record<string, string[]> = {
    Food: ['restaurant', 'cafe', 'food', 'grocery', 'pizza', 'burger', 'starbucks', 'mcdonald'],
    Transport: ['uber', 'lyft', 'taxi', 'fuel', 'gas', 'parking', 'metro', 'bus'],
    Shopping: ['amazon', 'flipkart', 'mall', 'store', 'shop', 'retail'],
    Utilities: ['electricity', 'water', 'gas', 'internet', 'phone', 'bill'],
    Entertainment: ['movie', 'netflix', 'spotify', 'game', 'concert', 'theater'],
    Healthcare: ['hospital', 'pharmacy', 'doctor', 'medical', 'clinic', 'medicine'],
    Salary: ['salary', 'payroll', 'wage', 'income', 'payment received'],
    Other: [],
  };

  for (const [categoryName, terms] of Object.entries(keywords)) {
    if (terms.some((term) => lowerText.includes(term))) {
      // Find category by name (assumes seeded categories exist)
      const category = await prisma.category.findFirst({
        where: { name: categoryName },
      });
      if (category) {
        return category.id;
      }
    }
  }

  // Default fallback: find first category of matching type
  const fallback = await prisma.category.findFirst({
    where: { name: type === 'INCOME' ? 'Salary' : 'Other' },
  });

  return fallback?.id || null;
}

/**
 * Clean up expired previews (run as background job or cron)
 */
export async function cleanupExpiredPreviews() {
  const deleted = await prisma.uploadPreview.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  logger.info({
    msg: 'Cleaned up expired previews',
    count: deleted.count,
  });

  return deleted.count;
}
