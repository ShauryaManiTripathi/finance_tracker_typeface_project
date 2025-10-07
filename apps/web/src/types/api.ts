// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Enums as const objects (to work with erasableSyntaxOnly)
export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const CategoryType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type CategoryType = typeof CategoryType[keyof typeof CategoryType];

export const TransactionSource = {
  MANUAL: 'MANUAL',
  RECEIPT: 'RECEIPT',
  STATEMENT_IMPORT: 'STATEMENT_IMPORT',
} as const;

export type TransactionSource = typeof TransactionSource[keyof typeof TransactionSource];

// User & Auth
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Category
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: CategoryType;
}

// Transaction
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string; // Decimal as string from API
  currency: string;
  occurredAt: string;
  description: string | null;
  merchant: string | null;
  source: TransactionSource;
  receiptUrl: string | null;
  externalId: string | null;
  userId: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  currency?: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  receiptUrl?: string;
}

export interface UpdateTransactionRequest {
  type?: TransactionType;
  amount?: number;
  currency?: string;
  occurredAt?: string;
  description?: string | null;
  merchant?: string | null;
  categoryId?: string | null;
  receiptUrl?: string | null;
}

export interface TransactionFilters {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Stats
export interface StatsSummary {
  income: string;
  expenses: string;
  net: string;
}

export interface ExpenseByCategory {
  categoryId: string | null;
  categoryName: string | null;
  amount: string;
}

export interface ExpenseOverTime {
  dateKey: string;
  income: string;
  expenses: string;
  net: string;
}

export interface StatsFilters {
  startDate?: string;
  endDate?: string;
  interval?: 'daily' | 'weekly' | 'monthly';
}

// Upload - Receipt
export interface ReceiptExtractedData {
  merchant: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  currency: string;
  confidence?: {
    merchant?: number;
    amount?: number;
    date?: number;
  };
}

export interface ReceiptUploadResponse {
  previewId: string;
  extractedData: ReceiptExtractedData;
  receiptUrl: string;
}

export interface ReceiptCommitRequest {
  previewId: string;
  transaction: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
  };
  metadata?: {
    merchant?: string;
    currency?: string;
  };
}

// Upload - Statement
export interface StatementTransaction {
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  merchant?: string | null;
  categoryId?: string | null;
  suggestedCategory?: string | null;
  isValid: boolean;
  validationErrors?: string[];
}

export interface StatementExtractedData {
  transactions: StatementTransaction[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    transactionCount: number;
  };
  currency: string;
}

export interface StatementUploadResponse {
  previewId: string;
  extractedData: StatementExtractedData;
}

export interface StatementCommitRequest {
  previewId: string;
  transactions: Array<{
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
  }>;
  options?: {
    skipDuplicates?: boolean;
  };
}

export interface StatementCommitResponse {
  created: number;
  skipped: number;
  failed: number;
  transactions: Transaction[];
}
