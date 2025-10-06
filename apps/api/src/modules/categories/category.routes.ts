import { Router } from 'express';
import { categoryController } from './category.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  getCategorySchema,
} from './category.validators';

const router = Router();

// All category routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/categories
 * @desc    Get all categories for authenticated user
 * @query   type (optional) - Filter by INCOME or EXPENSE
 * @access  Private
 */
router.get('/', categoryController.getCategories.bind(categoryController));

/**
 * @route   GET /api/categories/:id
 * @desc    Get a single category by ID
 * @access  Private
 */
router.get(
  '/:id',
  validate(getCategorySchema),
  categoryController.getCategoryById.bind(categoryController)
);

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private
 */
router.post(
  '/',
  validate(createCategorySchema),
  categoryController.createCategory.bind(categoryController)
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update an existing category
 * @access  Private
 */
router.put(
  '/:id',
  validate(updateCategorySchema),
  categoryController.updateCategory.bind(categoryController)
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category (if not in use)
 * @access  Private
 */
router.delete(
  '/:id',
  validate(deleteCategorySchema),
  categoryController.deleteCategory.bind(categoryController)
);

export default router;
