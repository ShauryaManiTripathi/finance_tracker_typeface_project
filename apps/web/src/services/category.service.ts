import api from '../lib/api';
import type { ApiResponse, Category, CategoryType } from '../types/api';

export const categoryService = {
  /**
   * Get all categories for the authenticated user
   */
  async getCategories(type?: CategoryType): Promise<ApiResponse<Category[]>> {
    const params = type ? { type } : {};
    const response = await api.get<ApiResponse<Category[]>>('/categories', { params });
    return response.data;
  },

  /**
   * Get a specific category by ID
   */
  async getCategory(id: string): Promise<ApiResponse<Category>> {
    const response = await api.get<ApiResponse<Category>>(`/categories/${id}`);
    return response.data;
  },

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    type: CategoryType;
  }): Promise<ApiResponse<Category>> {
    const response = await api.post<ApiResponse<Category>>('/categories', data);
    return response.data;
  },

  /**
   * Update an existing category
   */
  async updateCategory(
    id: string,
    data: {
      name?: string;
      type?: CategoryType;
    }
  ): Promise<ApiResponse<Category>> {
    const response = await api.put<ApiResponse<Category>>(`/categories/${id}`, data);
    return response.data;
  },

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/categories/${id}`);
    return response.data;
  },
};
