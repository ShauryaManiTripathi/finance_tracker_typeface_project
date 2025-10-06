import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';

export interface SummaryStats {
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryExpense {
  categoryId: string | null;
  categoryName: string | null;
  amount: number;
}

export interface TimeSeriesData {
  dateKey: string;
  income: number;
  expenses: number;
  net: number;
}

export class StatsService {
  /**
   * Get summary statistics (total income, expenses, and net) for a user within a date range
   */
  async getSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SummaryStats> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(startDate || endDate ? {
        occurredAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    // Aggregate income
    const incomeResult = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: 'INCOME',
      },
      _sum: {
        amount: true,
      },
    });

    // Aggregate expenses
    const expenseResult = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: 'EXPENSE',
      },
      _sum: {
        amount: true,
      },
    });

    const income = incomeResult._sum.amount?.toNumber() || 0;
    const expenses = expenseResult._sum.amount?.toNumber() || 0;

    return {
      income,
      expenses,
      net: income - expenses,
    };
  }

  /**
   * Get expenses grouped by category within a date range
   */
  async getExpensesByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryExpense[]> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: 'EXPENSE',
      ...(startDate || endDate ? {
        occurredAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    // Group by category
    const results = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    // Fetch category names for non-null categoryIds
    const categoryIds = results
      .map(r => r.categoryId)
      .filter((id): id is string => id !== null);

    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    return results.map(result => ({
      categoryId: result.categoryId,
      categoryName: result.categoryId ? categoryMap.get(result.categoryId) || null : null,
      amount: result._sum.amount?.toNumber() || 0,
    }));
  }

  /**
   * Get income and expenses over time with specified interval
   */
  async getExpensesOverTime(
    userId: string,
    interval: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): Promise<TimeSeriesData[]> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(startDate || endDate ? {
        occurredAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      } : {}),
    };

    // Fetch all transactions in the range
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        type: true,
        amount: true,
        occurredAt: true,
      },
      orderBy: {
        occurredAt: 'asc',
      },
    });

    // Group transactions by the specified interval
    const buckets = new Map<string, { income: number; expenses: number }>();

    transactions.forEach(transaction => {
      const dateKey = this.formatDateKey(transaction.occurredAt, interval);
      
      if (!buckets.has(dateKey)) {
        buckets.set(dateKey, { income: 0, expenses: 0 });
      }

      const bucket = buckets.get(dateKey)!;
      const amount = transaction.amount.toNumber();

      if (transaction.type === 'INCOME') {
        bucket.income += amount;
      } else {
        bucket.expenses += amount;
      }
    });

    // Convert to array and calculate net
    const result: TimeSeriesData[] = Array.from(buckets.entries())
      .map(([dateKey, { income, expenses }]) => ({
        dateKey,
        income,
        expenses,
        net: income - expenses,
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    return result;
  }

  /**
   * Format a date according to the specified interval
   */
  private formatDateKey(date: Date, interval: 'daily' | 'weekly' | 'monthly'): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    switch (interval) {
      case 'daily':
        return `${year}-${month}-${day}`;
      
      case 'weekly': {
        // ISO week number
        const weekNumber = this.getISOWeek(date);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
      }
      
      case 'monthly':
        return `${year}-${month}`;
      
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Calculate ISO week number for a date
   */
  private getISOWeek(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) {
      target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }
}

export const statsService = new StatsService();
