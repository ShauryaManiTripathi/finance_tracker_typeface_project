/**
 * Upload Module - Controller
 * 
 * HTTP handlers for upload endpoints:
 * - POST /api/uploads/receipt - Extract receipt data (returns preview)
 * - POST /api/uploads/statement - Extract statement data (returns preview)
 * - POST /api/uploads/receipt/commit - Save verified receipt transaction
 * - POST /api/uploads/statement/commit - Save verified statement transactions
 * - GET /api/uploads/previews - List user's active previews
 * - GET /api/uploads/previews/:id - Get specific preview
 * 
 * @module modules/uploads/controller
 */

import type { Request, Response, NextFunction } from 'express';
import * as uploadService from './upload.service';
import { logger } from '../../utils/logger';
import fs from 'fs/promises';

/**
 * POST /api/uploads/receipt
 * 
 * Upload a receipt image and extract transaction data using Gemini Vision.
 * Returns a preview that the user can verify/edit before committing.
 * 
 * @param req - Express request with uploaded file (via multer)
 * @param res - Express response
 * @param next - Express next function
 */
export async function uploadReceipt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a receipt image (JPEG, PNG, or WebP)',
      });
      return;
    }

    const userId = req.user!.userId; // Set by auth middleware

    logger.info({
      msg: 'Receipt upload request',
      userId,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    // Extract data using Gemini Vision
    const preview = await uploadService.extractReceiptData(
      req.file.path,
      req.file.mimetype,
      userId
    );

    // Clean up uploaded file (already processed by Gemini)
    await fs.unlink(req.file.path).catch((err) =>
      logger.warn({ msg: 'Failed to delete temp file', path: req.file!.path, error: err })
    );

    res.status(200).json({
      success: true,
      data: preview,
      message: 'Receipt processed successfully. Please review and confirm the extracted data.',
    });
  } catch (error) {
    // Clean up file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

/**
 * POST /api/uploads/statement
 * 
 * Upload a bank statement PDF and extract all transactions using Gemini.
 * Returns a preview with all extracted transactions for user verification.
 * 
 * @param req - Express request with uploaded PDF (via multer)
 * @param res - Express response
 * @param next - Express next function
 */
export async function uploadStatement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a bank statement PDF',
      });
      return;
    }

    const userId = req.user!.userId;

    logger.info({
      msg: 'Statement upload request',
      userId,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    // Extract data using Gemini
    const preview = await uploadService.extractStatementData(req.file.path, userId);

    // Clean up uploaded file
    await fs.unlink(req.file.path).catch((err) =>
      logger.warn({ msg: 'Failed to delete temp file', path: req.file!.path, error: err })
    );

    res.status(200).json({
      success: true,
      data: preview,
      message: `Statement processed successfully. Found ${preview.extractedData.transactions.length} transactions. Please review before importing.`,
    });
  } catch (error) {
    // Clean up file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

/**
 * POST /api/uploads/receipt/commit
 * 
 * Commit a verified receipt transaction to the database.
 * User has reviewed/edited the AI extraction and confirmed it's correct.
 * 
 * @param req - Express request with commit data
 * @param res - Express response
 * @param next - Express next function
 */
export async function commitReceipt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    logger.info({
      msg: 'Receipt commit request',
      userId,
      previewId: req.body.previewId,
    });

    // Validated by middleware (commitReceiptSchema)
    const transaction = await uploadService.commitReceipt(req.body, userId);

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/uploads/statement/commit
 * 
 * Commit verified statement transactions to the database (bulk import).
 * User has reviewed/edited the AI extraction and confirmed all transactions.
 * 
 * @param req - Express request with commit data
 * @param res - Express response
 * @param next - Express next function
 */
export async function commitStatement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    logger.info({
      msg: 'Statement commit request',
      userId,
      previewId: req.body.previewId,
      transactionCount: req.body.transactions?.length || 0,
    });

    // Validated by middleware (commitStatementSchema)
    const result = await uploadService.commitStatement(req.body, userId);

    res.status(200).json({
      success: true,
      data: result,
      message: `Successfully imported ${result.created} transaction(s). ${result.skipped > 0 ? `Skipped ${result.skipped} duplicate(s).` : ''}`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/uploads/previews
 * 
 * List all active (non-expired) previews for the authenticated user.
 * Supports filtering by type (receipt or statement).
 * 
 * @param req - Express request with query params
 * @param res - Express response
 * @param next - Express next function
 */
export async function listPreviews(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const type = req.query.type as 'receipt' | 'statement' | undefined;

    logger.info({
      msg: 'List previews request',
      userId,
      type,
    });

    const previews = await uploadService.listPreviews(userId, type);

    res.status(200).json({
      success: true,
      data: previews,
      count: previews.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/uploads/previews/:id
 * 
 * Get a specific preview by ID.
 * Used for re-editing or reviewing extraction results.
 * 
 * @param req - Express request with preview ID param
 * @param res - Express response
 * @param next - Express next function
 */
export async function getPreview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const previewId = req.params.id;

    if (!previewId) {
      res.status(400).json({
        success: false,
        error: 'Preview ID is required',
      });
      return;
    }

    logger.info({
      msg: 'Get preview request',
      userId,
      previewId,
    });

    const preview = await uploadService.getPreview(previewId, userId);

    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error) {
    next(error);
  }
}
