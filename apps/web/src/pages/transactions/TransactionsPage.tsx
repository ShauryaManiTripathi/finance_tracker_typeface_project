import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { transactionService, type TransactionFilters } from '../../services/transaction.service';
import { categoryService } from '../../services/category.service';
import type { Transaction, Category, TransactionType } from '../../types/api';
import toast from 'react-hot-toast';

const TransactionsPage = () => {
  // State for transactions list
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter state
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    pageSize: 20,
    startDate: '',
    endDate: '',
    type: undefined,
    categoryId: '',
    minAmount: undefined,
    maxAmount: undefined,
    search: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Form state
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

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const cleanFilters: TransactionFilters = {
        page: filters.page,
        pageSize: filters.pageSize,
      };
      
      // Convert date strings to ISO-8601 DateTime for Prisma
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0); // Start of day
        cleanFilters.startDate = startDate.toISOString();
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        cleanFilters.endDate = endDate.toISOString();
      }
      if (filters.type) cleanFilters.type = filters.type;
      if (filters.categoryId) cleanFilters.categoryId = filters.categoryId;
      if (filters.minAmount) cleanFilters.minAmount = filters.minAmount;
      if (filters.maxAmount) cleanFilters.maxAmount = filters.maxAmount;
      if (filters.search?.trim()) cleanFilters.search = filters.search.trim();

      const response = await transactionService.getTransactions(cleanFilters);
      setTransactions(response.data || []);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error(error.response?.data?.error || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories for dropdown
  const fetchCategories = async () => {
    try {
      const response = await categoryService.getCategories();
      setCategories(response.data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filters.page, filters.pageSize, filters.startDate, filters.endDate, filters.type, filters.categoryId, filters.minAmount, filters.maxAmount, filters.search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (!formData.occurredAt) {
      errors.occurredAt = 'Date is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      // Convert date string to ISO-8601 DateTime
      const occurredAtDate = new Date(formData.occurredAt);
      occurredAtDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
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
      setIsCreateModalOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error(error.response?.data?.error || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;

    setFormErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (!formData.occurredAt) {
      errors.occurredAt = 'Date is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      // Convert date string to ISO-8601 DateTime
      const occurredAtDate = new Date(formData.occurredAt);
      occurredAtDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      await transactionService.updateTransaction(selectedTransaction.id, {
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        occurredAt: occurredAtDate.toISOString(),
        description: formData.description || null,
        merchant: formData.merchant || null,
        categoryId: formData.categoryId || null,
      });
      toast.success('Transaction updated successfully!');
      setIsEditModalOpen(false);
      setSelectedTransaction(null);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast.error(error.response?.data?.error || 'Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedTransaction) return;

    try {
      setSubmitting(true);
      await transactionService.deleteTransaction(selectedTransaction.id);
      toast.success('Transaction deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast.error(error.response?.data?.error || 'Failed to delete transaction');
    } finally {
      setSubmitting(false);
    }
  };

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
  };

  // Open modals
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      occurredAt: new Date(transaction.occurredAt).toISOString().split('T')[0],
      description: transaction.description || '',
      merchant: transaction.merchant || '',
      categoryId: transaction.categoryId || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteModalOpen(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      startDate: '',
      endDate: '',
      type: undefined,
      categoryId: '',
      minAmount: undefined,
      maxAmount: undefined,
      search: '',
    });
    setSearchInput('');
  };

  // Get active filter count
  const activeFilterCount = [
    filters.startDate,
    filters.endDate,
    filters.type,
    filters.categoryId,
    filters.minAmount,
    filters.maxAmount,
    filters.search,
  ].filter(Boolean).length;

  // Format currency
  const formatCurrency = (amount: number | string, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'INR',
    }).format(num);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get filtered categories based on transaction type
  const getFilteredCategories = () => {
    return categories.filter((cat) => cat.type === formData.type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">Track your income and expenses</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by description or merchant..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value as TransactionType | undefined, page: 1 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.categoryId || ''}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                <input
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, minAmount: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                <input
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 })
                  }
                  placeholder="999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && transactions.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CreditCardIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600 mb-6">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first transaction'}
              </p>
              {activeFilterCount === 0 && (
                <Button onClick={openCreateModal}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Transaction
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      {!loading && transactions.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          {formatDate(transaction.occurredAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'INCOME'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.type === 'INCOME' ? (
                            <ArrowUpIcon className="w-3 h-3" />
                          ) : (
                            <ArrowDownIcon className="w-3 h-3" />
                          )}
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{transaction.merchant || 'N/A'}</p>
                          {transaction.description && (
                            <p className="text-gray-500 truncate max-w-md">{transaction.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.category ? (
                          <span className="inline-flex px-2 py-1 bg-gray-100 rounded text-xs">
                            {transaction.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                        <span
                          className={
                            transaction.type === 'INCOME' ? 'text-green-600' : 'text-gray-900'
                          }
                        >
                          {transaction.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(transaction)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(transaction)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && transactions.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {filters.page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
              disabled={filters.page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setFilters({ ...filters, page: pageNum })}
                    className={`px-3 py-1 rounded-lg font-medium ${
                      filters.page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
              disabled={filters.page === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
          <select
            value={filters.pageSize}
            onChange={(e) => setFilters({ ...filters, pageSize: parseInt(e.target.value), page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {isCreateModalOpen ? 'Create Transaction' : 'Edit Transaction'}
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={isCreateModalOpen ? handleCreate : handleEdit} className="p-6 space-y-4">
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
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting
                    ? isCreateModalOpen
                      ? 'Creating...'
                      : 'Updating...'
                    : isCreateModalOpen
                    ? 'Create Transaction'
                    : 'Update Transaction'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Delete Transaction</h2>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this transaction?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Amount:</strong> {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Date:</strong> {formatDate(selectedTransaction.occurredAt)}
                </p>
                {selectedTransaction.merchant && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Merchant:</strong> {selectedTransaction.merchant}
                  </p>
                )}
                {selectedTransaction.description && (
                  <p className="text-sm text-gray-600">
                    <strong>Description:</strong> {selectedTransaction.description}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-6">This action cannot be undone.</p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleDelete}
                  disabled={submitting}
                  variant="destructive"
                  className="flex-1"
                >
                  {submitting ? 'Deleting...' : 'Delete Transaction'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
