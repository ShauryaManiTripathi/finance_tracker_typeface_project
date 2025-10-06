import { Request, Response } from 'express';
import { categoryService } from './category.service';
import { CreateCategoryInput, UpdateCategoryInput } from './category.validators';
import { logger } from '../../utils/logger';
import { CategoryType } from '@prisma/client';

export class CategoryController {
  /**
   * Get all categories for the authenticated user
   * GET /api/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { type } = req.query;

      let categories;
      if (type && (type === 'INCOME' || type === 'EXPENSE')) {
        categories = await categoryService.getCategoriesByType(
          req.user.userId,
          type as CategoryType
        );
      } else {
        categories = await categoryService.getCategories(req.user.userId);
      }

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch categories',
      });
    }
  }

  /**
   * Get a single category by ID
   * GET /api/categories/:id
   */
  async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Category ID is required',
        });
        return;
      }

      const category = await categoryService.getCategoryById(
        req.user.userId,
        id
      );

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
        });
        return;
      }

      logger.error('Get category error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch category',
      });
    }
  }

  /**
   * Create a new category
   * POST /api/categories
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const input = req.body as CreateCategoryInput;

      const category = await categoryService.createCategory(
        req.user.userId,
        input
      );

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'A category with this name already exists'
      ) {
        res.status(409).json({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }

      logger.error('Create category error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create category',
      });
    }
  }

  /**
   * Update an existing category
   * PUT /api/categories/:id
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Category ID is required',
        });
        return;
      }
      
      const input = req.body as UpdateCategoryInput;

      const category = await categoryService.updateCategory(
        req.user.userId,
        id,
        input
      );

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          res.status(404).json({
            error: 'Not Found',
            message: error.message,
          });
          return;
        }

        if (error.message === 'A category with this name already exists') {
          res.status(409).json({
            error: 'Conflict',
            message: error.message,
          });
          return;
        }
      }

      logger.error('Update category error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update category',
      });
    }
  }

  /**
   * Delete a category
   * DELETE /api/categories/:id
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Category ID is required',
        });
        return;
      }

      await categoryService.deleteCategory(req.user.userId, id);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          res.status(404).json({
            error: 'Not Found',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('Cannot delete category')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message,
          });
          return;
        }
      }

      logger.error('Delete category error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete category',
      });
    }
  }
}

export const categoryController = new CategoryController();
