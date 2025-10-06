import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Middleware to validate request data against a Zod schema
 * @param schema - Zod schema with optional body, query, params
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: formattedErrors,
        });
        return;
      }

      logger.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Validation failed',
      });
    }
  };
};
