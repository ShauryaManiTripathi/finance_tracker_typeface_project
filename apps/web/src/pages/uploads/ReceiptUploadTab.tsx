import { useState, useCallback, useRef } from 'react';
import {
  CloudArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { uploadService, type ReceiptPreview } from '../../services/upload.service';
import { categoryService } from '../../services/category.service';
import type { Category, TransactionType } from '../../types/api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

const ReceiptUploadTab = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<ReceiptPreview | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state for editing extracted data
  const [formData, setFormData] = useState({
    type: 'EXPENSE' as TransactionType,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryName: '',
    merchant: '',
  });
  
  // Category creation modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [committing, setCommitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
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

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (10 MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10 MB');
      return;
    }

    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
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
      const response = await uploadService.uploadReceipt(file);
      
      if (response.success && response.data) {
        setExtractedData(response.data);
        
        // Pre-fill form with extracted data
        const suggested = response.data.suggestedTransaction;
        const extracted = response.data.extractedData;
        
        setFormData({
          type: suggested.type,
          amount: suggested.amount.toString(),
          description: suggested.description || '',
          date: suggested.date,
          categoryName: suggested.categoryName || '',
          merchant: extracted.merchant || '',
        });
        
        toast.success('Receipt processed successfully! Please review the extracted data.');
      }
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      toast.error(error.message || 'Failed to process receipt');
    } finally {
      setUploading(false);
    }
  };

  // Commit transaction
  const handleCommit = async () => {
    if (!extractedData) return;

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }
    if (!formData.description) {
      toast.error('Please enter a description');
      return;
    }
    if (!formData.categoryName || !formData.categoryName.trim()) {
      toast.error('Please enter or select a category');
      return;
    }

    try {
      setCommitting(true);
      
      await uploadService.commitReceipt({
        previewId: extractedData.previewId,
        transaction: {
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: formData.date, // Already in YYYY-MM-DD format from date input
          categoryName: formData.categoryName.trim(),
        },
        metadata: {
          merchant: formData.merchant || undefined,
          currency: extractedData.extractedData.currency,
          aiConfidence: extractedData.extractedData.confidence,
        },
      });

      toast.success('Transaction created successfully!');
      
      // Reset
      setFile(null);
      setPreview(null);
      setExtractedData(null);
      setFormData({
        type: 'EXPENSE',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        categoryName: '',
        merchant: '',
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error committing transaction:', error);
      toast.error(error.response?.data?.error || 'Failed to create transaction');
    } finally {
      setCommitting(false);
    }
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setExtractedData(null);
    setFormData({
      type: 'EXPENSE',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      categoryName: '',
      merchant: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get filtered categories
  const getFilteredCategories = () => {
    const filtered = categories.filter((cat) => cat.type === formData.type);
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
        type: formData.type,
      });

      if (response.success && response.data) {
        toast.success('Category created successfully!');
        // Add to local categories list
        setCategories([...categories, response.data]);
        // Select the new category by name
        setFormData({ ...formData, categoryName: response.data.name });
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

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!extractedData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Receipt Image
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
              <p className="text-sm text-gray-500">
                JPEG, PNG, or WebP (max 10 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border-2 border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <PhotoIcon className="w-8 h-8 text-blue-600" />
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
              
              {preview && (
                <div className="mb-4">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="max-h-64 mx-auto rounded border border-gray-200"
                  />
                </div>
              )}
              
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Processing...' : 'Extract Data with AI'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Extracted Data Review */}
      {extractedData && (
        <div className="space-y-6">
          {/* AI Confidence Indicator */}
          <div className={`p-4 rounded-lg border-2 ${
            extractedData.extractedData.confidence >= 0.8
              ? 'bg-green-50 border-green-200'
              : extractedData.extractedData.confidence >= 0.5
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {extractedData.extractedData.confidence >= 0.8 ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />
              )}
              <p className="text-sm font-medium">
                AI Confidence: {(extractedData.extractedData.confidence * 100).toFixed(0)}%
              </p>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Please review and verify the extracted information below
            </p>
          </div>

          {/* Preview Image */}
          {preview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt Image
              </label>
              <img
                src={preview}
                alt="Receipt"
                className="max-h-48 mx-auto rounded border border-gray-200"
              />
            </div>
          )}

          {/* Extracted Data Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Extracted Transaction Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className={`font-medium ${formData.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                  {formData.type === 'INCOME' ? '📈 Income' : '📉 Expense'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-medium text-gray-900">
                {formData.amount ? `₹${parseFloat(formData.amount).toFixed(2)}` : 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium text-gray-900">{formData.date || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Merchant</p>
                <p className="font-medium text-gray-900">{formData.merchant || 'N/A'}</p>
              </div>
              
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Description</p>
                <p className="font-medium text-gray-900">{formData.description || 'N/A'}</p>
              </div>
              
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium text-gray-900">
                  {formData.categoryName || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => setIsEditModalOpen(true)}
              variant="outline"
              className="flex-1"
            >
              ✏️ Review & Edit
            </Button>
            <Button
              onClick={handleCommit}
              disabled={committing}
              className="flex-1"
            >
              {committing ? 'Saving...' : '💾 Save Transaction'}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={committing}
            >
              🔄 Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && extractedData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Review & Edit Transaction</h3>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INCOME', categoryName: '' })}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                      formData.type === 'INCOME'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE', categoryName: '' })}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                      formData.type === 'EXPENSE'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              {/* Amount and Date */}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Merchant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Starbucks, Amazon"
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Transaction details..."
                  maxLength={500}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                
                {/* Search Categories */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Create New Category Button */}
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full mb-2 px-3 py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create New Category
                </button>

                {/* Category Input - can type new or select existing */}
                <div className="space-y-2">
                  <input
                    type="text"
                    list="category-suggestions"
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    placeholder="Type or select a category..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="category-suggestions">
                    {getFilteredCategories().map((cat) => (
                      <option key={cat.id} value={cat.name} />
                    ))}
                  </datalist>
                  {formData.categoryName && !categories.find(c => c.name === formData.categoryName && c.type === formData.type) && (
                    <p className="text-xs text-blue-600">
                      ✨ "{formData.categoryName}" will be created as a new category
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button
                onClick={() => setIsEditModalOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  toast.success('Changes saved!');
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </div>
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

              {/* Transaction Type Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className={`px-3 py-2 rounded-lg border-2 ${
                  formData.type === 'INCOME'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  <span className="font-medium">
                    {formData.type === 'INCOME' ? '📈 Income' : '📉 Expense'}
                  </span>
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

export default ReceiptUploadTab;
