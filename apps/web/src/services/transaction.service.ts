import api from '../lib/api';
import type { 
  ApiResponse, 
  Transaction, 
  TransactionType,
  PaginatedResponse 
} from '../types/api';

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

export interface CreateTransactionData {
  type: TransactionType;
  amount: number;
  currency?: string;
  occurredAt: string | Date;
  description?: string;
  merchant?: string;
  categoryId?: string;
  receiptUrl?: string;
}

export interface UpdateTransactionData {
  type?: TransactionType;
  amount?: number;
  currency?: string;
  occurredAt?: string | Date;
  description?: string | null;
  merchant?: string | null;
  categoryId?: string | null;
  receiptUrl?: string | null;
}

export const transactionService = {
  /**
   * Get paginated list of transactions with filters
   */
  async getTransactions(filters?: TransactionFilters): Promise<PaginatedResponse<Transaction>> {
    const response = await api.get<PaginatedResponse<Transaction>>('/transactions', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get a specific transaction by ID
   */
  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    const response = await api.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return response.data;
  },

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionData): Promise<ApiResponse<Transaction>> {
    const response = await api.post<ApiResponse<Transaction>>('/transactions', data);
    return response.data;
  },

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: string,
    data: UpdateTransactionData
  ): Promise<ApiResponse<Transaction>> {
    const response = await api.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
    return response.data;
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/transactions/${id}`);
    return response.data;
  },
};
