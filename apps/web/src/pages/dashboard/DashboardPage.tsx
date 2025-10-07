import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { 
  PieChart, 
  Pie, 
  Cell,
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import statsService, { type SummaryStats, type CategoryExpense, type TimeSeriesData } from '../../services/stats.service';
import { transactionService } from '../../services/transaction.service';
import { type Transaction } from '../../types/api';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryExpense[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // Calculate date range
  const getDateRange = (days: string) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Fetch stats data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const dateParams = getDateRange(dateRange);
        
        // Determine interval based on date range
        const days = parseInt(dateRange);
        const interval = days <= 30 ? 'daily' : days <= 90 ? 'weekly' : 'monthly';
        
        const [stats, categories, timeSeries, transactions] = await Promise.all([
          statsService.getSummary(dateParams),
          statsService.getExpensesByCategory(dateParams),
          statsService.getExpensesOverTime(interval, dateParams),
          transactionService.getTransactions({ ...dateParams, pageSize: 5, page: 1 })
        ]);
        
        setSummaryStats(stats);
        setCategoryData(categories);
        setTimeSeriesData(timeSeries);
        // API returns { success, data: [...], pagination: { total, ... } }
        setTransactionCount(transactions.pagination.total);
        setRecentTransactions(transactions.data);
      } catch (error: any) {
        console.error('Error fetching stats:', error);
        toast.error(error.response?.data?.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Link to="/transactions/add">
            <Button className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summaryStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(summaryStats.income)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowUpIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(summaryStats.expenses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <ArrowDownIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Balance */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Balance</p>
                  <p className={`text-2xl font-bold mt-2 ${summaryStats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summaryStats.net)}
                  </p>
                  {summaryStats.income > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {((summaryStats.net / summaryStats.income) * 100).toFixed(1)}% savings rate
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Count */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {transactionCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">In selected period</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>Unable to load statistics. Please try again.</p>
        </div>
      )}

      {/* Charts Row */}
      {!loading && (categoryData.length > 0 || timeSeriesData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category - Pie Chart */}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Spending by Category</span>
                  <Link to="/categories" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData.map(cat => ({
                        name: cat.categoryName || 'Uncategorized',
                        value: parseFloat(cat.amount)
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => {
                        const colors = ['#f97316', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#10b981', '#6b7280', '#f59e0b', '#14b8a6', '#8b5cf6'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                {/* Category Legend - Show ALL categories */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t max-h-32 overflow-y-auto">
                  {categoryData.map((category, index) => {
                    const colors = ['#f97316', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#10b981', '#6b7280', '#f59e0b', '#14b8a6', '#8b5cf6'];
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></div>
                        <span className="text-xs text-gray-600 truncate">{category.categoryName || 'Uncategorized'}</span>
                        <span className="text-xs font-semibold text-gray-900 ml-auto">
                          {formatCurrency(parseFloat(category.amount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Income vs Expenses Over Time - Area Chart */}
          {timeSeriesData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expenses Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="dateKey" 
                      stroke="#6b7280" 
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => {
                        // Format based on interval
                        if (value.includes('W')) {
                          return value; // Weekly format
                        } else if (value.length === 7) {
                          return value; // Monthly format YYYY-MM
                        } else {
                          // Daily format - show just day/month
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }
                      }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      style={{ fontSize: '12px' }} 
                      tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorIncome)" 
                      name="Income"
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorExpenses)" 
                      name="Expenses"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      {!loading && recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Transactions</span>
              <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-2 h-2 rounded-full ${
                      transaction.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.merchant || transaction.description || 'Transaction'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {transaction.category && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                            {transaction.category.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(transaction.occurredAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ml-4 ${
                    transaction.type === 'INCOME' ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {transaction.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(parseFloat(transaction.amount))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-gray-500 py-20">
        <p>More dashboard components will be added here...</p>
      </div>
    </div>
  );
};

export default DashboardPage;
