import { prisma } from '../../db/prisma';
import { CreateCategoryInput, UpdateCategoryInput } from './category.validators';
import { logger } from '../../utils/logger';
import { Category, CategoryType } from '@prisma/client';

export class CategoryService {
  /**
   * Get all categories for a user
   */
  async getCategories(userId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: { userId },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(userId: string, categoryId: string): Promise<Category> {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * Create a new category
   */
  async createCategory(
    userId: string,
    input: CreateCategoryInput
  ): Promise<Category> {
    const { name, type } = input;

    // Check if category with same name already exists for this user
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new Error('A category with this name already exists');
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        userId,
      },
    });

    logger.info(`Category created: ${category.name} (${category.type}) for user ${userId}`);

    return category;
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<Category> {
    // First, verify the category exists and belongs to the user
    await this.getCategoryById(userId, categoryId);

    // If name is being updated, check for duplicates
    if (input.name) {
      const existing = await prisma.category.findFirst({
        where: {
          userId,
          name: {
            equals: input.name,
            mode: 'insensitive',
          },
          NOT: {
            id: categoryId,
          },
        },
      });

      if (existing) {
        throw new Error('A category with this name already exists');
      }
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: input,
    });

    logger.info(`Category updated: ${category.id} for user ${userId}`);

    return category;
  }

  /**
   * Delete a category
   */
  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    // First, verify the category exists and belongs to the user
    await this.getCategoryById(userId, categoryId);

    // Check if category is in use by any transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        categoryId,
        userId,
      },
    });

    if (transactionCount > 0) {
      throw new Error(
        `Cannot delete category. It is being used by ${transactionCount} transaction(s)`
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    logger.info(`Category deleted: ${categoryId} for user ${userId}`);
  }

  /**
   * Get categories by type
   */
  async getCategoriesByType(
    userId: string,
    type: CategoryType
  ): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        userId,
        type,
      },
      orderBy: { name: 'asc' },
    });
  }
}

export const categoryService = new CategoryService();
