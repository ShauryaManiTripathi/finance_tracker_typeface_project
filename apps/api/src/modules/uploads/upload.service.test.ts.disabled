/**
 * Upload Service Tests
 * 
 * Tests for AI-powered receipt and statement extraction using Gemini Vision API.
 * Includes integration tests with real test files.
 * 
 * @module modules/uploads/service.test
 */

import * as uploadService from './upload.service';
import { prismaTest } from '../../__tests__/setup';
import { createAuthenticatedUser } from '../../__tests__/helpers';
import { CategoryType, TransactionType } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import * as geminiUtils from '../../utils/gemini';

// Test file paths
const TEST_RECEIPT_PATH = path.join(__dirname, 'testfiles', 'petrol-or-fuel-receipt-template-for-Asian-or-India-customer.png');
const TEST_STATEMENT_PATH = path.join(__dirname, 'testfiles', 'dummy_statement.pdf');

describe('UploadService', () => {
  describe('extractReceiptData', () => {
    it('should extract data from receipt image using Gemini', async () => {
      const { user } = await createAuthenticatedUser('receipt1@example.com');

      // Create a category for suggestion
      await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Verify test file exists
      expect(fs.existsSync(TEST_RECEIPT_PATH)).toBe(true);

      // Extract receipt data
      const preview = await uploadService.extractReceiptData(
        TEST_RECEIPT_PATH,
        'image/png',
        user.id
      );

      // Verify preview structure
      expect(preview.previewId).toBeDefined();
      expect(preview.type).toBe('receipt');
      expect(preview.extractedData).toBeDefined();
      expect(preview.suggestedTransaction).toBeDefined();
      expect(preview.expiresAt).toBeDefined();
      expect(preview.createdAt).toBeDefined();

      // Verify extracted data has required fields
      expect(preview.extractedData.date).toBeDefined();
      expect(preview.extractedData.amount).toBeGreaterThan(0);
      expect(preview.extractedData.currency).toBeDefined();

      // Verify suggested transaction
      expect(preview.suggestedTransaction.type).toBe('EXPENSE');
      expect(preview.suggestedTransaction.amount).toBe(preview.extractedData.amount);
      expect(preview.suggestedTransaction.description).toBeDefined();
      expect(preview.suggestedTransaction.date).toBe(preview.extractedData.date);

      // Verify preview was saved to database
      const savedPreview = await prismaTest.uploadPreview.findUnique({
        where: { id: preview.previewId },
      });
      expect(savedPreview).toBeDefined();
      expect(savedPreview?.userId).toBe(user.id);
      expect(savedPreview?.type).toBe('receipt');
    }, 30000); // 30s timeout for AI processing

    it('should handle invalid receipt image gracefully', async () => {
      const { user } = await createAuthenticatedUser('receipt-invalid@example.com');

      // Create a temporary invalid file
      const invalidPath = path.join(__dirname, 'testfiles', 'invalid.png');
      fs.writeFileSync(invalidPath, 'not a real image');

      try {
        await expect(
          uploadService.extractReceiptData(invalidPath, 'image/png', user.id)
        ).rejects.toThrow();
      } finally {
        // Cleanup
        if (fs.existsSync(invalidPath)) {
          fs.unlinkSync(invalidPath);
        }
      }
    });

    it('should suggest category based on merchant name', async () => {
      const { user } = await createAuthenticatedUser('receipt-category@example.com');

      // Create categories
      await prismaTest.category.createMany({
        data: [
          { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
          { name: 'Food', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      // Extract (petrol receipt should suggest Transport category)
      const preview = await uploadService.extractReceiptData(
        TEST_RECEIPT_PATH,
        'image/png',
        user.id
      );

      // Should suggest Transport category (contains fuel/petrol keywords)
      expect(preview.suggestedTransaction.categoryId).toBeDefined();
    }, 30000);

    it('should set preview expiration to 15 minutes', async () => {
      const { user } = await createAuthenticatedUser('receipt-ttl@example.com');

      const preview = await uploadService.extractReceiptData(
        TEST_RECEIPT_PATH,
        'image/png',
        user.id
      );

      const expiresAt = new Date(preview.expiresAt);
      const createdAt = new Date(preview.createdAt);
      const diffMinutes = (expiresAt.getTime() - createdAt.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeCloseTo(15, 0);
    }, 30000);
  });

  describe('extractStatementData', () => {
    it('should extract multiple transactions from PDF statement', async () => {
      const { user } = await createAuthenticatedUser('statement1@example.com');

      // Create categories for suggestions
      await prismaTest.category.createMany({
        data: [
          { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
          { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      // Verify test file exists
      expect(fs.existsSync(TEST_STATEMENT_PATH)).toBe(true);

      // Extract statement data
      const preview = await uploadService.extractStatementData(
        TEST_STATEMENT_PATH,
        user.id
      );

      // Verify preview structure
      expect(preview.previewId).toBeDefined();
      expect(preview.type).toBe('statement');
      expect(preview.extractedData).toBeDefined();
      expect(preview.suggestedTransactions).toBeDefined();
      expect(Array.isArray(preview.extractedData.transactions)).toBe(true);
      expect(Array.isArray(preview.suggestedTransactions)).toBe(true);

      // Verify transactions were extracted
      expect(preview.extractedData.transactions.length).toBeGreaterThan(0);
      expect(preview.suggestedTransactions.length).toBe(preview.extractedData.transactions.length);

      // Verify summary
      expect(preview.extractedData.summary).toBeDefined();
      expect(preview.extractedData.summary.transactionCount).toBe(preview.extractedData.transactions.length);
      expect(typeof preview.extractedData.summary.totalIncome).toBe('number');
      expect(typeof preview.extractedData.summary.totalExpenses).toBe('number');

      // Verify each transaction has required fields
      preview.extractedData.transactions.forEach((txn) => {
        expect(txn.date).toBeDefined();
        expect(txn.description).toBeDefined();
        expect(txn.amount).toBeGreaterThan(0);
        expect(['INCOME', 'EXPENSE']).toContain(txn.type);
      });

      // Verify suggested transactions
      preview.suggestedTransactions.forEach((txn) => {
        expect(txn.type).toBeDefined();
        expect(txn.amount).toBeGreaterThan(0);
        expect(txn.description).toBeDefined();
        expect(txn.date).toBeDefined();
        expect(txn.categoryId).toBeDefined();
      });

      // Verify preview was saved to database
      const savedPreview = await prismaTest.uploadPreview.findUnique({
        where: { id: preview.previewId },
      });
      expect(savedPreview).toBeDefined();
      expect(savedPreview?.type).toBe('statement');
    }, 45000); // 45s timeout for PDF processing

    it('should calculate summary correctly', async () => {
      const { user } = await createAuthenticatedUser('statement-summary@example.com');

      await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
      });

      const preview = await uploadService.extractStatementData(
        TEST_STATEMENT_PATH,
        user.id
      );

      const { summary } = preview.extractedData;
      
      // Verify summary calculations
      const calculatedIncome = preview.extractedData.transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const calculatedExpenses = preview.extractedData.transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      expect(summary.totalIncome).toBeCloseTo(calculatedIncome, 2);
      expect(summary.totalExpenses).toBeCloseTo(calculatedExpenses, 2);
    }, 45000);
  });

  describe('commitReceipt', () => {
    it('should commit verified receipt to transactions', async () => {
      const { user } = await createAuthenticatedUser('commit-receipt@example.com');

      // Create category
      const category = await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Create preview first
      const preview = await uploadService.extractReceiptData(
        TEST_RECEIPT_PATH,
        'image/png',
        user.id
      );

      // Commit the receipt
      const commitInput = {
        previewId: preview.previewId,
        transaction: {
          type: TransactionType.EXPENSE,
          amount: preview.extractedData.amount,
          description: 'Petrol expense',
          date: preview.extractedData.date,
          categoryId: category.id,
        },
      };

      const transaction = await uploadService.commitReceipt(commitInput, user.id);

      // Verify transaction was created
      expect(transaction.id).toBeDefined();
      expect(transaction.type).toBe(TransactionType.EXPENSE);
      expect(Number(transaction.amount)).toBe(preview.extractedData.amount);
      expect(transaction.description).toBe('Petrol expense');
      expect(transaction.categoryId).toBe(category.id);
      expect(transaction.userId).toBe(user.id);

      // Verify preview was deleted
      const deletedPreview = await prismaTest.uploadPreview.findUnique({
        where: { id: preview.previewId },
      });
      expect(deletedPreview).toBeNull();
    }, 30000);

    it('should reject commit with invalid preview ID', async () => {
      const { user } = await createAuthenticatedUser('commit-invalid@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      const commitInput = {
        previewId: 'non-existent-id',
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Test',
          date: '2025-10-07',
          categoryId: category.id,
        },
      };

      await expect(
        uploadService.commitReceipt(commitInput, user.id)
      ).rejects.toThrow('Preview not found or expired');
    });

    it('should reject commit with expired preview', async () => {
      const { user } = await createAuthenticatedUser('commit-expired@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Create an expired preview manually
      const expiredPreview = await prismaTest.uploadPreview.create({
        data: {
          userId: user.id,
          type: 'receipt',
          data: { test: 'data' },
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const commitInput = {
        previewId: expiredPreview.id,
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Test',
          date: '2025-10-07',
          categoryId: category.id,
        },
      };

      await expect(
        uploadService.commitReceipt(commitInput, user.id)
      ).rejects.toThrow('Preview has expired');
    });

    it('should reject commit from different user', async () => {
      const { user: user1 } = await createAuthenticatedUser('commit-user1@example.com');
      const { user: user2 } = await createAuthenticatedUser('commit-user2@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Transport', type: CategoryType.EXPENSE, userId: user2.id },
      });

      // User1 creates preview
      const preview = await uploadService.extractReceiptData(
        TEST_RECEIPT_PATH,
        'image/png',
        user1.id
      );

      // User2 tries to commit
      const commitInput = {
        previewId: preview.previewId,
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Test',
          date: '2025-10-07',
          categoryId: category.id,
        },
      };

      await expect(
        uploadService.commitReceipt(commitInput, user2.id)
      ).rejects.toThrow('Unauthorized: Preview belongs to another user');
    }, 30000);

    it('should reject commit with invalid category', async () => {
      const { user } = await createAuthenticatedUser('commit-invalid-cat@example.com');

      const preview = await uploadService.extractReceiptData(
        TEST_RECEIPT_PATH,
        'image/png',
        user.id
      );

      const commitInput = {
        previewId: preview.previewId,
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Test',
          date: '2025-10-07',
          categoryId: 'non-existent-category',
        },
      };

      await expect(
        uploadService.commitReceipt(commitInput, user.id)
      ).rejects.toThrow('Invalid category ID');
    }, 30000);
  });

  describe('commitStatement', () => {
    it('should commit verified statement transactions in bulk', async () => {
      const { user } = await createAuthenticatedUser('commit-statement@example.com');

      // Create categories
      const salaryCategory = await prismaTest.category.create({
        data: { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
      });
      const expenseCategory = await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Create preview
      const preview = await uploadService.extractStatementData(
        TEST_STATEMENT_PATH,
        user.id
      );

      // Prepare transactions for commit (use first 3 transactions)
      const transactionsToCommit = preview.extractedData.transactions.slice(0, 3).map((txn) => ({
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        date: txn.date,
        categoryId: txn.type === 'INCOME' ? salaryCategory.id : expenseCategory.id,
      }));

      const commitInput = {
        previewId: preview.previewId,
        transactions: transactionsToCommit,
      };

      const result = await uploadService.commitStatement(commitInput, user.id);

      // Verify result
      expect(result.created).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(3);

      // Verify transactions were created
      const transactions = await prismaTest.transaction.findMany({
        where: { userId: user.id },
      });
      expect(transactions).toHaveLength(3);

      // Verify preview was deleted
      const deletedPreview = await prismaTest.uploadPreview.findUnique({
        where: { id: preview.previewId },
      });
      expect(deletedPreview).toBeNull();
    }, 45000);

    it('should skip duplicate transactions when option enabled', async () => {
      const { user } = await createAuthenticatedUser('commit-dedup@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Other', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Create some existing transactions
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

      // Create preview
      const preview = await uploadService.extractStatementData(
        TEST_STATEMENT_PATH,
        user.id
      );

      // Prepare transactions including potential duplicate
      const transactionsToCommit = [
        {
          type: TransactionType.EXPENSE,
          amount: 500,
          description: 'Existing transaction', // Duplicate
          date: '2025-10-01',
          categoryId: category.id,
        },
        {
          type: TransactionType.EXPENSE,
          amount: 300,
          description: 'New transaction',
          date: '2025-10-02',
          categoryId: category.id,
        },
      ];

      const commitInput = {
        previewId: preview.previewId,
        transactions: transactionsToCommit,
        options: {
          skipDuplicates: true,
        },
      };

      const result = await uploadService.commitStatement(commitInput, user.id);

      // Should skip the duplicate
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(2);
    }, 45000);

    it('should reject commit with invalid category IDs', async () => {
      const { user } = await createAuthenticatedUser('commit-statement-invalid@example.com');

      const preview = await uploadService.extractStatementData(
        TEST_STATEMENT_PATH,
        user.id
      );

      const commitInput = {
        previewId: preview.previewId,
        transactions: [
          {
            type: TransactionType.EXPENSE,
            amount: 100,
            description: 'Test',
            date: '2025-10-01',
            categoryId: 'invalid-category-id',
          },
        ],
      };

      await expect(
        uploadService.commitStatement(commitInput, user.id)
      ).rejects.toThrow('One or more invalid category IDs');
    }, 45000);
  });

  describe('getPreview', () => {
    it('should retrieve preview by ID', async () => {
      const { user } = await createAuthenticatedUser('get-preview@example.com');

      // Create preview manually to avoid flaky Gemini API call
      const manualPreview = await prismaTest.uploadPreview.create({
        data: {
          userId: user.id,
          type: 'receipt',
          data: { test: 'data' },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const retrieved = await uploadService.getPreview(manualPreview.id, user.id);

      expect(retrieved.id).toBe(manualPreview.id);
      expect(retrieved.userId).toBe(user.id);
      expect(retrieved.type).toBe('receipt');
    });

    it('should reject access to other user preview', async () => {
      const { user: user1 } = await createAuthenticatedUser('preview-user1@example.com');
      const { user: user2 } = await createAuthenticatedUser('preview-user2@example.com');

      const preview = await uploadService.extractReceiptData(
        TEST_RECEIPT_PATH,
        'image/png',
        user1.id
      );

      await expect(
        uploadService.getPreview(preview.previewId, user2.id)
      ).rejects.toThrow('Unauthorized: Preview belongs to another user');
    }, 30000);

    it('should auto-delete expired preview on access', async () => {
      const { user } = await createAuthenticatedUser('preview-expired@example.com');

      // Create expired preview
      const expiredPreview = await prismaTest.uploadPreview.create({
        data: {
          userId: user.id,
          type: 'receipt',
          data: { test: 'data' },
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await expect(
        uploadService.getPreview(expiredPreview.id, user.id)
      ).rejects.toThrow('Preview has expired');

      // Verify it was deleted
      const deleted = await prismaTest.uploadPreview.findUnique({
        where: { id: expiredPreview.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('listPreviews', () => {
    it('should list all active previews for user', async () => {
      const { user } = await createAuthenticatedUser('list-previews@example.com');

      // Create multiple previews
      await uploadService.extractReceiptData(TEST_RECEIPT_PATH, 'image/png', user.id);
      await uploadService.extractStatementData(TEST_STATEMENT_PATH, user.id);

      const previews = await uploadService.listPreviews(user.id);

      expect(previews.length).toBeGreaterThanOrEqual(2);
      previews.forEach((preview) => {
        expect(preview.userId).toBe(user.id);
        expect(preview.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });
    }, 60000);

    it('should filter previews by type', async () => {
      const { user } = await createAuthenticatedUser('list-filter@example.com');

      await uploadService.extractReceiptData(TEST_RECEIPT_PATH, 'image/png', user.id);
      await uploadService.extractStatementData(TEST_STATEMENT_PATH, user.id);

      const receiptPreviews = await uploadService.listPreviews(user.id, 'receipt');
      const statementPreviews = await uploadService.listPreviews(user.id, 'statement');

      expect(receiptPreviews.every((p) => p.type === 'receipt')).toBe(true);
      expect(statementPreviews.every((p) => p.type === 'statement')).toBe(true);
    }, 60000);

    it('should not return expired previews', async () => {
      const { user } = await createAuthenticatedUser('list-no-expired@example.com');

      // Create expired preview
      await prismaTest.uploadPreview.create({
        data: {
          userId: user.id,
          type: 'receipt',
          data: { test: 'data' },
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      // Create active preview
      await uploadService.extractReceiptData(TEST_RECEIPT_PATH, 'image/png', user.id);

      const previews = await uploadService.listPreviews(user.id);

      // Should only return the active one
      expect(previews.every((p) => p.expiresAt.getTime() > Date.now())).toBe(true);
    }, 30000);
  });

  describe('cleanupExpiredPreviews', () => {
    it('should delete all expired previews', async () => {
      const { user } = await createAuthenticatedUser('cleanup@example.com');

      // Create expired previews
      await prismaTest.uploadPreview.createMany({
        data: [
          {
            userId: user.id,
            type: 'receipt',
            data: { test: 'data1' },
            expiresAt: new Date(Date.now() - 1000),
          },
          {
            userId: user.id,
            type: 'statement',
            data: { test: 'data2' },
            expiresAt: new Date(Date.now() - 2000),
          },
        ],
      });

      // Create active preview
      await uploadService.extractReceiptData(TEST_RECEIPT_PATH, 'image/png', user.id);

      const deletedCount = await uploadService.cleanupExpiredPreviews();

      expect(deletedCount).toBeGreaterThanOrEqual(2);

      // Verify only active previews remain
      const remaining = await prismaTest.uploadPreview.findMany({
        where: { userId: user.id },
      });
      expect(remaining.every((p) => p.expiresAt.getTime() > Date.now())).toBe(true);
    }, 30000);
  });
});
