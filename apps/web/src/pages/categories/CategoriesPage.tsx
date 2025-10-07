import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { categoryService } from '../../services/category.service';
import type { Category, CategoryType } from '../../types/api';
import toast from 'react-hot-toast';

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<CategoryType | 'ALL'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'EXPENSE' as CategoryType });
  const [formErrors, setFormErrors] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getCategories(
        filterType === 'ALL' ? undefined : filterType
      );
      setCategories(response.data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error(error.response?.data?.error || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [filterType]);

  // Handle create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({ name: '' });

    if (!formData.name.trim()) {
      setFormErrors({ name: 'Category name is required' });
      return;
    }

    if (formData.name.length > 100) {
      setFormErrors({ name: 'Category name must be less than 100 characters' });
      return;
    }

    try {
      setSubmitting(true);
      await categoryService.createCategory({
        name: formData.name.trim(),
        type: formData.type,
      });
      toast.success('Category created successfully!');
      setIsCreateModalOpen(false);
      setFormData({ name: '', type: 'EXPENSE' });
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      if (error.response?.status === 409) {
        setFormErrors({ name: 'A category with this name already exists' });
      } else {
        toast.error(error.response?.data?.error || 'Failed to create category');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    setFormErrors({ name: '' });

    if (!formData.name.trim()) {
      setFormErrors({ name: 'Category name is required' });
      return;
    }

    if (formData.name.length > 100) {
      setFormErrors({ name: 'Category name must be less than 100 characters' });
      return;
    }

    try {
      setSubmitting(true);
      await categoryService.updateCategory(selectedCategory.id, {
        name: formData.name.trim(),
        type: formData.type,
      });
      toast.success('Category updated successfully!');
      setIsEditModalOpen(false);
      setSelectedCategory(null);
      setFormData({ name: '', type: 'EXPENSE' });
      fetchCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      if (error.response?.status === 409) {
        setFormErrors({ name: 'A category with this name already exists' });
      } else {
        toast.error(error.response?.data?.error || 'Failed to update category');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      setSubmitting(true);
      await categoryService.deleteCategory(selectedCategory.id);
      toast.success('Category deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error || 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  // Open modals
  const openCreateModal = () => {
    setFormData({ name: '', type: 'EXPENSE' });
    setFormErrors({ name: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, type: category.type });
    setFormErrors({ name: '' });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  // Filter and group categories
  const incomeCategories = categories.filter((cat) => cat.type === 'INCOME');
  const expenseCategories = categories.filter((cat) => cat.type === 'EXPENSE');

  // Get category icon color
  const getCategoryColor = (type: CategoryType) => {
    return type === 'INCOME' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">Organize your income and expenses</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filterType === 'ALL'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({categories.length})
        </button>
        <button
          onClick={() => setFilterType('INCOME')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filterType === 'INCOME'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Income ({incomeCategories.length})
        </button>
        <button
          onClick={() => setFilterType('EXPENSE')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filterType === 'EXPENSE'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Expenses ({expenseCategories.length})
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && categories.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
              <p className="text-gray-600 mb-6">
                {filterType === 'ALL'
                  ? 'Get started by creating your first category'
                  : `No ${filterType.toLowerCase()} categories found`}
              </p>
              {filterType === 'ALL' && (
                <Button onClick={openCreateModal}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(
                      category.type
                    )}`}
                  >
                    {category.type === 'INCOME' ? (
                      <ArrowUpIcon className="w-6 h-6" />
                    ) : (
                      <ArrowDownIcon className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                      title="Edit category"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(category)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete category"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                  {category.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    category.type === 'INCOME'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {category.type}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Create Category</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Groceries, Salary"
                  autoFocus
                />
                {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INCOME' })}
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
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
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

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Creating...' : 'Create Category'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
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

      {/* Edit Modal */}
      {isEditModalOpen && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Edit Category</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Groceries, Salary"
                  autoFocus
                />
                {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INCOME' })}
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
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
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

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Updating...' : 'Update Category'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
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
      {isDeleteModalOpen && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Delete Category</h2>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>{selectedCategory.name}</strong>?
              </p>
              <p className="text-sm text-gray-600 mb-6">
                This will remove the category from all associated transactions. This action cannot
                be undone.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleDelete}
                  disabled={submitting}
                  variant="destructive"
                  className="flex-1"
                >
                  {submitting ? 'Deleting...' : 'Delete Category'}
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

export default CategoriesPage;
