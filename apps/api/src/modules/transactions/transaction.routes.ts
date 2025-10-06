import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { transactionController } from "./transaction.controller";
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  ListTransactionsQuerySchema,
  TransactionIdParamSchema,
} from "./transaction.validators";

/**
 * Transaction routes
 * All routes require authentication
 */

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

/**
 * POST /transactions
 * Create a new transaction
 */
router.post(
  "/",
  validate(
    z.object({
      body: CreateTransactionSchema,
    })
  ),
  transactionController.create.bind(transactionController)
);

/**
 * GET /transactions
 * List transactions with filters and pagination
 */
router.get(
  "/",
  validate(
    z.object({
      query: ListTransactionsQuerySchema,
    })
  ),
  (req, res) => transactionController.list(req as any, res)
);

/**
 * GET /transactions/:id
 * Get transaction by ID
 */
router.get(
  "/:id",
  validate(
    z.object({
      params: TransactionIdParamSchema,
    })
  ),
  transactionController.getById.bind(transactionController)
);

/**
 * PUT /transactions/:id
 * Update transaction
 */
router.put(
  "/:id",
  validate(
    z.object({
      params: TransactionIdParamSchema,
      body: UpdateTransactionSchema,
    })
  ),
  transactionController.update.bind(transactionController)
);

/**
 * DELETE /transactions/:id
 * Delete transaction
 */
router.delete(
  "/:id",
  validate(
    z.object({
      params: TransactionIdParamSchema,
    })
  ),
  transactionController.delete.bind(transactionController)
);

export default router;

