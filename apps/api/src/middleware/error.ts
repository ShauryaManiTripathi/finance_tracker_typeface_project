import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const createError = (
  statusCode: number,
  code: string,
  message: string,
  details?: any
): HttpError => {
  return new HttpError(statusCode, code, message, details);
};

export const errorHandler = (
  error: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const traceId = uuidv4();

  // Log the error
  logger.error({
    traceId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request data',
      details,
      traceId,
    });
    return;
  }

  // Handle HTTP errors
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      details: error.details,
      traceId,
    });
    return;
  }

  // Handle known app errors
  const appError = error as AppError;
  if (appError.statusCode && appError.code) {
    res.status(appError.statusCode).json({
      error: appError.code,
      message: appError.message,
      details: appError.details,
      traceId,
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    traceId,
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};