import { StatsService } from './stats.service';
import { prisma } from '../../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';

jest.mock('../../db/prisma', () => ({
  prisma: {
    transaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  },
}));

describe('StatsService', () => {
  let statsService: StatsService;
  const mockUserId = 'user-123';

  beforeEach(() => {
    statsService = new StatsService();
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return summary with income, expenses, and net', async () => {
      // Mock income aggregate
      (prisma.transaction.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { amount: new Decimal(5000) },
      });

      // Mock expense aggregate
      (prisma.transaction.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { amount: new Decimal(3000) },
      });

      const result = await statsService.getSummary(mockUserId);

      expect(result).toEqual({
        income: 5000,
        expenses: 3000,
        net: 2000,
      });

      expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should handle null sums (no transactions)', async () => {
      (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await statsService.getSummary(mockUserId);

      expect(result).toEqual({
        income: 0,
        expenses: 0,
        net: 0,
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: new Decimal(1000) },
      });

      await statsService.getSummary(mockUserId, startDate, endDate);

      expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            occurredAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('should handle only startDate', async () => {
      const startDate = new Date('2025-10-01');

      (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: new Decimal(1000) },
      });

      await statsService.getSummary(mockUserId, startDate);

      expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            occurredAt: { gte: startDate },
          }),
        })
      );
    });

    it('should handle only endDate', async () => {
      const endDate = new Date('2025-10-31');

      (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: new Decimal(1000) },
      });

      await statsService.getSummary(mockUserId, undefined, endDate);

      expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            occurredAt: { lte: endDate },
          }),
        })
      );
    });
  });

  describe('getExpensesByCategory', () => {
    it('should return expenses grouped by category', async () => {
      const mockGroupByResult = [
        { categoryId: 'cat-1', _sum: { amount: new Decimal(1500) } },
        { categoryId: 'cat-2', _sum: { amount: new Decimal(800) } },
        { categoryId: null, _sum: { amount: new Decimal(200) } },
      ];

      const mockCategories = [
        { id: 'cat-1', name: 'Groceries' },
        { id: 'cat-2', name: 'Transport' },
      ];

      (prisma.transaction.groupBy as jest.Mock).mockResolvedValue(mockGroupByResult);
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await statsService.getExpensesByCategory(mockUserId);

      expect(result).toEqual([
        { categoryId: 'cat-1', categoryName: 'Groceries', amount: 1500 },
        { categoryId: 'cat-2', categoryName: 'Transport', amount: 800 },
        { categoryId: null, categoryName: null, amount: 200 },
      ]);

      expect(prisma.transaction.groupBy).toHaveBeenCalledWith({
        by: ['categoryId'],
        where: {
          userId: mockUserId,
          type: 'EXPENSE',
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-1', 'cat-2'] } },
        select: { id: true, name: true },
      });
    });

    it('should handle empty results', async () => {
      (prisma.transaction.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

      const result = await statsService.getExpensesByCategory(mockUserId);

      expect(result).toEqual([]);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      (prisma.transaction.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

      await statsService.getExpensesByCategory(mockUserId, startDate, endDate);

      expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            type: 'EXPENSE',
            occurredAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('should handle null amounts', async () => {
      const mockGroupByResult = [
        { categoryId: 'cat-1', _sum: { amount: null } },
      ];

      (prisma.transaction.groupBy as jest.Mock).mockResolvedValue(mockGroupByResult);
      (prisma.category.findMany as jest.Mock).mockResolvedValue([
        { id: 'cat-1', name: 'Test' },
      ]);

      const result = await statsService.getExpensesByCategory(mockUserId);

      expect(result[0]?.amount).toBe(0);
    });
  });

  describe('getExpensesOverTime', () => {
    it('should aggregate by daily interval', async () => {
      const mockTransactions = [
        {
          type: 'INCOME' as const,
          amount: new Decimal(1000),
          occurredAt: new Date('2025-10-01T10:00:00Z'),
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(500),
          occurredAt: new Date('2025-10-01T14:00:00Z'),
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(300),
          occurredAt: new Date('2025-10-02T10:00:00Z'),
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await statsService.getExpensesOverTime(mockUserId, 'daily');

      expect(result).toEqual([
        { dateKey: '2025-10-01', income: 1000, expenses: 500, net: 500 },
        { dateKey: '2025-10-02', income: 0, expenses: 300, net: -300 },
      ]);
    });

    it('should aggregate by weekly interval', async () => {
      const mockTransactions = [
        {
          type: 'INCOME' as const,
          amount: new Decimal(2000),
          occurredAt: new Date('2025-10-01T10:00:00Z'), // Week 40
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(800),
          occurredAt: new Date('2025-10-03T10:00:00Z'), // Week 40
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(500),
          occurredAt: new Date('2025-10-08T10:00:00Z'), // Week 41
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await statsService.getExpensesOverTime(mockUserId, 'weekly');

      expect(result.length).toBe(2);
      expect(result[0]?.dateKey).toMatch(/2025-W\d{2}/);
      expect(result[0]?.income).toBe(2000);
      expect(result[0]?.expenses).toBe(800);
    });

    it('should aggregate by monthly interval', async () => {
      const mockTransactions = [
        {
          type: 'INCOME' as const,
          amount: new Decimal(5000),
          occurredAt: new Date('2025-10-05T10:00:00Z'),
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(2000),
          occurredAt: new Date('2025-10-15T10:00:00Z'),
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(1500),
          occurredAt: new Date('2025-11-05T10:00:00Z'),
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await statsService.getExpensesOverTime(mockUserId, 'monthly');

      expect(result).toEqual([
        { dateKey: '2025-10', income: 5000, expenses: 2000, net: 3000 },
        { dateKey: '2025-11', income: 0, expenses: 1500, net: -1500 },
      ]);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await statsService.getExpensesOverTime(mockUserId, 'daily', startDate, endDate);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          occurredAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          type: true,
          amount: true,
          occurredAt: true,
        },
        orderBy: {
          occurredAt: 'asc',
        },
      });
    });

    it('should return empty array for no transactions', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      const result = await statsService.getExpensesOverTime(mockUserId, 'daily');

      expect(result).toEqual([]);
    });

    it('should handle multiple transactions on same day', async () => {
      const mockTransactions = [
        {
          type: 'INCOME' as const,
          amount: new Decimal(1000),
          occurredAt: new Date('2025-10-01T08:00:00Z'),
        },
        {
          type: 'INCOME' as const,
          amount: new Decimal(500),
          occurredAt: new Date('2025-10-01T12:00:00Z'),
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(300),
          occurredAt: new Date('2025-10-01T16:00:00Z'),
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(200),
          occurredAt: new Date('2025-10-01T20:00:00Z'),
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await statsService.getExpensesOverTime(mockUserId, 'daily');

      expect(result).toEqual([
        { dateKey: '2025-10-01', income: 1500, expenses: 500, net: 1000 },
      ]);
    });

    it('should sort results chronologically', async () => {
      const mockTransactions = [
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(300),
          occurredAt: new Date('2025-10-15T10:00:00Z'),
        },
        {
          type: 'INCOME' as const,
          amount: new Decimal(1000),
          occurredAt: new Date('2025-10-05T10:00:00Z'),
        },
        {
          type: 'EXPENSE' as const,
          amount: new Decimal(200),
          occurredAt: new Date('2025-10-25T10:00:00Z'),
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await statsService.getExpensesOverTime(mockUserId, 'daily');

      expect(result[0]?.dateKey).toBe('2025-10-05');
      expect(result[1]?.dateKey).toBe('2025-10-15');
      expect(result[2]?.dateKey).toBe('2025-10-25');
    });
  });
});
