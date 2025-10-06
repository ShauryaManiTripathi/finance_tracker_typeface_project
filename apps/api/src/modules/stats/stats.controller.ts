import { Request, Response } from 'express';
import { statsService } from './stats.service';
import { logger } from '../../utils/logger';

export class StatsController {
  /**
   * GET /stats/summary
   * Get summary statistics (income, expenses, net) for the authenticated user
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      // Convert string dates to Date objects
      // For endDate, set to end of day (23:59:59.999) to include all transactions on that date
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(new Date(endDate as string).setUTCHours(23, 59, 59, 999)) : undefined;

      const summary = await statsService.getSummary(userId, start, end);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error in getSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch summary statistics',
      });
    }
  }

  /**
   * GET /stats/expenses-by-category
   * Get expenses grouped by category
   */
  async getExpensesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      // Convert string dates to Date objects
      // For endDate, set to end of day (23:59:59.999) to include all transactions on that date
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(new Date(endDate as string).setUTCHours(23, 59, 59, 999)) : undefined;

      const expenses = await statsService.getExpensesByCategory(userId, start, end);

      res.status(200).json({
        success: true,
        data: expenses,
      });
    } catch (error) {
      logger.error('Error in getExpensesByCategory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch expenses by category',
      });
    }
  }

  /**
   * GET /stats/expenses-over-time
   * Get income and expenses over time with specified interval
   */
  async getExpensesOverTime(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate, interval = 'daily' } = req.query;

      // Convert string dates to Date objects
      // For endDate, set to end of day (23:59:59.999) to include all transactions on that date
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(new Date(endDate as string).setUTCHours(23, 59, 59, 999)) : undefined;

      const timeSeries = await statsService.getExpensesOverTime(
        userId,
        interval as 'daily' | 'weekly' | 'monthly',
        start,
        end
      );

      res.status(200).json({
        success: true,
        data: timeSeries,
      });
    } catch (error) {
      logger.error('Error in getExpensesOverTime:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch expenses over time',
      });
    }
  }
}

export const statsController = new StatsController();
