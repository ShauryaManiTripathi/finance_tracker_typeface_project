import api from '../lib/api';
import type { ApiResponse } from '../types/api';

// Upload Preview Types
export interface ReceiptPreview {
  previewId: string;
  type: 'receipt';
  extractedData: {
    merchant: string | null;
    date: string;
    amount: number;
    currency: string;
    description: string | null;
    confidence: number;
  };
  suggestedTransaction: {
    type: 'EXPENSE';
    amount: number;
    description: string;
    date: string;
    categoryName: string; // Category name (may not exist yet)
  };
  expiresAt: string;
  createdAt: string;
}

export interface StatementPreview {
  previewId: string;
  type: 'statement';
  extractedData: {
    accountInfo: {
      accountNumber: string | null;
      accountHolder: string | null;
      bank: string | null;
      period: {
        startDate: string;
        endDate: string;
      };
    };
    transactions: Array<{
      date: string;
      description: string;
      merchant: string | null;
      amount: number;
      type: 'INCOME' | 'EXPENSE';
      balance: number | null;
    }>;
    summary: {
      totalIncome: number;
      totalExpenses: number;
      transactionCount: number;
    };
  };
  suggestedTransactions: Array<{
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    date: string;
    merchant: string | null;
    categoryName: string; // Category name (may not exist yet)
  }>;
  expiresAt: string;
  createdAt: string;
}

// Commit Request Types
export interface CommitReceiptData {
  previewId: string;
  transaction: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    date: string;
    categoryName: string; // Category name (will be created if doesn't exist)
  };
  metadata?: {
    merchant?: string;
    currency?: string;
    aiConfidence?: number;
  };
}

export interface CommitStatementData {
  previewId: string;
  transactions: Array<{
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    date: string;
    categoryName: string; // Category name (will be created if doesn't exist)
    merchant?: string;
  }>;
  options?: {
    skipDuplicates?: boolean;
  };
}

// Commit Response Types
export interface CommitReceiptResponse {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  occurredAt: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
  } | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitStatementResponse {
  created: number;
  skipped: number;
  total: number;
}

export const uploadService = {
  /**
   * Upload a receipt image and extract transaction data via Gemini Vision
   */
  async uploadReceipt(file: File): Promise<ApiResponse<ReceiptPreview>> {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    }

    // Validate file size (10 MB max)
    const maxSize = 10 * 1024 * 1024; // 10 MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10 MB limit.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<ReceiptPreview>>('/uploads/receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Commit a verified receipt transaction to the database
   */
  async commitReceipt(data: CommitReceiptData): Promise<ApiResponse<CommitReceiptResponse>> {
    const response = await api.post<ApiResponse<CommitReceiptResponse>>(
      '/uploads/receipt/commit',
      data
    );
    return response.data;
  },

  /**
   * Upload a transaction document (image or PDF) and extract all transactions via Gemini AI
   * Works with single receipts (1 transaction) or bank statements (multiple transactions)
   */
  async uploadStatement(file: File): Promise<ApiResponse<StatementPreview>> {
    // Validate file type - Accept images and PDFs
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload an image (JPEG, PNG) or PDF file.');
    }

    // Validate file size (20 MB max)
    const maxSize = 20 * 1024 * 1024; // 20 MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size exceeds 20 MB limit.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<StatementPreview>>('/uploads/statement', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Commit verified statement transactions to the database (bulk import)
   */
  async commitStatement(data: CommitStatementData): Promise<ApiResponse<CommitStatementResponse>> {
    const response = await api.post<ApiResponse<CommitStatementResponse>>(
      '/uploads/statement/commit',
      data
    );
    return response.data;
  },

  /**
   * Get all active previews for the current user
   */
  async getPreviews(type?: 'receipt' | 'statement'): Promise<ApiResponse<Array<ReceiptPreview | StatementPreview>>> {
    const response = await api.get<ApiResponse<Array<ReceiptPreview | StatementPreview>>>(
      '/uploads/previews',
      {
        params: { type },
      }
    );
    return response.data;
  },

  /**
   * Get a specific preview by ID
   */
  async getPreview(previewId: string): Promise<ApiResponse<ReceiptPreview | StatementPreview>> {
    const response = await api.get<ApiResponse<ReceiptPreview | StatementPreview>>(
      `/uploads/previews/${previewId}`
    );
    return response.data;
  },
};
