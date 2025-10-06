import { Prisma, Transaction, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma";

/**
 * Transaction Repository
 * Handles all Prisma queries for transactions
 */

export interface TransactionFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class TransactionRepository {
  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: TransactionFilters): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {
      userId: filters.userId,
    };

    if (filters.startDate || filters.endDate) {
      where.occurredAt = {};
      if (filters.startDate) {
        where.occurredAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.occurredAt.lte = filters.endDate;
      }
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {};
      if (filters.minAmount !== undefined) {
        where.amount.gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        where.amount.lte = filters.maxAmount;
      }
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: "insensitive" } },
        { merchant: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  /**
   * Create a new transaction
   */
  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    return prisma.transaction.create({
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * Find transaction by ID for a specific user
   */
  async findById(id: string, userId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Find all transactions with filters and pagination
   */
  async findMany(
    filters: TransactionFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const where = this.buildWhereClause(filters);
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update transaction by ID
   */
  async update(
    id: string,
    userId: string,
    data: Prisma.TransactionUpdateInput
  ): Promise<Transaction | null> {
    // Check ownership first
    const existing = await this.findById(id, userId);
    if (!existing) {
      return null;
    }

    return prisma.transaction.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * Delete transaction by ID
   */
  async delete(id: string, userId: string): Promise<boolean> {
    // Check ownership first
    const existing = await this.findById(id, userId);
    if (!existing) {
      return false;
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Count transactions matching filters
   */
  async count(filters: TransactionFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.transaction.count({ where });
  }

  /**
   * Check if transaction exists and belongs to user
   */
  async exists(id: string, userId: string): Promise<boolean> {
    const count = await prisma.transaction.count({
      where: {
        id,
        userId,
      },
    });
    return count > 0;
  }
}

// Export singleton instance
export const transactionRepository = new TransactionRepository();
