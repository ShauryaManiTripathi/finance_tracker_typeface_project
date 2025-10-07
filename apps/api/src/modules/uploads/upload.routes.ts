/**
 * Upload Module - Routes
 * 
 * Defines all upload-related endpoints with proper middleware:
 * - Multer for file uploads (images and PDFs)
 * - Authentication required for all routes
 * - Validation using Zod schemas
 * - File size limits (10MB receipts, 20MB statements)
 * 
 * @module modules/uploads/routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as uploadController from './upload.controller';
import {
  commitReceiptSchema,
  commitStatementSchema,
  listPreviewsSchema,
  RECEIPT_MIME_TYPES,
  STATEMENT_MIME_TYPES,
} from './upload.validators';
import { config } from '../../config';
import { HttpError } from '../../middleware/error';

const router = Router();

/**
 * Multer error handler middleware
 * Converts Multer errors to proper HTTP errors
 */
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(400, 'BadRequest', 'File too large'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new HttpError(400, 'BadRequest', 'Unexpected file field'));
    }
    return next(new HttpError(400, 'BadRequest', err.message));
  }
  
  // Non-Multer errors (e.g., from fileFilter)
  if (err) {
    return next(new HttpError(400, 'BadRequest', err.message));
  }
  
  next();
};

// Ensure upload directories exist
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const RECEIPT_DIR = path.join(UPLOAD_DIR, 'receipts');
const STATEMENT_DIR = path.join(UPLOAD_DIR, 'statements');

[UPLOAD_DIR, RECEIPT_DIR, STATEMENT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Multer storage configuration for receipts
 */
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RECEIPT_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

/**
 * Multer storage configuration for statements
 */
const statementStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STATEMENT_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `statement-${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter for receipt images (JPEG, PNG, WebP)
 */
const receiptFileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  if (RECEIPT_MIME_TYPES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${RECEIPT_MIME_TYPES.join(', ')}`));
  }
};

/**
 * File filter for statement PDFs and images (unified import)
 */
const statementFileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  if (STATEMENT_MIME_TYPES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${STATEMENT_MIME_TYPES.join(', ')}`));
  }
};

/**
 * Multer middleware for receipt uploads
 */
const uploadReceipt = multer({
  storage: receiptStorage,
  fileFilter: receiptFileFilter,
  limits: {
    fileSize: config.maxReceiptSizeMb * 1024 * 1024, // Convert MB to bytes
  },
});

/**
 * Multer middleware for statement uploads
 */
const uploadStatement = multer({
  storage: statementStorage,
  fileFilter: statementFileFilter,
  limits: {
    fileSize: config.maxStatementSizeMb * 1024 * 1024, // Convert MB to bytes
  },
});

/**
 * POST /api/uploads/receipt
 * 
 * Upload a receipt image and extract transaction data.
 * Returns a preview for user verification.
 * 
 * Authentication: Required
 * Content-Type: multipart/form-data
 * Request: file (image/jpeg, image/png, image/webp), max 10MB
 * Response: { success, data: ReceiptPreview, message }
 */
router.post(
  '/receipt',
  authenticate,
  uploadReceipt.single('file'),
  handleMulterError,
  uploadController.uploadReceipt
);

/**
 * POST /api/uploads/statement
 * 
 * Upload a transaction document (receipt, invoice, or bank statement) and extract all transactions.
 * Returns a preview with all extracted transactions (1 or many).
 * 
 * Authentication: Required
 * Content-Type: multipart/form-data
 * Request: file (image/jpeg, image/png, image/webp, or application/pdf), max 20MB
 * Response: { success, data: StatementPreview, message }
 */
router.post(
  '/statement',
  authenticate,
  uploadStatement.single('file'),
  handleMulterError,
  uploadController.uploadStatement
);

/**
 * POST /api/uploads/receipt/commit
 * 
 * Commit a verified receipt transaction to the database.
 * User must have reviewed the AI extraction preview first.
 * 
 * Authentication: Required
 * Content-Type: application/json
 * Request: { previewId, transaction, metadata? }
 * Response: { success, data: Transaction, message }
 */
router.post(
  '/receipt/commit',
  authenticate,
  validate(z.object({ body: commitReceiptSchema })),
  uploadController.commitReceipt
);

/**
 * POST /api/uploads/statement/commit
 * 
 * Commit verified statement transactions to the database (bulk import).
 * User must have reviewed the AI extraction preview first.
 * 
 * Authentication: Required
 * Content-Type: application/json
 * Request: { previewId, transactions[], options? }
 * Response: { success, data: { created, skipped, total }, message }
 */
router.post(
  '/statement/commit',
  authenticate,
  validate(z.object({ body: commitStatementSchema })),
  uploadController.commitStatement
);

/**
 * GET /api/uploads/previews
 * 
 * List all active (non-expired) upload previews for the authenticated user.
 * Supports filtering by type (receipt or statement).
 * 
 * Authentication: Required
 * Query Params: type? (receipt|statement), page?, pageSize?
 * Response: { success, data: Preview[], count }
 */
router.get(
  '/previews',
  authenticate,
  validate(z.object({ query: listPreviewsSchema })),
  uploadController.listPreviews
);

/**
 * GET /api/uploads/previews/:id
 * 
 * Get a specific upload preview by ID.
 * Used for re-editing or reviewing extraction results.
 * 
 * Authentication: Required
 * Path Params: id (UUID)
 * Response: { success, data: Preview }
 */
router.get(
  '/previews/:id',
  authenticate,
  uploadController.getPreview
);

export default router;
