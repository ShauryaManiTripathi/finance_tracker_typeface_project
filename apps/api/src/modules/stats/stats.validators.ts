import { z } from 'zod';

/**
 * Base date range schema (without refinement)
 */
const baseDateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * Date range validation refinement
 */
const dateRangeRefinement = (data: { startDate?: Date; endDate?: Date }) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
};

/**
 * Shared date range query schema for summary and expenses-by-category endpoints
 */
export const DateRangeQuerySchema = baseDateRangeSchema.refine(
  dateRangeRefinement,
  {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  }
);

/**
 * Query schema for expenses-over-time endpoint with interval support
 */
export const ExpensesOverTimeQuerySchema = baseDateRangeSchema.extend({
  interval: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
}).refine(
  dateRangeRefinement,
  {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  }
);

export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;
export type ExpensesOverTimeQuery = z.infer<typeof ExpensesOverTimeQuerySchema>;
