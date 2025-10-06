import { categoryService } from './category.service';
import { prismaTest } from '../../__tests__/setup';
import { createAuthenticatedUser } from '../../__tests__/helpers';
import { CategoryType } from '@prisma/client';

describe('CategoryService', () => {
  describe('getCategories', () => {
    it('should return all categories for a user', async () => {
      const { user } = await createAuthenticatedUser('cat1@example.com');

      await prismaTest.category.createMany({
        data: [
          { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
          { name: 'Food', type: CategoryType.EXPENSE, userId: user.id },
          { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      const categories = await categoryService.getCategories(user.id);

      expect(categories).toHaveLength(3);
      // Verify sorting by checking the results (sorted by type asc, then name asc)
      expect(categories[0]?.name).toBe('Salary'); // INCOME
      expect(categories[0]?.type).toBe(CategoryType.INCOME);
      expect(categories[1]?.name).toBe('Food'); // EXPENSE
      expect(categories[1]?.type).toBe(CategoryType.EXPENSE);
      expect(categories[2]?.name).toBe('Transport'); // EXPENSE
      expect(categories[2]?.type).toBe(CategoryType.EXPENSE);
    });

    it('should return empty array for user with no categories', async () => {
      const { user } = await createAuthenticatedUser('nocat@example.com');

      const categories = await categoryService.getCategories(user.id);

      expect(categories).toHaveLength(0);
    });

    it('should not return categories from other users', async () => {
      const { user: user1 } = await createAuthenticatedUser('user1@example.com');
      const { user: user2 } = await createAuthenticatedUser('user2@example.com');

      await prismaTest.category.create({
        data: { name: 'User1 Category', type: CategoryType.INCOME, userId: user1.id },
      });

      const categories = await categoryService.getCategories(user2.id);

      expect(categories).toHaveLength(0);
    });
  });

  describe('getCategoryById', () => {
    it('should return a category by ID', async () => {
      const { user } = await createAuthenticatedUser('getbyid@example.com');
      
      const created = await prismaTest.category.create({
        data: { name: 'Test Category', type: CategoryType.INCOME, userId: user.id },
      });

      const category = await categoryService.getCategoryById(user.id, created.id);

      expect(category.id).toBe(created.id);
      expect(category.name).toBe('Test Category');
    });

    it('should throw error if category not found', async () => {
      const { user } = await createAuthenticatedUser('notfound@example.com');

      await expect(
        categoryService.getCategoryById(user.id, 'non-existent-id')
      ).rejects.toThrow('Category not found');
    });

    it('should throw error if category belongs to another user', async () => {
      const { user: user1 } = await createAuthenticatedUser('owner@example.com');
      const { user: user2 } = await createAuthenticatedUser('other@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'User1 Category', type: CategoryType.INCOME, userId: user1.id },
      });

      await expect(
        categoryService.getCategoryById(user2.id, category.id)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const { user } = await createAuthenticatedUser('create@example.com');

      const category = await categoryService.createCategory(user.id, {
        name: 'Groceries',
        type: CategoryType.EXPENSE,
      });

      expect(category).toHaveProperty('id');
      expect(category.name).toBe('Groceries');
      expect(category.type).toBe(CategoryType.EXPENSE);
      expect(category.userId).toBe(user.id);
    });

    it('should throw error for duplicate category name (case insensitive)', async () => {
      const { user } = await createAuthenticatedUser('duplicate@example.com');

      await categoryService.createCategory(user.id, {
        name: 'Food',
        type: CategoryType.EXPENSE,
      });

      await expect(
        categoryService.createCategory(user.id, {
          name: 'food', // lowercase
          type: CategoryType.EXPENSE,
        })
      ).rejects.toThrow('A category with this name already exists');
    });

    it('should allow same category name for different users', async () => {
      const { user: user1 } = await createAuthenticatedUser('user1-create@example.com');
      const { user: user2 } = await createAuthenticatedUser('user2-create@example.com');

      await categoryService.createCategory(user1.id, {
        name: 'Shared Name',
        type: CategoryType.INCOME,
      });

      const category2 = await categoryService.createCategory(user2.id, {
        name: 'Shared Name',
        type: CategoryType.INCOME,
      });

      expect(category2.name).toBe('Shared Name');
      expect(category2.userId).toBe(user2.id);
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const { user } = await createAuthenticatedUser('update@example.com');
      
      const created = await prismaTest.category.create({
        data: { name: 'Old Name', type: CategoryType.EXPENSE, userId: user.id },
      });

      const updated = await categoryService.updateCategory(user.id, created.id, {
        name: 'New Name',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe(CategoryType.EXPENSE);
    });

    it('should update category type', async () => {
      const { user } = await createAuthenticatedUser('updatetype@example.com');
      
      const created = await prismaTest.category.create({
        data: { name: 'Changeable', type: CategoryType.EXPENSE, userId: user.id },
      });

      const updated = await categoryService.updateCategory(user.id, created.id, {
        type: CategoryType.INCOME,
      });

      expect(updated.type).toBe(CategoryType.INCOME);
    });

    it('should throw error if new name already exists', async () => {
      const { user } = await createAuthenticatedUser('updatedup@example.com');
      
      await prismaTest.category.createMany({
        data: [
          { name: 'Existing', type: CategoryType.EXPENSE, userId: user.id },
          { name: 'ToUpdate', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      const toUpdate = await prismaTest.category.findFirst({
        where: { name: 'ToUpdate', userId: user.id },
      });

      await expect(
        categoryService.updateCategory(user.id, toUpdate!.id, { name: 'Existing' })
      ).rejects.toThrow('A category with this name already exists');
    });

    it('should throw error if category not found', async () => {
      const { user } = await createAuthenticatedUser('updatenotfound@example.com');

      await expect(
        categoryService.updateCategory(user.id, 'non-existent', { name: 'Test' })
      ).rejects.toThrow('Category not found');
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const { user } = await createAuthenticatedUser('delete@example.com');
      
      const category = await prismaTest.category.create({
        data: { name: 'To Delete', type: CategoryType.EXPENSE, userId: user.id },
      });

      await categoryService.deleteCategory(user.id, category.id);

      const found = await prismaTest.category.findUnique({
        where: { id: category.id },
      });

      expect(found).toBeNull();
    });

    it('should throw error if category is in use', async () => {
      const { user } = await createAuthenticatedUser('deleteinuse@example.com');
      
      const category = await prismaTest.category.create({
        data: { name: 'In Use', type: CategoryType.EXPENSE, userId: user.id },
      });

      // Create a transaction using this category
      await prismaTest.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 100,
          occurredAt: new Date(),
          description: 'Test',
          userId: user.id,
          categoryId: category.id,
        },
      });

      await expect(
        categoryService.deleteCategory(user.id, category.id)
      ).rejects.toThrow('Cannot delete category');
    });

    it('should throw error if category not found', async () => {
      const { user } = await createAuthenticatedUser('deletenotfound@example.com');

      await expect(
        categoryService.deleteCategory(user.id, 'non-existent')
      ).rejects.toThrow('Category not found');
    });
  });

  describe('getCategoriesByType', () => {
    it('should return only income categories', async () => {
      const { user } = await createAuthenticatedUser('bytype@example.com');

      await prismaTest.category.createMany({
        data: [
          { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
          { name: 'Bonus', type: CategoryType.INCOME, userId: user.id },
          { name: 'Food', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      const incomeCategories = await categoryService.getCategoriesByType(
        user.id,
        CategoryType.INCOME
      );

      expect(incomeCategories).toHaveLength(2);
      expect(incomeCategories.every(c => c.type === CategoryType.INCOME)).toBe(true);
    });

    it('should return only expense categories', async () => {
      const { user } = await createAuthenticatedUser('bytype2@example.com');

      await prismaTest.category.createMany({
        data: [
          { name: 'Food', type: CategoryType.EXPENSE, userId: user.id },
          { name: 'Transport', type: CategoryType.EXPENSE, userId: user.id },
          { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
        ],
      });

      const expenseCategories = await categoryService.getCategoriesByType(
        user.id,
        CategoryType.EXPENSE
      );

      expect(expenseCategories).toHaveLength(2);
      expect(expenseCategories.every(c => c.type === CategoryType.EXPENSE)).toBe(true);
    });
  });
});
