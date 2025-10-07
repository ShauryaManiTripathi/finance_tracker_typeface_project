import { Request, Response } from "express";
import { transactionService } from "./transaction.service";
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from "./transaction.validators";
import { logger } from "../../utils/logger";

/**
 * Transaction Controller
 * HTTP handlers for transaction endpoints
 */

export class TransactionController {
  /**
   * POST /transactions
   * Create a new transaction
   */
  async create(
    req: Request<{}, {}, CreateTransactionInput>,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const transaction = await transactionService.createTransaction(
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error: any) {
      logger.error("Failed to create transaction:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to create transaction",
      });
    }
  }

  /**
   * GET /transactions
   * List transactions with filters and pagination
   */
  async list(
    req: Request<{}, {}, {}, ListTransactionsQuery>,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        page,
        pageSize,
        startDate,
        endDate,
        type,
        categoryId,
        minAmount,
        maxAmount,
        search,
      } = req.query;

      // Convert string dates to Date objects
      // For endDate, set to end of day (23:59:59.999) to include all transactions on that date
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) : undefined;

      const result = await transactionService.listTransactions(
        userId,
        {
          startDate: start,
          endDate: end,
          type,
          categoryId,
          minAmount,
          maxAmount,
          search,
        },
        {
          page: Number(page) || 1,
          pageSize: Number(pageSize) || 20,
        }
      );

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      logger.error("Failed to list transactions:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to list transactions",
      });
    }
  }

  /**
   * GET /transactions/:id
   * Get transaction by ID
   */
  async getById(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const transaction = await transactionService.getTransactionById(
        id,
        userId
      );

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: "Transaction not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error: any) {
      logger.error("Failed to get transaction:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get transaction",
      });
    }
  }

  /**
   * PUT /transactions/:id
   * Update transaction
   */
  async update(
    req: Request<{ id: string }, {}, UpdateTransactionInput>,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const transaction = await transactionService.updateTransaction(
        id,
        userId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error: any) {
      logger.error("Failed to update transaction:", error);
      const status = error.message.includes("not found") ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message || "Failed to update transaction",
      });
    }
  }

  /**
   * DELETE /transactions/:id
   * Delete transaction
   */
  async delete(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await transactionService.deleteTransaction(id, userId);

      res.status(200).json({
        success: true,
        message: "Transaction deleted successfully",
      });
    } catch (error: any) {
      logger.error("Failed to delete transaction:", error);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message || "Failed to delete transaction",
      });
    }
  }
}

// Export singleton instance
export const transactionController = new TransactionController();
