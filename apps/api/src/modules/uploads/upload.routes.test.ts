/**
 * Upload Routes Integration Tests
 * 
 * Tests for all 6 upload endpoints with file uploads, multipart form data,
 * authentication, validation, and error handling.
 * 
 * @module modules/uploads/routes.test
 */

import request from 'supertest';
import app from '../../app';
import { createAuthenticatedUser } from '../../__tests__/helpers';
import { prismaTest } from '../../__tests__/setup';
import { CategoryType, TransactionType } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Test file paths
const TEST_RECEIPT_PATH = path.join(__dirname, 'testfiles', 'petrol-or-fuel-receipt-template-for-Asian-or-India-customer.png');
const TEST_STATEMENT_PATH = path.join(__dirname, 'testfiles', 'dummy_statement.pdf');

describe('Upload API Integration Tests', () => {
  describe('POST /api/uploads/receipt', () => {
    it('should upload and extract receipt data', async () => {
      const { user, token } = await createAuthenticatedUser('receipt-upload@example.com');

      // Create a category
      await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      const response = await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.previewId).toBeDefined();
      expect(response.body.data.type).toBe('receipt');
      expect(response.body.data.extractedData).toBeDefined();
      expect(response.body.data.suggestedTransaction).toBeDefined();
      expect(response.body.data.extractedData.amount).toBeGreaterThan(0);
      expect(response.body.data.extractedData.date).toBeDefined();
      expect(response.body.message).toContain('processed successfully');
    }, 30000);

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/uploads/receipt')
        .attach('file', TEST_RECEIPT_PATH)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 if no file uploaded', async () => {
      const { token } = await createAuthenticatedUser('no-file@example.com');

      const response = await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject non-image files', async () => {
      const { token } = await createAuthenticatedUser('wrong-type@example.com');

      // Try uploading a PDF as receipt
      const response = await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_STATEMENT_PATH)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject files larger than 10MB', async () => {
      const { token } = await createAuthenticatedUser('large-file@example.com');

      // Create a large temporary file
      const largePath = path.join(__dirname, 'testfiles', 'large.png');
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB
      fs.writeFileSync(largePath, largeBuffer);

      try {
        const response = await request(app)
          .post('/api/uploads/receipt')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', largePath)
          .expect(400);

        expect(response.body.error).toBeDefined();
      } finally {
        // Cleanup
        if (fs.existsSync(largePath)) {
          fs.unlinkSync(largePath);
        }
      }
    });
  });

  describe('POST /api/uploads/statement', () => {
    it('should upload and extract statement data', async () => {
      const { user, token } = await createAuthenticatedUser('statement-upload@example.com');

      // Create categories
      await prismaTest.category.createMany({
        data: [
          { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
          { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      const response = await request(app)
        .post('/api/uploads/statement')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_STATEMENT_PATH)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.previewId).toBeDefined();
      expect(response.body.data.type).toBe('statement');
      expect(response.body.data.extractedData).toBeDefined();
      expect(response.body.data.suggestedTransactions).toBeDefined();
      expect(Array.isArray(response.body.data.extractedData.transactions)).toBe(true);
      expect(response.body.data.extractedData.transactions.length).toBeGreaterThan(0);
      expect(response.body.data.extractedData.summary).toBeDefined();
      expect(response.body.message).toContain('Found');
      expect(response.body.message).toContain('transactions');
    }, 45000);

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/uploads/statement')
        .attach('file', TEST_STATEMENT_PATH)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 if no file uploaded', async () => {
      const { token } = await createAuthenticatedUser('statement-no-file@example.com');

      const response = await request(app)
        .post('/api/uploads/statement')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject non-PDF files', async () => {
      const { token } = await createAuthenticatedUser('statement-wrong-type@example.com');

      // Try uploading an image as statement
      const response = await request(app)
        .post('/api/uploads/statement')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/uploads/receipt/commit', () => {
    it('should commit verified receipt transaction', async () => {
      const { user, token } = await createAuthenticatedUser('commit-receipt-route@example.com');

      // Create category
      const category = await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      // First upload receipt
      const uploadResponse = await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(200);

      const { previewId, extractedData } = uploadResponse.body.data;

      // Commit the transaction
      const commitResponse = await request(app)
        .post('/api/uploads/receipt/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          previewId,
          transaction: {
            type: 'EXPENSE',
            amount: extractedData.amount,
            description: 'Petrol expense',
            date: extractedData.date,
            categoryId: category.id,
          },
        })
        .expect(200);

      expect(commitResponse.body.success).toBe(true);
      expect(commitResponse.body.data.id).toBeDefined();
      expect(commitResponse.body.data.type).toBe('EXPENSE');
      expect(Number(commitResponse.body.data.amount)).toBe(extractedData.amount);
      expect(commitResponse.body.data.category).toBeDefined();
      expect(commitResponse.body.data.category.id).toBe(category.id);
    }, 30000);

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/uploads/receipt/commit')
        .send({
          previewId: 'test-id',
          transaction: {
            type: 'EXPENSE',
            amount: 100,
            description: 'Test',
            date: '2025-10-07',
            categoryId: 'cat-id',
          },
        })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 with validation errors', async () => {
      const { token } = await createAuthenticatedUser('commit-validation@example.com');

      const response = await request(app)
        .post('/api/uploads/receipt/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          previewId: 'test-id',
          transaction: {
            type: 'INVALID_TYPE',
            amount: -100, // Invalid negative
            description: 'Test',
            date: 'invalid-date',
            categoryId: 'cat-id',
          },
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toBeDefined();
    });

    it('should return 404 for non-existent preview', async () => {
      const { user, token } = await createAuthenticatedUser('commit-not-found@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      const response = await request(app)
        .post('/api/uploads/receipt/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          previewId: 'non-existent-id',
          transaction: {
            type: 'EXPENSE',
            amount: 100,
            description: 'Test',
            date: '2025-10-07',
            categoryId: category.id,
          },
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid category', async () => {
      const { token } = await createAuthenticatedUser('commit-invalid-cat@example.com');

      // Upload receipt first
      const uploadResponse = await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(200);

      const { previewId, extractedData } = uploadResponse.body.data;

      // Try to commit with invalid category
      const response = await request(app)
        .post('/api/uploads/receipt/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          previewId,
          transaction: {
            type: 'EXPENSE',
            amount: extractedData.amount,
            description: 'Test',
            date: extractedData.date,
            categoryId: 'invalid-category-id',
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    }, 30000);
  });

  describe('POST /api/uploads/statement/commit', () => {
    it('should commit verified statement transactions', async () => {
      const { user, token } = await createAuthenticatedUser('commit-statement-route@example.com');

      // Create categories
      const incomeCategory = await prismaTest.category.create({
        data: { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
      });
      const expenseCategory = await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Upload statement first
      const uploadResponse = await request(app)
        .post('/api/uploads/statement')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_STATEMENT_PATH)
        .expect(200);

      const { previewId, extractedData } = uploadResponse.body.data;

      // Prepare transactions for commit (use first 3)
      const transactions = extractedData.transactions.slice(0, 3).map((txn: any) => ({
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        date: txn.date,
        categoryId: txn.type === 'INCOME' ? incomeCategory.id : expenseCategory.id,
      }));

      // Commit transactions
      const commitResponse = await request(app)
        .post('/api/uploads/statement/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          previewId,
          transactions,
          options: {
            skipDuplicates: true,
          },
        })
        .expect(200);

      expect(commitResponse.body.success).toBe(true);
      expect(commitResponse.body.data.created).toBe(3);
      expect(commitResponse.body.data.skipped).toBe(0);
      expect(commitResponse.body.data.total).toBe(3);
      expect(commitResponse.body.message).toContain('imported');

      // Verify transactions were created
      const savedTransactions = await prismaTest.transaction.findMany({
        where: { userId: user.id },
      });
      expect(savedTransactions).toHaveLength(3);
    }, 45000);

    it('should skip duplicate transactions', async () => {
      const { user, token } = await createAuthenticatedUser('commit-dedup-route@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Create existing transaction
      await prismaTest.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.EXPENSE,
          amount: 500,
          description: 'Existing transaction',
          occurredAt: new Date('2025-10-01'),
          categoryId: category.id,
        },
      });

      // Upload statement
      const uploadResponse = await request(app)
        .post('/api/uploads/statement')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_STATEMENT_PATH)
        .expect(200);

      const { previewId } = uploadResponse.body.data;

      // Prepare transactions including duplicate
      const transactions = [
        {
          type: 'EXPENSE',
          amount: 500,
          description: 'Existing transaction', // Duplicate
          date: '2025-10-01',
          categoryId: category.id,
        },
        {
          type: 'EXPENSE',
          amount: 300,
          description: 'New transaction',
          date: '2025-10-02',
          categoryId: category.id,
        },
      ];

      const commitResponse = await request(app)
        .post('/api/uploads/statement/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          previewId,
          transactions,
          options: {
            skipDuplicates: true,
          },
        })
        .expect(200);

      expect(commitResponse.body.data.created).toBe(1);
      expect(commitResponse.body.data.skipped).toBe(1);
      expect(commitResponse.body.data.total).toBe(2);
    }, 45000);

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/uploads/statement/commit')
        .send({
          previewId: 'test-id',
          transactions: [],
        })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 with validation errors', async () => {
      const { token } = await createAuthenticatedUser('statement-validation@example.com');

      const response = await request(app)
        .post('/api/uploads/statement/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          previewId: 'test-id',
          transactions: [
            {
              type: 'INVALID',
              amount: -100,
              description: 'Test',
              date: 'invalid',
              categoryId: 'cat',
            },
          ],
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/uploads/previews', () => {
    it('should list all active previews', async () => {
      const { user, token } = await createAuthenticatedUser('list-previews-route@example.com');

      // Create category
      await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Upload receipt and statement
      await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(200);

      await request(app)
        .post('/api/uploads/statement')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_STATEMENT_PATH)
        .expect(200);

      // List previews
      const response = await request(app)
        .get('/api/uploads/previews')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    }, 60000);

    it('should filter previews by type', async () => {
      const { user, token } = await createAuthenticatedUser('filter-previews@example.com');

      await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Upload both types
      await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(200);

      await request(app)
        .post('/api/uploads/statement')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_STATEMENT_PATH)
        .expect(200);

      // Filter by receipt
      const receiptResponse = await request(app)
        .get('/api/uploads/previews?type=receipt')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(receiptResponse.body.data.every((p: any) => p.type === 'receipt')).toBe(true);

      // Filter by statement
      const statementResponse = await request(app)
        .get('/api/uploads/previews?type=statement')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(statementResponse.body.data.every((p: any) => p.type === 'statement')).toBe(true);
    }, 60000);

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/uploads/previews')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return empty array for user with no previews', async () => {
      const { token } = await createAuthenticatedUser('no-previews@example.com');

      const response = await request(app)
        .get('/api/uploads/previews')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/uploads/previews/:id', () => {
    it('should retrieve specific preview', async () => {
      const { user, token } = await createAuthenticatedUser('get-preview-route@example.com');

      await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Upload receipt
      const uploadResponse = await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(200);

      const { previewId } = uploadResponse.body.data;

      // Get preview
      const response = await request(app)
        .get(`/api/uploads/previews/${previewId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(previewId);
      expect(response.body.data.type).toBe('receipt');
      expect(response.body.data.userId).toBe(user.id);
    }, 30000);

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/uploads/previews/test-id')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent preview', async () => {
      const { token } = await createAuthenticatedUser('preview-not-found@example.com');

      const response = await request(app)
        .get('/api/uploads/previews/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 403 for preview belonging to another user', async () => {
      const { user: user1, token: token1 } = await createAuthenticatedUser('preview-owner@example.com');
      const { token: token2 } = await createAuthenticatedUser('preview-other@example.com');

      await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user1.id },
      });

      // User1 uploads receipt
      const uploadResponse = await request(app)
        .post('/api/uploads/receipt')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', TEST_RECEIPT_PATH)
        .expect(200);

      const { previewId } = uploadResponse.body.data;

      // User2 tries to access
      const response = await request(app)
        .get(`/api/uploads/previews/${previewId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    }, 30000);
  });
});
