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
import { HttpError } from '../../middleware/error';
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
    suggestedCategory: {
      type: 'string',
      description: 'Suggested category name for this expense (e.g., "Food & Dining", "Transportation", "Shopping", "Groceries", "Entertainment", "Healthcare", "Utilities", "Travel", "Other")',
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
        bank: { type: 'string' },
        period: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Statement start date in YYYY-MM-DD format' },
            endDate: { type: 'string', description: 'Statement end date in YYYY-MM-DD format' },
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
            description: 'Full transaction description as it appears in the statement',
          },
          merchant: {
            type: 'string',
            description: 'Merchant or payee name extracted from the description (e.g., "DILLONS", "Salary", "CHECK", etc.)',
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
          suggestedCategory: {
            type: 'string',
            description: 'Suggested category name based on merchant/description (e.g., "Salary" for income, "Groceries", "Fuel", "Shopping", "Dining", "Utilities", "Entertainment", "Healthcare", "Transportation", "Other" for expenses)',
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
6. Suggest an appropriate category name based on the merchant/items:
   - "Food & Dining" for restaurants, cafes
   - "Groceries" for supermarkets, grocery stores
   - "Transportation" for fuel, uber, parking
   - "Shopping" for retail, online shopping
   - "Entertainment" for movies, games, subscriptions
   - "Healthcare" for medical, pharmacy
   - "Utilities" for bills, services
   - "Travel" for hotels, flights
   - Or create a relevant category name
7. Provide a confidence score (0-1) based on image clarity

If any field is unclear, set it to null. Return valid JSON only.`;

/**
 * Statement extraction prompt for Gemini
 */
const STATEMENT_PROMPT = `You are a financial assistant. Extract ALL transactions from this bank statement PDF.

Instructions:
1. Identify account information if visible:
   - accountNumber: Account number
   - accountHolder: Account holder name
   - bank: Bank name (if visible)
   - period: Statement period with startDate and endDate in YYYY-MM-DD format
2. Extract EVERY transaction row with:
   - date: Transaction date in YYYY-MM-DD format
   - description: Full transaction description exactly as written in statement
   - merchant: Extract the merchant/payee name from the description (examples: "DILLONS", "Salary", "CHECK 1248", "TERMINAL S097094", "CASH WITHDRAWAL")
   - amount: Always positive number (use 'type' field for INCOME vs EXPENSE)
   - type: "INCOME" for credits/deposits, "EXPENSE" for debits/withdrawals
   - suggestedCategory: Suggest appropriate category name based on merchant/description:
     * For INCOME: "Salary", "Business Income", "Investment", "Refund", "Other Income"
     * For EXPENSE: "Groceries", "Fuel", "Dining", "Shopping", "Utilities", "Entertainment", "Healthcare", "Transportation", "Bills", "Cash Withdrawal", or create relevant name
   - balance: Account balance after transaction (if shown)
3. Ignore summary rows, headers, and footers
4. Maintain chronological order

Return valid JSON with all extracted transactions. Include merchant names and suggested categories!`;

/**
 * Interface for Gemini receipt extraction result
 */
interface GeminiReceiptData {
  merchant?: string | null;
  date: string;
  amount: number;
  currency?: string;
  description?: string | null;
  suggestedCategory?: string | null;
  confidence?: number;
}

/**
 * Interface for Gemini statement extraction result
 */
interface GeminiStatementData {
  accountInfo?: {
    accountNumber?: string;
    accountHolder?: string;
    bank?: string;
    period?: {
      startDate?: string;
      endDate?: string;
    };
  };
  transactions: Array<{
    date: string;
    description: string;
    merchant?: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    suggestedCategory?: string;
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
    // Step 1: Fetch user's existing categories for AI context
    const userCategories = await prisma.category.findMany({
      where: { userId },
      select: { name: true, type: true },
    });

    const expenseCategories = userCategories
      .filter(c => c.type === 'EXPENSE')
      .map(c => c.name)
      .join(', ');

    // Step 2: Build context-aware prompt
    const contextualPrompt = expenseCategories
      ? `${RECEIPT_PROMPT}\n\nUser's existing expense categories: ${expenseCategories}\n\nPrefer suggesting from these existing categories if applicable. Only suggest a new category name if none of the existing ones fit.`
      : RECEIPT_PROMPT;

    // Step 3: Upload to Gemini and extract with structured output
    const extracted = await uploadAndExtract<GeminiReceiptData>(
      filePath,
      mimeType,
      contextualPrompt,
      RECEIPT_SCHEMA,
      'receipt'
    );

    logger.info({
      msg: 'Receipt extracted successfully',
      merchant: extracted.merchant,
      amount: extracted.amount,
      suggestedCategory: extracted.suggestedCategory,
      confidence: extracted.confidence,
    });

    // Step 4: Use AI-suggested category name (no database lookup yet)
    const suggestedCategoryName = extracted.suggestedCategory || 'Other';

    // Step 5: Create preview record in database
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
            categoryName: suggestedCategoryName,
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
        categoryName: suggestedCategoryName,
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
    // Step 1: Fetch user's existing categories for AI context
    const userCategories = await prisma.category.findMany({
      where: { userId },
      select: { name: true, type: true },
    });

    const incomeCategories = userCategories
      .filter(c => c.type === 'INCOME')
      .map(c => c.name)
      .join(', ');

    const expenseCategories = userCategories
      .filter(c => c.type === 'EXPENSE')
      .map(c => c.name)
      .join(', ');

    // Step 2: Build context-aware prompt
    let contextualPrompt = STATEMENT_PROMPT;
    if (incomeCategories || expenseCategories) {
      contextualPrompt += '\n\nUser\'s existing categories:\n';
      if (incomeCategories) {
        contextualPrompt += `- INCOME: ${incomeCategories}\n`;
      }
      if (expenseCategories) {
        contextualPrompt += `- EXPENSE: ${expenseCategories}\n`;
      }
      contextualPrompt += '\nPrefer suggesting from these existing categories if applicable. Only suggest a new category name if none of the existing ones fit.';
    }

    // Step 3: Upload PDF to Gemini and extract with structured output
    const extracted = await uploadAndExtract<GeminiStatementData>(
      filePath,
      'application/pdf',
      contextualPrompt,
      STATEMENT_SCHEMA,
      'statement'
    );

    logger.info({
      msg: 'Statement extracted successfully',
      transactionCount: extracted.transactions.length,
      accountInfo: extracted.accountInfo,
    });

    // Step 4: Use AI-suggested category names (no database lookup)
    const suggestedTransactions = extracted.transactions.map((txn) => {
      const categoryName = txn.suggestedCategory || (txn.type === 'INCOME' ? 'Other Income' : 'Other');
      return {
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        date: txn.date,
        merchant: txn.merchant || null,
        categoryName,
      };
    });

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

    // Step 5: Return formatted preview with normalized structure
    return {
      previewId: preview.id,
      type: 'statement',
      extractedData: {
        accountInfo: {
          accountNumber: extracted.accountInfo?.accountNumber || null,
          accountHolder: extracted.accountInfo?.accountHolder || null,
          bank: extracted.accountInfo?.bank || null,
          period: {
            startDate: extracted.accountInfo?.period?.startDate || '',
            endDate: extracted.accountInfo?.period?.endDate || '',
          },
        },
        transactions: extracted.transactions.map((txn) => ({
          date: txn.date,
          description: txn.description,
          merchant: txn.merchant || null,
          amount: txn.amount,
          type: txn.type,
          balance: txn.balance ?? null,
        })),
        summary,
      },
      suggestedTransactions,
      expiresAt: preview.expiresAt.toISOString(),
      createdAt: preview.createdAt.toISOString(),
    } as StatementPreview;
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
    throw new HttpError(404, 'NotFound', 'Preview not found or expired');
  }

  if (preview.userId !== userId) {
    throw new HttpError(403, 'Forbidden', 'Unauthorized: Preview belongs to another user');
  }

  if (preview.expiresAt < new Date()) {
    throw new HttpError(410, 'Gone', 'Preview has expired. Please re-upload the receipt.');
  }

  // Step 2: Find or create category by name
  const categoryName = input.transaction.categoryName.trim();
  let category = await prisma.category.findFirst({
    where: {
      userId,
      name: categoryName,
      type: input.transaction.type,
    },
  });

  if (!category) {
    // Category doesn't exist, create it
    logger.info({
      msg: 'Creating new category from receipt',
      categoryName,
      type: input.transaction.type,
      userId,
    });
    
    category = await prisma.category.create({
      data: {
        userId,
        name: categoryName,
        type: input.transaction.type,
      },
    });
  }

  // Step 3: Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: input.transaction.type,
      amount: input.transaction.amount,
      description: input.transaction.description,
      occurredAt: new Date(input.transaction.date),
      categoryId: category.id,
      merchant: input.metadata?.merchant || null,
      source: 'RECEIPT',
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
    throw new HttpError(404, 'NotFound', 'Preview not found or expired');
  }

  if (preview.userId !== userId) {
    throw new HttpError(403, 'Forbidden', 'Unauthorized: Preview belongs to another user');
  }

  if (preview.expiresAt < new Date()) {
    throw new HttpError(410, 'Gone', 'Preview has expired. Please re-upload the statement.');
  }

  // Step 2: Find or create categories by name for all transactions
  const categoryNames = [...new Set(input.transactions.map((t) => t.categoryName.trim()))];
  
  // Fetch existing categories
  const existingCategories = await prisma.category.findMany({
    where: {
      userId,
      name: { in: categoryNames },
    },
  });

  const existingCategoryMap = new Map(existingCategories.map(c => [`${c.name}|${c.type}`, c.id]));
  const categoryNameToIdMap = new Map<string, string>();

  // Create missing categories
  for (const txn of input.transactions) {
    const categoryName = txn.categoryName.trim();
    const key = `${categoryName}|${txn.type}`;
    
    if (!existingCategoryMap.has(key) && !categoryNameToIdMap.has(key)) {
      // Category doesn't exist, create it
      logger.info({
        msg: 'Creating new category from statement',
        categoryName,
        type: txn.type,
        userId,
      });
      
      const newCategory = await prisma.category.create({
        data: {
          userId,
          name: categoryName,
          type: txn.type,
        },
      });
      
      categoryNameToIdMap.set(key, newCategory.id);
    } else if (existingCategoryMap.has(key)) {
      categoryNameToIdMap.set(key, existingCategoryMap.get(key)!);
    }
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

  // Step 4: Bulk create transactions with category IDs
  const created = await prisma.transaction.createMany({
    data: transactionsToCreate.map((txn) => {
      const key = `${txn.categoryName.trim()}|${txn.type}`;
      const categoryId = categoryNameToIdMap.get(key);
      
      return {
        userId,
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        occurredAt: new Date(txn.date),
        categoryId: categoryId || null,
        merchant: txn.merchant || null,
        source: 'STATEMENT_IMPORT',
      };
    }),
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
    throw new HttpError(404, 'NotFound', 'Preview not found or expired');
  }

  if (preview.userId !== userId) {
    throw new HttpError(403, 'Forbidden', 'Unauthorized: Preview belongs to another user');
  }

  if (preview.expiresAt < new Date()) {
    // Auto-delete expired preview
    await prisma.uploadPreview.delete({ where: { id: previewId } });
    throw new HttpError(410, 'Gone', 'Preview has expired');
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
