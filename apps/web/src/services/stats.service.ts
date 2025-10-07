import api from '../lib/api';

export interface SummaryStats {
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryExpense {
  categoryId: string | null;
  categoryName: string | null;
  amount: string; // Decimal returned as string
}

export interface TimeSeriesData {
  dateKey: string;
  income: number;
  expenses: number;
  net: number;
}

export interface DateRangeParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

class StatsService {
  /**
   * Get summary statistics (total income, expenses, and net)
   */
  async getSummary(params?: DateRangeParams): Promise<SummaryStats> {
    const response = await api.get<{ success: boolean; data: SummaryStats }>('/stats/summary', { params });
    return response.data.data;
  }

  /**
   * Get expenses grouped by category
   */
  async getExpensesByCategory(params?: DateRangeParams): Promise<CategoryExpense[]> {
    const response = await api.get<{ success: boolean; data: CategoryExpense[] }>('/stats/expenses-by-category', { params });
    return response.data.data;
  }

  /**
   * Get income and expenses over time with specified interval
   */
  async getExpensesOverTime(
    interval: 'daily' | 'weekly' | 'monthly',
    params?: DateRangeParams
  ): Promise<TimeSeriesData[]> {
    const response = await api.get<{ success: boolean; data: TimeSeriesData[] }>('/stats/expenses-over-time', {
      params: { ...params, interval }
    });
    return response.data.data;
  }
}

export const statsService = new StatsService();
export default statsService;
