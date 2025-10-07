import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  CreditCardIcon,
  XMarkIcon
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
import { categoryService } from '../../services/category.service';
import { type Transaction, type Category, type TransactionType } from '../../types/api';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const [dateRange, setDateRange] = useState('30');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryExpense[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  
  // Add Transaction Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [formData, setFormData] = useState({
    type: 'EXPENSE' as TransactionType,
    amount: '',
    currency: 'INR',
    occurredAt: new Date().toISOString().split('T')[0],
    description: '',
    merchant: '',
    categoryId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Calculate date range
  const getDateRange = (days: string) => {
    if (isCustomRange && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate
      };
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Calculate days difference for interval selection
  const getDaysDifference = () => {
    if (isCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    return parseInt(dateRange);
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getCategories();
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      type: 'EXPENSE',
      amount: '',
      currency: 'INR',
      occurredAt: new Date().toISOString().split('T')[0],
      description: '',
      merchant: '',
      categoryId: '',
    });
    setFormErrors({});
    setCategorySearch('');
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (!formData.occurredAt) {
      errors.occurredAt = 'Date is required';
    }

    return errors;
  };

  // Handle create transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const occurredAtDate = new Date(formData.occurredAt);
      occurredAtDate.setHours(12, 0, 0, 0);

      await transactionService.createTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        occurredAt: occurredAtDate.toISOString(),
        description: formData.description || undefined,
        merchant: formData.merchant || undefined,
        categoryId: formData.categoryId || undefined,
      });
      
      toast.success('Transaction created successfully!');
      setIsAddModalOpen(false);
      resetForm();
      
      // Refresh dashboard data
      const dateParams = getDateRange(dateRange);
      const days = getDaysDifference();
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
      setTransactionCount(transactions.pagination.total);
      setRecentTransactions(transactions.data);
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error(error.response?.data?.message || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Get filtered categories for the modal
  const getFilteredCategories = () => {
    const filtered = categories.filter(
      (cat) =>
        cat.type === formData.type &&
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
    return filtered;
  };

  // Fetch stats data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const dateParams = getDateRange(dateRange);
        
        // Determine interval based on date range
        const days = getDaysDifference();
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
  }, [dateRange, isCustomRange, customStartDate, customEndDate]);

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomRange(true);
      // Set default custom range to last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(end.toISOString().split('T')[0]);
    } else {
      setIsCustomRange(false);
      setDateRange(value);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Process categories for pie chart - group small ones
  const processCategoriesForPieChart = () => {
    if (categoryData.length === 0) return { chartData: [], legendData: [], miscCategories: [] };
    
    // Calculate total
    const total = categoryData.reduce((sum, cat) => sum + parseFloat(cat.amount), 0);
    
    // Calculate percentages and categorize
    const categoriesWithPercent = categoryData.map(cat => ({
      ...cat,
      percentage: (parseFloat(cat.amount) / total) * 100
    }));
    
    // Define threshold (2% or less = miscellaneous)
    const MISC_THRESHOLD = 2;
    const mainCategories = categoriesWithPercent.filter(cat => cat.percentage > MISC_THRESHOLD);
    const miscCategories = categoriesWithPercent.filter(cat => cat.percentage <= MISC_THRESHOLD);
    
    // Prepare chart data (for pie slices)
    const chartData = mainCategories.map(cat => ({
      name: cat.categoryName || 'Uncategorized',
      value: parseFloat(cat.amount),
      percentage: cat.percentage,
      isMisc: false
    }));
    
    // Add single misc entry if there are small categories
    if (miscCategories.length > 0) {
      const miscTotal = miscCategories.reduce((sum, cat) => sum + parseFloat(cat.amount), 0);
      chartData.push({
        name: 'Miscellaneous',
        value: miscTotal,
        percentage: (miscTotal / total) * 100,
        isMisc: true
      });
    }
    
    // Prepare legend data (show ALL categories)
    const legendData = [
      ...mainCategories.map((cat, index) => ({
        name: cat.categoryName || 'Uncategorized',
        amount: parseFloat(cat.amount),
        percentage: cat.percentage,
        colorIndex: index,
        isMisc: false
      })),
      ...miscCategories.map((cat) => ({
        name: cat.categoryName || 'Uncategorized',
        amount: parseFloat(cat.amount),
        percentage: cat.percentage,
        colorIndex: mainCategories.length, // All use same misc color
        isMisc: true
      }))
    ];
    
    return { 
      chartData, 
      legendData,
      miscCategories: miscCategories.map(c => c.categoryName || 'Uncategorized')
    };
  };

  const { chartData, legendData, miscCategories } = processCategoriesForPieChart();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe selector */}
          <select
            value={isCustomRange ? 'custom' : dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {/* Custom Date Range Inputs - Same row */}
          {isCustomRange && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || new Date().toISOString().split('T')[0]}
                  className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </>
          )}
          
          {/* Add Transaction button */}
          <Button 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex items-center gap-2 whitespace-nowrap ml-auto"
          >
            <PlusIcon className="w-4 h-4" />
            Add Transaction
          </Button>
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
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }: any) => `${name} ${percentage.toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => {
                        const colors = ['#f97316', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#10b981', '#6b7280', '#f59e0b', '#14b8a6', '#8b5cf6'];
                        // Use gray for miscellaneous
                        const color = entry.isMisc ? '#9ca3af' : colors[index % colors.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Show misc info if applicable */}
                {miscCategories.length > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Miscellaneous</span> includes {miscCategories.length} categories with &lt;2% each: {miscCategories.join(', ')}
                    </p>
                  </div>
                )}
                
                {/* Category Legend - Show ALL categories */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t max-h-40 overflow-y-auto">
                  {legendData.map((item, index) => {
                    const colors = ['#f97316', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#10b981', '#6b7280', '#f59e0b', '#14b8a6', '#8b5cf6'];
                    // Misc categories get gray color
                    const color = item.isMisc ? '#9ca3af' : colors[item.colorIndex % colors.length];
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                        <span className={`text-xs truncate ${item.isMisc ? 'text-gray-500 italic' : 'text-gray-600'}`}>
                          {item.name}
                          {item.isMisc && <span className="ml-1 text-[10px]">(misc)</span>}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 ml-auto">
                          {formatCurrency(item.amount)}
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
                      tickFormatter={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
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

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Add Transaction</h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'INCOME', categoryId: '' });
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                      formData.type === 'INCOME'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <ArrowUpIcon className="w-5 h-5" />
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'EXPENSE', categoryId: '' });
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                      formData.type === 'EXPENSE'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <ArrowDownIcon className="w-5 h-5" />
                    Expense
                  </button>
                </div>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {formErrors.amount && <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="INR"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Date and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.occurredAt}
                    onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.occurredAt ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.occurredAt && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.occurredAt}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <div className="space-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {categorySearch && (
                        <button
                          type="button"
                          onClick={() => setCategorySearch('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Category List */}
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      size={5}
                    >
                      <option value="">None</option>
                      {getFilteredCategories().map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Merchant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant/Payee</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Starbucks, Grocery Store"
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                  maxLength={500}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Transaction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
