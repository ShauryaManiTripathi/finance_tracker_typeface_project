import request from 'supertest';
import app from '../../app';
import { prismaTest } from '../../__tests__/setup';
import { createAuthenticatedUser } from '../../__tests__/helpers';

describe('Stats Routes', () => {
  let authToken: string;
  let userId: string;
  let categoryId1: string;
  let categoryId2: string;

  beforeEach(async () => {
    // Create authenticated user
    const userData = await createAuthenticatedUser();
    authToken = userData.token;
    userId = userData.user.id;

    // Create test categories
    const category1 = await prismaTest.category.create({
      data: {
        name: 'Groceries',
        type: 'EXPENSE',
        userId,
      },
    });
    categoryId1 = category1.id;

    const category2 = await prismaTest.category.create({
      data: {
        name: 'Salary',
        type: 'INCOME',
        userId,
      },
    });
    categoryId2 = category2.id;

    // Create test transactions
    await prismaTest.transaction.createMany({
      data: [
        // Income
        {
          type: 'INCOME',
          amount: 5000,
          currency: 'INR',
          occurredAt: new Date('2025-10-01T10:00:00Z'),
          description: 'Monthly salary',
          categoryId: categoryId2,
          userId,
        },
        {
          type: 'INCOME',
          amount: 1000,
          currency: 'INR',
          occurredAt: new Date('2025-10-15T10:00:00Z'),
          description: 'Bonus',
          userId,
        },
        // Expenses
        {
          type: 'EXPENSE',
          amount: 800,
          currency: 'INR',
          occurredAt: new Date('2025-10-05T10:00:00Z'),
          description: 'Groceries shopping',
          categoryId: categoryId1,
          userId,
        },
        {
          type: 'EXPENSE',
          amount: 1200,
          currency: 'INR',
          occurredAt: new Date('2025-10-10T10:00:00Z'),
          description: 'More groceries',
          categoryId: categoryId1,
          userId,
        },
        {
          type: 'EXPENSE',
          amount: 500,
          currency: 'INR',
          occurredAt: new Date('2025-10-20T10:00:00Z'),
          description: 'Uncategorized expense',
          userId,
        },
      ],
    });
  });

  describe('GET /stats/summary', () => {
    it('should return summary statistics for all transactions', async () => {
      const response = await request(app)
        .get('/api/stats/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        income: 6000,
        expenses: 2500,
        net: 3500,
      });
    });

    it('should filter by startDate', async () => {
      const response = await request(app)
        .get('/api/stats/summary')
        .query({ startDate: '2025-10-10' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        income: 1000, // Only bonus
        expenses: 1700, // 1200 + 500
        net: -700,
      });
    });

    it('should filter by endDate', async () => {
      const response = await request(app)
        .get('/api/stats/summary')
        .query({ endDate: '2025-10-10' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        income: 5000, // Only salary
        expenses: 2000, // 800 + 1200
        net: 3000,
      });
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/stats/summary')
        .query({
          startDate: '2025-10-05',
          endDate: '2025-10-15',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        income: 1000, // Bonus
        expenses: 2000, // 800 + 1200
        net: -1000,
      });
    });

    it('should return 400 for invalid date range', async () => {
      const response = await request(app)
        .get('/api/stats/summary')
        .query({
          startDate: '2025-10-20',
          endDate: '2025-10-10',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stats/summary');

      expect(response.status).toBe(401);
    });

    it('should return zeros when no transactions in range', async () => {
      const response = await request(app)
        .get('/api/stats/summary')
        .query({
          startDate: '2025-11-01',
          endDate: '2025-11-30',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        income: 0,
        expenses: 0,
        net: 0,
      });
    });
  });

  describe('GET /stats/expenses-by-category', () => {
    it('should return expenses grouped by category', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-by-category')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // Should be sorted by amount descending
      expect(parseFloat(response.body.data[0].amount)).toBe(2000); // Groceries
      expect(response.body.data[0].categoryId).toBe(categoryId1);
      expect(response.body.data[0].categoryName).toBe('Groceries');

      expect(parseFloat(response.body.data[1].amount)).toBe(500); // Uncategorized
      expect(response.body.data[1].categoryId).toBeNull();
      expect(response.body.data[1].categoryName).toBeNull();
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-by-category')
        .query({
          startDate: '2025-10-01',
          endDate: '2025-10-10',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(parseFloat(response.body.data[0].amount)).toBe(2000); // 800 + 1200
      expect(response.body.data[0].categoryName).toBe('Groceries');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-by-category');

      expect(response.status).toBe(401);
    });

    it('should return empty array when no expenses', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-by-category')
        .query({
          startDate: '2025-11-01',
          endDate: '2025-11-30',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should only return expenses (not income)', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-by-category')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should not include the Salary category
      const salaryCategory = response.body.data.find(
        (item: any) => item.categoryId === categoryId2
      );
      expect(salaryCategory).toBeUndefined();
    });
  });

  describe('GET /stats/expenses-over-time', () => {
    it('should return daily time series by default', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check first bucket
      const firstBucket = response.body.data[0];
      expect(firstBucket).toHaveProperty('dateKey');
      expect(firstBucket).toHaveProperty('income');
      expect(firstBucket).toHaveProperty('expenses');
      expect(firstBucket).toHaveProperty('net');
      expect(firstBucket.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
    });

    it('should aggregate by daily interval', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .query({ interval: 'daily' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Find Oct 10 bucket
      const oct10 = response.body.data.find(
        (item: any) => item.dateKey === '2025-10-10'
      );
      
      expect(oct10).toBeDefined();
      expect(oct10.income).toBe(0);
      expect(parseFloat(oct10.expenses)).toBe(1200);
      expect(parseFloat(oct10.net)).toBe(-1200);
    });

    it('should aggregate by weekly interval', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .query({ interval: 'weekly' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Week format: YYYY-Wxx
      response.body.data.forEach((item: any) => {
        expect(item.dateKey).toMatch(/^\d{4}-W\d{2}$/);
      });
    });

    it('should aggregate by monthly interval', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .query({ interval: 'monthly' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1); // All in October
      
      const october = response.body.data[0];
      expect(october.dateKey).toBe('2025-10');
      expect(october.income).toBe(6000);
      expect(parseFloat(october.expenses)).toBe(2500);
      expect(parseFloat(october.net)).toBe(3500);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .query({
          startDate: '2025-10-05',
          endDate: '2025-10-15',
          interval: 'daily',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Should only include dates in range
      response.body.data.forEach((item: any) => {
        const date = new Date(item.dateKey);
        expect(date >= new Date('2025-10-05')).toBe(true);
        expect(date <= new Date('2025-10-15')).toBe(true);
      });
    });

    it('should return 400 for invalid interval', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .query({ interval: 'yearly' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time');

      expect(response.status).toBe(401);
    });

    it('should return empty array when no transactions in range', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .query({
          startDate: '2025-11-01',
          endDate: '2025-11-30',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should be sorted chronologically', async () => {
      const response = await request(app)
        .get('/api/stats/expenses-over-time')
        .query({ interval: 'daily' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const dateKeys = response.body.data.map((item: any) => item.dateKey);
      const sortedDateKeys = [...dateKeys].sort();
      expect(dateKeys).toEqual(sortedDateKeys);
    });
  });

  describe('Multi-user isolation', () => {
    it('should only return stats for the authenticated user', async () => {
      // Create another user with transactions
      const otherUserData = await createAuthenticatedUser('other@example.com', 'password123');
      await prismaTest.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 9999,
          currency: 'INR',
          occurredAt: new Date('2025-10-15T10:00:00Z'),
          description: 'Other user expense',
          userId: otherUserData.user.id,
        },
      });

      // Query with first user's token
      const response = await request(app)
        .get('/api/stats/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should not include other user's 9999 expense
      expect(response.body.data.expenses).toBe(2500);
    });
  });
});
