import { Transaction, TransactionType } from "@prisma/client";
import {
  transactionRepository,
  TransactionFilters,
  PaginationParams,
  PaginatedResult,
} from "./transaction.repo";
import { prisma } from "../../db/prisma";
import {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "./transaction.validators";

/**
 * Transaction Service
 * Business logic for transaction operations
 */

export class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(
    userId: string,
    data: CreateTransactionInput
  ): Promise<Transaction> {
    // If categoryId provided, validate it exists and belongs to user
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          userId,
        },
      });

      if (!category) {
        throw new Error("Category not found or does not belong to user");
      }

      // Validate category type matches transaction type
      if (category.type !== data.type) {
        throw new Error(
          `Category type (${category.type}) does not match transaction type (${data.type})`
        );
      }
    }

    // Create transaction
    const createData: any = {
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      occurredAt: data.occurredAt,
      user: {
        connect: { id: userId },
      },
    };

    if (data.description) {
      createData.description = data.description;
    }
    if (data.merchant) {
      createData.merchant = data.merchant;
    }
    if (data.receiptUrl) {
      createData.receiptUrl = data.receiptUrl;
    }
    if (data.categoryId) {
      createData.category = { connect: { id: data.categoryId } };
    }

    return transactionRepository.create(createData);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(
    id: string,
    userId: string
  ): Promise<Transaction | null> {
    return transactionRepository.findById(id, userId);
  }

  /**
   * List transactions with filters and pagination
   */
  async listTransactions(
    userId: string,
    filters: Omit<TransactionFilters, "userId">,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    // Validate date range
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new Error("Start date must be before or equal to end date");
    }

    // Validate amount range
    if (
      filters.minAmount !== undefined &&
      filters.maxAmount !== undefined &&
      filters.minAmount > filters.maxAmount
    ) {
      throw new Error("Min amount must be less than or equal to max amount");
    }

    return transactionRepository.findMany(
      { ...filters, userId },
      pagination
    );
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    id: string,
    userId: string,
    data: UpdateTransactionInput
  ): Promise<Transaction> {
    // Check transaction exists and belongs to user
    const existing = await transactionRepository.findById(id, userId);
    if (!existing) {
      throw new Error("Transaction not found");
    }

    // If categoryId is being updated, validate it
    if (data.categoryId !== undefined) {
      if (data.categoryId === null) {
        // Removing category is allowed
      } else {
        const category = await prisma.category.findFirst({
          where: {
            id: data.categoryId,
            userId,
          },
        });

        if (!category) {
          throw new Error("Category not found or does not belong to user");
        }

        // Validate category type matches transaction type
        const transactionType = data.type || existing.type;
        if (category.type !== transactionType) {
          throw new Error(
            `Category type (${category.type}) does not match transaction type (${transactionType})`
          );
        }
      }
    }

    // If type is being changed and transaction has a category, validate compatibility
    if (data.type && data.type !== existing.type && existing.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: existing.categoryId },
      });

      if (category && category.type !== data.type) {
        throw new Error(
          `Cannot change transaction type to ${data.type} because it has a ${category.type} category assigned. Remove the category first or choose a compatible category.`
        );
      }
    }

    // Update transaction
    const updateData: any = {};

    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.amount !== undefined) {
      updateData.amount = data.amount;
    }
    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }
    if (data.occurredAt !== undefined) {
      updateData.occurredAt = data.occurredAt;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.merchant !== undefined) {
      updateData.merchant = data.merchant;
    }
    if (data.receiptUrl !== undefined) {
      updateData.receiptUrl = data.receiptUrl;
    }
    if (data.categoryId !== undefined) {
      updateData.category =
        data.categoryId === null
          ? { disconnect: true }
          : { connect: { id: data.categoryId } };
    }

    const updated = await transactionRepository.update(id, userId, updateData);

    if (!updated) {
      throw new Error("Failed to update transaction");
    }

    return updated;
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string, userId: string): Promise<void> {
    const deleted = await transactionRepository.delete(id, userId);
    if (!deleted) {
      throw new Error("Transaction not found");
    }
  }

  /**
   * Count transactions matching filters
   */
  async countTransactions(
    userId: string,
    filters: Omit<TransactionFilters, "userId">
  ): Promise<number> {
    return transactionRepository.count({ ...filters, userId });
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
