import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const DashboardPage = () => {
  const [dateRange, setDateRange] = useState('30'); // days
  
  // Mock data - replace with API calls later
  const stats = {
    totalIncome: 45000,
    totalExpenses: 32450,
    netBalance: 12550,
    transactionCount: 156,
    incomeChange: 12.5,
    expensesChange: -8.3,
    savingsRate: 27.9
  };

  const recentTransactions = [
    { 
      id: 1, 
      date: '2025-10-06', 
      merchant: 'Grocery Store',
      type: 'EXPENSE',
      amount: 125.50,
      category: 'Food & Dining',
      categoryColor: 'bg-orange-500'
    },
    { 
      id: 2, 
      date: '2025-10-05', 
      merchant: 'Monthly Salary',
      type: 'INCOME',
      amount: 5000.00,
      category: 'Salary',
      categoryColor: 'bg-green-500'
    },
    { 
      id: 3, 
      date: '2025-10-04', 
      merchant: 'Electric Company',
      type: 'EXPENSE',
      amount: 85.00,
      category: 'Utilities',
      categoryColor: 'bg-yellow-500'
    },
    { 
      id: 4, 
      date: '2025-10-03', 
      merchant: 'Coffee Shop',
      type: 'EXPENSE',
      amount: 4.50,
      category: 'Food & Dining',
      categoryColor: 'bg-orange-500'
    },
    { 
      id: 5, 
      date: '2025-10-02', 
      merchant: 'Freelance Work',
      type: 'INCOME',
      amount: 800.00,
      category: 'Freelance',
      categoryColor: 'bg-blue-500'
    },
  ];

  const topCategories = [
    { name: 'Food & Dining', amount: 8450, percentage: 26, color: '#f97316' },
    { name: 'Transportation', amount: 5200, percentage: 16, color: '#3b82f6' },
    { name: 'Shopping', amount: 4100, percentage: 13, color: '#a855f7' },
    { name: 'Utilities', amount: 3800, percentage: 12, color: '#eab308' },
    { name: 'Entertainment', amount: 2900, percentage: 9, color: '#ec4899' },
    { name: 'Other', amount: 7100, percentage: 24, color: '#6b7280' },
  ];

  const monthlyTrend = [
    { month: 'Jan', income: 4500, expenses: 3200, net: 1300 },
    { month: 'Feb', income: 4800, expenses: 3400, net: 1400 },
    { month: 'Mar', income: 5200, expenses: 3800, net: 1400 },
    { month: 'Apr', income: 4900, expenses: 3500, net: 1400 },
    { month: 'May', income: 5500, expenses: 4000, net: 1500 },
    { month: 'Jun', income: 5000, expenses: 3600, net: 1400 },
  ];

  const dailyActivity = [
    { day: 'Mon', transactions: 12, amount: 450 },
    { day: 'Tue', transactions: 8, amount: 320 },
    { day: 'Wed', transactions: 15, amount: 580 },
    { day: 'Thu', transactions: 10, amount: 390 },
    { day: 'Fri', transactions: 18, amount: 720 },
    { day: 'Sat', transactions: 22, amount: 850 },
    { day: 'Sun', transactions: 14, amount: 520 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.totalIncome)}
                </p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                  <span>+{stats.incomeChange}% from last period</span>
                </div>
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
                  {formatCurrency(stats.totalExpenses)}
                </p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                  <span>{stats.expensesChange}% from last period</span>
                </div>
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
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.netBalance)}
                </p>
                <div className="flex items-center mt-2 text-sm text-blue-600">
                  <span>{stats.savingsRate}% savings rate</span>
                </div>
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
                  {stats.transactionCount}
                </p>
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <span>In selected period</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCardIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category - Pie Chart */}
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
                  data={topCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
              

found 0 vulnerabilities    {topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Category Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
              {topCategories.map((category, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                  <span className="text-xs text-gray-600 truncate">{category.name}</span>
                  <span className="text-xs font-semibold text-gray-900 ml-auto">{formatCurrency(category.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Income vs Expenses Trend - Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend}>
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
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={(value) => `$${value}`} />
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
      </div>

      {/* Weekly Activity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Transaction Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Transaction Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value, name) => {
                    if (name === 'amount') return formatCurrency(value as number);
                    return value;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="transactions" fill="#3b82f6" name="Transactions" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Additional Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Avg Daily Spending</p>
                    <p className="text-lg font-bold text-gray-900">$487</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BanknotesIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Largest Transaction</p>
                    <p className="text-lg font-bold text-gray-900">$5,000</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Most Active Day</p>
                    <p className="text-lg font-bold text-gray-900">Saturday</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CreditCardIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Top Category</p>
                    <p className="text-lg font-bold text-gray-900">Food</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link to="/transactions/add" className="block">
                <button className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                  <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center">
                    <PlusIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Add Transaction</p>
                    <p className="text-xs text-gray-500">Manually record income or expense</p>
                  </div>
                </button>
              </Link>

              <Link to="/uploads" className="block">
                <button className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
                  <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center">
                    <CreditCardIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Upload Receipt</p>
                    <p className="text-xs text-gray-500">AI-powered receipt scanning</p>
                  </div>
                </button>
              </Link>

              <Link to="/categories" className="block">
                <button className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
                  <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Manage Categories</p>
                    <p className="text-xs text-gray-500">Organize your spending</p>
                  </div>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
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
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${transaction.categoryColor}`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{transaction.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${transaction.categoryColor} bg-opacity-20`}>
                          {transaction.category}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(transaction.date)}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      transaction.type === 'INCOME' ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {transaction.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
