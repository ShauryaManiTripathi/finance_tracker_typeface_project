import { z } from 'zod';
import { CategoryType } from '@prisma/client';

/**
 * Schema for creating a new category
 */
export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Category name is required')
      .max(50, 'Category name must not exceed 50 characters'),
    type: z.nativeEnum(CategoryType, {
      errorMap: () => ({ message: 'Type must be either INCOME or EXPENSE' }),
    }),
  }),
});

/**
 * Schema for updating a category
 */
export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Category name is required')
      .max(50, 'Category name must not exceed 50 characters')
      .optional(),
    type: z
      .nativeEnum(CategoryType, {
        errorMap: () => ({ message: 'Type must be either INCOME or EXPENSE' }),
      })
      .optional(),
  })
  .refine((data) => data.name || data.type, {
    message: 'At least one field (name or type) must be provided',
  }),
});

/**
 * Schema for deleting a category
 */
export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
});

/**
 * Schema for getting a single category
 */
export const getCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
