import { TransactionType } from "@prisma/client";
import { TransactionService } from "./transaction.service";
import { transactionRepository } from "./transaction.repo";
import { prisma } from "../../db/prisma";

// Mock dependencies
jest.mock("./transaction.repo");
jest.mock("../../db/prisma", () => ({
  prisma: {
    category: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe("TransactionService", () => {
  let service: TransactionService;
  const mockUserId = "user123";

  beforeEach(() => {
    service = new TransactionService();
    jest.clearAllMocks();
  });

  describe("createTransaction", () => {
    const validTransactionData = {
      type: TransactionType.EXPENSE,
      amount: 100,
      currency: "INR",
      occurredAt: new Date("2025-01-01"),
      description: "Test expense",
      merchant: "Test Store",
    };

    it("should create a transaction without category", async () => {
      const mockTransaction = {
        id: "txn123",
        ...validTransactionData,
        userId: mockUserId,
        categoryId: null,
        receiptUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      };

      (transactionRepository.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const result = await service.createTransaction(
        mockUserId,
        validTransactionData
      );

      expect(result).toEqual(mockTransaction);
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: validTransactionData.type,
          amount: validTransactionData.amount,
          currency: validTransactionData.currency,
          occurredAt: validTransactionData.occurredAt,
          description: validTransactionData.description,
          merchant: validTransactionData.merchant,
          user: { connect: { id: mockUserId } },
        })
      );
    });

    it("should create a transaction with valid category", async () => {
      const categoryId = "cat123";
      const mockCategory = {
        id: categoryId,
        name: "Food",
        type: TransactionType.EXPENSE,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction = {
        id: "txn123",
        ...validTransactionData,
        categoryId,
        userId: mockUserId,
        receiptUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
      };

      (prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);
      (transactionRepository.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const result = await service.createTransaction(mockUserId, {
        ...validTransactionData,
        categoryId,
      });

      expect(result).toEqual(mockTransaction);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: categoryId, userId: mockUserId },
      });
    });

    it("should throw error if category not found", async () => {
      const categoryId = "nonexistent";
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createTransaction(mockUserId, {
          ...validTransactionData,
          categoryId,
        })
      ).rejects.toThrow("Category not found or does not belong to user");
    });

    it("should throw error if category type mismatch", async () => {
      const categoryId = "cat123";
      const mockCategory = {
        id: categoryId,
        name: "Salary",
        type: TransactionType.INCOME,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);

      await expect(
        service.createTransaction(mockUserId, {
          ...validTransactionData,
          type: TransactionType.EXPENSE,
          categoryId,
        })
      ).rejects.toThrow("Category type (INCOME) does not match transaction type (EXPENSE)");
    });
  });

  describe("getTransactionById", () => {
    it("should return transaction if found", async () => {
      const mockTransaction = {
        id: "txn123",
        type: TransactionType.EXPENSE,
        amount: 100,
        currency: "INR",
        occurredAt: new Date(),
        userId: mockUserId,
        categoryId: null,
        description: null,
        merchant: null,
        receiptUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      };

      (transactionRepository.findById as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const result = await service.getTransactionById("txn123", mockUserId);

      expect(result).toEqual(mockTransaction);
      expect(transactionRepository.findById).toHaveBeenCalledWith(
        "txn123",
        mockUserId
      );
    });

    it("should return null if transaction not found", async () => {
      (transactionRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await service.getTransactionById("txn123", mockUserId);

      expect(result).toBeNull();
    });
  });

  describe("listTransactions", () => {
    it("should list transactions with pagination", async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };

      (transactionRepository.findMany as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await service.listTransactions(
        mockUserId,
        {},
        { page: 1, pageSize: 20 }
      );

      expect(result).toEqual(mockResult);
      expect(transactionRepository.findMany).toHaveBeenCalledWith(
        { userId: mockUserId },
        { page: 1, pageSize: 20 }
      );
    });

    it("should throw error if startDate is after endDate", async () => {
      await expect(
        service.listTransactions(
          mockUserId,
          {
            startDate: new Date("2025-01-31"),
            endDate: new Date("2025-01-01"),
          },
          { page: 1, pageSize: 20 }
        )
      ).rejects.toThrow("Start date must be before or equal to end date");
    });

    it("should throw error if minAmount is greater than maxAmount", async () => {
      await expect(
        service.listTransactions(
          mockUserId,
          {
            minAmount: 100,
            maxAmount: 50,
          },
          { page: 1, pageSize: 20 }
        )
      ).rejects.toThrow("Min amount must be less than or equal to max amount");
    });
  });

  describe("updateTransaction", () => {
    const mockExistingTransaction = {
      id: "txn123",
      type: TransactionType.EXPENSE,
      amount: 100,
      currency: "INR",
      occurredAt: new Date(),
      userId: mockUserId,
      categoryId: null,
      description: "Old description",
      merchant: null,
      receiptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
    };

    it("should update transaction successfully", async () => {
      const updateData = {
        description: "Updated description",
        amount: 150,
      };

      const mockUpdatedTransaction = {
        ...mockExistingTransaction,
        ...updateData,
      };

      (transactionRepository.findById as jest.Mock).mockResolvedValue(
        mockExistingTransaction
      );
      (transactionRepository.update as jest.Mock).mockResolvedValue(
        mockUpdatedTransaction
      );

      const result = await service.updateTransaction(
        "txn123",
        mockUserId,
        updateData
      );

      expect(result).toEqual(mockUpdatedTransaction);
      expect(transactionRepository.update).toHaveBeenCalledWith(
        "txn123",
        mockUserId,
        expect.objectContaining(updateData)
      );
    });

    it("should throw error if transaction not found", async () => {
      (transactionRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateTransaction("txn123", mockUserId, {
          description: "Updated",
        })
      ).rejects.toThrow("Transaction not found");
    });

    it("should validate category on update", async () => {
      const categoryId = "cat123";
      const mockCategory = {
        id: categoryId,
        name: "Food",
        type: TransactionType.EXPENSE,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (transactionRepository.findById as jest.Mock).mockResolvedValue(
        mockExistingTransaction
      );
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);
      (transactionRepository.update as jest.Mock).mockResolvedValue({
        ...mockExistingTransaction,
        categoryId,
      });

      await service.updateTransaction("txn123", mockUserId, {
        categoryId,
      });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: categoryId, userId: mockUserId },
      });
    });

    it("should throw error if category type mismatch on update", async () => {
      const categoryId = "cat123";
      const mockCategory = {
        id: categoryId,
        name: "Salary",
        type: TransactionType.INCOME,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (transactionRepository.findById as jest.Mock).mockResolvedValue(
        mockExistingTransaction
      );
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);

      await expect(
        service.updateTransaction("txn123", mockUserId, {
          categoryId,
        })
      ).rejects.toThrow("Category type (INCOME) does not match transaction type (EXPENSE)");
    });

    it("should allow removing category by setting to null", async () => {
      (transactionRepository.findById as jest.Mock).mockResolvedValue(
        mockExistingTransaction
      );
      (transactionRepository.update as jest.Mock).mockResolvedValue({
        ...mockExistingTransaction,
        categoryId: null,
      });

      await service.updateTransaction("txn123", mockUserId, {
        categoryId: null,
      });

      expect(transactionRepository.update).toHaveBeenCalledWith(
        "txn123",
        mockUserId,
        expect.objectContaining({
          category: { disconnect: true },
        })
      );
    });
  });

  describe("deleteTransaction", () => {
    it("should delete transaction successfully", async () => {
      (transactionRepository.delete as jest.Mock).mockResolvedValue(true);

      await service.deleteTransaction("txn123", mockUserId);

      expect(transactionRepository.delete).toHaveBeenCalledWith(
        "txn123",
        mockUserId
      );
    });

    it("should throw error if transaction not found", async () => {
      (transactionRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(
        service.deleteTransaction("txn123", mockUserId)
      ).rejects.toThrow("Transaction not found");
    });
  });

  describe("countTransactions", () => {
    it("should return transaction count", async () => {
      (transactionRepository.count as jest.Mock).mockResolvedValue(42);

      const result = await service.countTransactions(mockUserId, {});

      expect(result).toBe(42);
      expect(transactionRepository.count).toHaveBeenCalledWith({
        userId: mockUserId,
      });
    });
  });
});
