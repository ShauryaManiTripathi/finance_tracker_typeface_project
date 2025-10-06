import { Router } from 'express';
import { statsController } from './stats.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { DateRangeQuerySchema, ExpensesOverTimeQuerySchema } from './stats.validators';
import { z } from 'zod';

const router = Router();

// Apply authentication to all stats routes
router.use(authenticate);

/**
 * GET /stats/summary
 * Get summary statistics (total income, expenses, net)
 */
router.get(
  '/summary',
  validate(z.object({ query: DateRangeQuerySchema })),
  statsController.getSummary.bind(statsController)
);

/**
 * GET /stats/expenses-by-category
 * Get expenses grouped by category
 */
router.get(
  '/expenses-by-category',
  validate(z.object({ query: DateRangeQuerySchema })),
  statsController.getExpensesByCategory.bind(statsController)
);

/**
 * GET /stats/expenses-over-time
 * Get income and expenses over time with specified interval
 */
router.get(
  '/expenses-over-time',
  validate(z.object({ query: ExpensesOverTimeQuerySchema })),
  statsController.getExpensesOverTime.bind(statsController)
);

export default router;
