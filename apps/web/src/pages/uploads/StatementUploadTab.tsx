import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  PencilIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { uploadService, type StatementPreview } from '../../services/upload.service';
import { categoryService } from '../../services/category.service';
import type { Category, TransactionType } from '../../types/api';
import toast from 'react-hot-toast';

interface EditableTransaction {
  index: number;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryName?: string;
  merchant?: string;
  editing?: boolean;
}

const StatementUploadTab = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<StatementPreview | null>(null);
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [committing, setCommitting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<TransactionType>('EXPENSE');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize transactions from extracted data
  useEffect(() => {
    if (extractedData) {
      const mapped = extractedData.suggestedTransactions.map((txn, index) => ({
        index,
        type: txn.type,
        amount: txn.amount,
        description: txn.description || '',
        date: txn.date,
        merchant: txn.merchant || undefined,
        categoryName: txn.categoryName || undefined,
        editing: false,
      }));
      setTransactions(mapped);
    }
  }, [extractedData]);

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    // Validate file size (20 MB)
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20 MB');
      return;
    }

    setFile(selectedFile);
  };

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Upload and extract
  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const response = await uploadService.uploadStatement(file);
      
      if (response.success && response.data) {
        setExtractedData(response.data);
        toast.success(`Statement processed! Found ${response.data.suggestedTransactions.length} transactions.`);
      }
    } catch (error: any) {
      console.error('Error uploading statement:', error);
      toast.error(error.message || 'Failed to process statement');
    } finally {
      setUploading(false);
    }
  };

  // Toggle row selection
  const toggleRowSelection = (index: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
  };

  // Select all
  const selectAll = () => {
    if (selectedRows.size === transactions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(transactions.map((_, i) => i)));
    }
  };

  // Update transaction
  const updateTransaction = (index: number, field: keyof EditableTransaction, value: any) => {
    setTransactions((prev) =>
      prev.map((txn) => (txn.index === index ? { ...txn, [field]: value } : txn))
    );
  };

  // Toggle editing
  const toggleEditing = (index: number) => {
    setTransactions((prev) =>
      prev.map((txn) => (txn.index === index ? { ...txn, editing: !txn.editing } : txn))
    );
  };

  // Bulk category update
  const bulkUpdateCategory = (categoryIdOrName: string) => {
    if (selectedRows.size === 0) {
      toast.error('Please select transactions to update');
      return;
    }
    
    // Find category by ID or name
    const category = categories.find(c => c.id === categoryIdOrName || c.name === categoryIdOrName);
    if (!category) {
      toast.error('Category not found');
      return;
    }
    
    setTransactions((prev) =>
      prev.map((txn) =>
        selectedRows.has(txn.index) ? { ...txn, categoryName: category.name } : txn
      )
    );
    
    toast.success(`Updated ${selectedRows.size} transaction(s)`);
    setSelectedRows(new Set());
  };

  // Commit transactions
  const handleCommit = async () => {
    if (!extractedData || transactions.length === 0) return;

    // Validation: Check if all transactions have categories
    const transactionsWithoutCategory = transactions.filter(txn => !txn.categoryName || !txn.categoryName.trim());
    if (transactionsWithoutCategory.length > 0) {
      toast.error(`Please assign categories to all transactions. ${transactionsWithoutCategory.length} transaction(s) missing category.`);
      return;
    }

    try {
      setCommitting(true);
      
      // Convert to API format
      const txnsData = transactions.map((txn) => ({
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        date: txn.date, // Already in YYYY-MM-DD format
        categoryName: txn.categoryName!.trim(),
        merchant: txn.merchant || undefined,
      }));

      const response = await uploadService.commitStatement({
        previewId: extractedData.previewId,
        transactions: txnsData,
        options: {
          skipDuplicates,
        },
      });

      const { created, skipped } = response.data || { created: 0, skipped: 0 };
      
      if (skipped > 0) {
        toast.success(
          `Imported ${created} transaction(s). Skipped ${skipped} duplicate(s).`,
          { duration: 5000 }
        );
      } else {
        toast.success(`Successfully imported ${created} transaction(s)!`);
      }
      
      // Reset
      handleReset();
    } catch (error: any) {
      console.error('Error committing transactions:', error);
      toast.error(error.response?.data?.error || 'Failed to import transactions');
    } finally {
      setCommitting(false);
    }
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setTransactions([]);
    setSelectedRows(new Set());
    setSkipDuplicates(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get filtered categories by type
  const getCategoriesByType = (type: TransactionType) => {
    return categories.filter((cat) => cat.type === type);
  };

  // Get filtered categories with search
  const getFilteredCategories = (type: TransactionType) => {
    const filtered = categories.filter((cat) => cat.type === type);
    if (!categorySearch) return filtered;
    return filtered.filter((cat) => 
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  };

  // Handle quick category creation
  const handleQuickCategoryCreate = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      setCreatingCategory(true);
      const response = await categoryService.createCategory({
        name: newCategoryName.trim(),
        type: newCategoryType,
      });

      if (response.success && response.data) {
        toast.success('Category created successfully!');
        // Add to local categories list
        setCategories([...categories, response.data]);
        // Close modal and reset
        setIsCategoryModalOpen(false);
        setNewCategoryName('');
        setCategorySearch('');
      }
    } catch (error: any) {
      console.error('Error creating category:', error);
      if (error.response?.status === 409) {
        toast.error('A category with this name already exists');
      } else {
        toast.error(error.response?.data?.error || 'Failed to create category');
      }
    } finally {
      setCreatingCategory(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Statement Import with AI</p>
            <p className="text-blue-700">
              Upload a bank statement PDF to automatically extract all transactions.
              You can review, edit, and bulk-import them into your account.
              Duplicate transactions can be automatically skipped.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {!extractedData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Bank Statement
          </label>
          
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-base font-medium text-gray-900 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">PDF only (max 20 MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border-2 border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Processing...' : 'Extract Transactions with AI'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Extracted Transactions */}
      {extractedData && transactions.length > 0 && (
        <div className="space-y-4">
          {/* Account Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Statement Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Account:</span>{' '}
                <span className="font-medium text-gray-900">
                  {extractedData.extractedData.accountInfo.accountNumber || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Period:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Date(extractedData.extractedData.accountInfo.period.startDate).toLocaleDateString()} -{' '}
                  {new Date(extractedData.extractedData.accountInfo.period.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRows.size === transactions.length}
                  onChange={selectAll}
                  className="rounded border-gray-300"
                />
                <span className="font-medium text-gray-700">
                  {selectedRows.size > 0
                    ? `${selectedRows.size} selected`
                    : 'Select all'}
                </span>
              </label>
              
              {selectedRows.size > 0 && (
                <>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        bulkUpdateCategory(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-sm px-3 py-1 border border-gray-300 rounded-lg"
                    defaultValue=""
                  >
                    <option value="">Assign category...</option>
                    <optgroup label="Income">
                      {categories.filter(c => c.type === 'INCOME').map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Expense">
                      {categories.filter(c => c.type === 'EXPENSE').map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  
                  <button
                    onClick={() => {
                      setNewCategoryType('EXPENSE');
                      setIsCategoryModalOpen(true);
                    }}
                    className="text-sm px-3 py-1 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Category
                  </button>
                </>
              )}
            </div>

            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold">{transactions.length}</span> transactions
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-3 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((txn) => (
                    <tr
                      key={txn.index}
                      className={selectedRows.has(txn.index) ? 'bg-blue-50' : ''}
                    >
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(txn.index)}
                          onChange={() => toggleRowSelection(txn.index)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {txn.editing ? (
                          <input
                            type="date"
                            value={txn.date}
                            onChange={(e) => updateTransaction(txn.index, 'date', e.target.value)}
                            className="w-32 px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        ) : (
                          new Date(txn.date).toLocaleDateString()
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {txn.editing ? (
                          <input
                            type="text"
                            value={txn.description}
                            onChange={(e) => updateTransaction(txn.index, 'description', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        ) : (
                          <div className="max-w-xs truncate">{txn.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap">
                        {txn.editing ? (
                          <select
                            value={txn.type}
                            onChange={(e) => {
                              updateTransaction(txn.index, 'type', e.target.value);
                              updateTransaction(txn.index, 'categoryName', '');
                            }}
                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                          >
                            <option value="INCOME">Income</option>
                            <option value="EXPENSE">Expense</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              txn.type === 'INCOME'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {txn.type}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900 font-medium whitespace-nowrap">
                        {txn.editing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={txn.amount}
                            onChange={(e) => updateTransaction(txn.index, 'amount', parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 text-xs text-right border border-gray-300 rounded"
                          />
                        ) : (
                          formatCurrency(txn.amount)
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {txn.editing ? (
                          <input
                            type="text"
                            list={`category-suggestions-${txn.index}`}
                            value={txn.categoryName || ''}
                            onChange={(e) => updateTransaction(txn.index, 'categoryName', e.target.value)}
                            placeholder="Type or select..."
                            className={`w-full px-2 py-1 text-xs border rounded ${
                              !txn.categoryName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                        ) : (
                          <span className={txn.categoryName ? 'text-gray-600' : 'text-red-500 font-medium'}>
                            {txn.categoryName || 'No category'}
                          </span>
                        )}
                        {txn.editing && (
                          <datalist id={`category-suggestions-${txn.index}`}>
                            {getCategoriesByType(txn.type).map((cat) => (
                              <option key={cat.id} value={cat.name} />
                            ))}
                          </datalist>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleEditing(txn.index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {txn.editing ? (
                            <CheckIcon className="w-4 h-4 inline" />
                          ) : (
                            <PencilIcon className="w-4 h-4 inline" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Income:</span>{' '}
                <span className="font-semibold text-green-600">
                  {formatCurrency(
                    transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total Expenses:</span>{' '}
                <span className="font-semibold text-red-600">
                  {formatCurrency(
                    transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Net:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(
                    transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0) -
                    transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Warning for missing categories */}
            {transactions.filter(t => !t.categoryName || !t.categoryName.trim()).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <ExclamationCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <span className="font-medium">
                      {transactions.filter(t => !t.categoryName || !t.categoryName.trim()).length} transaction(s) missing category
                    </span>
                    <p className="text-yellow-700 mt-0.5">
                      Please assign categories to all transactions before importing.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipDuplicates"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="skipDuplicates" className="text-sm text-gray-700">
                Skip duplicate transactions (recommended)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleCommit}
              disabled={committing || transactions.filter(t => !t.categoryName || !t.categoryName.trim()).length > 0}
              className="flex-1"
            >
              {committing ? 'Importing...' : `Import ${transactions.length} Transactions`}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={committing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {extractedData && transactions.length === 0 && (
        <div className="text-center py-12">
          <ExclamationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No transactions found in this statement.</p>
          <Button onClick={handleReset} variant="outline" className="mt-4">
            Upload Another Statement
          </Button>
        </div>
      )}

      {/* Quick Category Creation Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Category</h3>
            
            <div className="space-y-4">
              {/* Category Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      handleQuickCategoryCreate();
                    }
                  }}
                  placeholder="e.g., Groceries, Salary"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                  autoFocus
                />
              </div>

              {/* Transaction Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewCategoryType('INCOME')}
                    className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                      newCategoryType === 'INCOME'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    📈 Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategoryType('EXPENSE')}
                    className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                      newCategoryType === 'EXPENSE'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    📉 Expense
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleQuickCategoryCreate}
                disabled={creatingCategory || !newCategoryName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {creatingCategory ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
                disabled={creatingCategory}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementUploadTab;
