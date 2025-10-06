/**
 * Gemini AI Utility
 * 
 * Provides a centralized interface for interacting with Google Gemini AI via @google/genai SDK.
 * Handles file uploads to Gemini File API, structured content extraction, and resource cleanup.
 * 
 * Key Features:
 * - File Upload: Upload images, PDFs to Gemini with automatic processing status tracking
 * - Structured Extraction: Generate content with JSON schema enforcement
 * - Resource Management: Automatic file cleanup after processing
 * - Error Handling: Graceful fallback between models, detailed error messages
 * 
 * @module utils/gemini
 */

import { GoogleGenAI, createPartFromUri } from '@google/genai';
import type { File as GeminiFile } from '@google/genai';
import { config } from '../config';
import { logger } from './logger';

// Singleton instance for Gemini client
let aiInstance: GoogleGenAI | null = null;

/**
 * Maximum retries for file processing status check
 */
const MAX_PROCESSING_RETRIES = 20;

/**
 * Delay between processing status checks (milliseconds)
 */
const PROCESSING_CHECK_DELAY = 3000;

/**
 * Get or create the Gemini client instance (singleton pattern)
 * 
 * @returns {GoogleGenAI} Initialized Gemini client
 */
export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    aiInstance = new GoogleGenAI({
      apiKey: config.geminiApiKey,
      vertexai: false, // Use Gemini Developer API (not Vertex AI)
    });

    logger.info('Gemini AI client initialized');
  }

  return aiInstance;
}

/**
 * Upload a file to Gemini File API and wait for processing completion
 * 
 * Supports both file paths (Node.js) and Blobs (browser).
 * Automatically polls for processing status and throws if processing fails.
 * 
 * @param {string | Blob} file - File path or Blob object
 * @param {string} mimeType - MIME type (e.g., 'image/jpeg', 'application/pdf')
 * @param {string} [displayName] - Optional display name for the file
 * @returns {Promise<GeminiFile>} Uploaded and processed file metadata
 * @throws {Error} If file processing fails or times out
 * 
 * @example
 * const file = await uploadFileToGemini('/path/to/receipt.jpg', 'image/jpeg', 'receipt');
 * console.log(file.uri); // https://generativelanguage.googleapis.com/v1beta/files/...
 */
export async function uploadFileToGemini(
  file: string | Blob,
  mimeType: string,
  displayName?: string
): Promise<GeminiFile> {
  const ai = getGeminiClient();

  logger.info({
    msg: 'Uploading file to Gemini',
    mimeType,
    displayName,
    fileType: typeof file,
  });

  try {
    // Upload file
    const uploadedFile = await ai.files.upload({
      file,
      config: {
        mimeType,
        displayName: displayName || `upload-${Date.now()}`,
      },
    });

    logger.info({
      msg: 'File uploaded successfully',
      fileName: uploadedFile.name,
      state: uploadedFile.state,
    });

    // Wait for processing to complete
    let fileStatus = await ai.files.get({ name: uploadedFile.name! });
    let retries = 0;

    while (fileStatus.state === 'PROCESSING' && retries < MAX_PROCESSING_RETRIES) {
      logger.debug({
        msg: 'File still processing',
        fileName: fileStatus.name,
        retry: retries + 1,
      });

      await new Promise((resolve) => setTimeout(resolve, PROCESSING_CHECK_DELAY));

      fileStatus = await ai.files.get({ name: uploadedFile.name! });
      retries++;
    }

    // Check final state
    if (fileStatus.state === 'FAILED') {
      logger.error({
        msg: 'File processing failed',
        fileName: fileStatus.name,
        error: fileStatus.error,
      });
      throw new Error(`File processing failed: ${fileStatus.error?.message || 'Unknown error'}`);
    }

    if (fileStatus.state === 'PROCESSING') {
      logger.warn({
        msg: 'File processing timeout',
        fileName: fileStatus.name,
        retries,
      });
      throw new Error('File processing timeout after maximum retries');
    }

    logger.info({
      msg: 'File processed successfully',
      fileName: fileStatus.name,
      state: fileStatus.state,
      uri: fileStatus.uri,
    });

    return fileStatus;
  } catch (error) {
    logger.error({
      msg: 'Error uploading file to Gemini',
      error: error instanceof Error ? error.message : String(error),
      mimeType,
    });
    throw error;
  }
}

/**
 * Extract structured data from a file using Gemini Vision/multimodal models
 * 
 * Sends the file URI + prompt to Gemini with JSON schema enforcement.
 * Automatically parses the response and validates against expected type.
 * 
 * @template T - Expected response type (must match responseSchema)
 * @param {string} fileUri - Gemini file URI (from uploadFileToGemini)
 * @param {string} fileMimeType - File MIME type
 * @param {string} prompt - Extraction prompt (be specific!)
 * @param {any} responseSchema - JSON Schema defining expected output structure
 * @param {string} [model] - Gemini model to use (defaults to config)
 * @returns {Promise<T>} Extracted structured data
 * @throws {Error} If generation fails or response is empty
 * 
 * @example
 * const receipt = await extractWithGemini<ReceiptData>(
 *   file.uri!,
 *   'image/jpeg',
 *   'Extract merchant, date, amount from this receipt.',
 *   {
 *     type: 'object',
 *     properties: {
 *       merchant: { type: 'string' },
 *       date: { type: 'string' },
 *       amount: { type: 'number' }
 *     },
 *     required: ['merchant', 'date', 'amount']
 *   }
 * );
 */
export async function extractWithGemini<T>(
  fileUri: string,
  fileMimeType: string,
  prompt: string,
  responseSchema: any,
  model?: string
): Promise<T> {
  const ai = getGeminiClient();
  const modelToUse = model || config.geminiDefaultModel;

  logger.info({
    msg: 'Extracting data with Gemini',
    model: modelToUse,
    fileUri,
    promptLength: prompt.length,
  });

  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: [createPartFromUri(fileUri, fileMimeType), prompt],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      logger.error({
        msg: 'Empty response from Gemini',
        response,
      });
      throw new Error('Empty response from Gemini');
    }

    logger.info({
      msg: 'Successfully extracted data',
      responseLength: text.length,
    });

    return JSON.parse(text) as T;
  } catch (error) {
    logger.error({
      msg: 'Error extracting data with Gemini',
      error: error instanceof Error ? error.message : String(error),
      model: modelToUse,
    });

    // Try fallback model if primary fails
    if (model !== config.geminiFallbackModel && config.geminiFallbackModel !== modelToUse) {
      logger.info({
        msg: 'Retrying with fallback model',
        fallbackModel: config.geminiFallbackModel,
      });

      return extractWithGemini<T>(fileUri, fileMimeType, prompt, responseSchema, config.geminiFallbackModel);
    }

    throw error;
  }
}

/**
 * Delete a file from Gemini File API (cleanup after processing)
 * 
 * Best practice: Always delete files after extraction to avoid storage costs.
 * Fails silently if file doesn't exist or deletion fails (logs warning).
 * 
 * @param {string} fileName - File name (from file.name property)
 * @returns {Promise<void>}
 * 
 * @example
 * await deleteGeminiFile(file.name!);
 */
export async function deleteGeminiFile(fileName: string): Promise<void> {
  const ai = getGeminiClient();

  try {
    await ai.files.delete({ name: fileName });
    logger.info({
      msg: 'File deleted from Gemini',
      fileName,
    });
  } catch (error) {
    // Non-critical error - log and continue
    logger.warn({
      msg: 'Failed to delete file from Gemini',
      fileName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * List all files currently stored in Gemini File API
 * 
 * Useful for debugging and cleanup. Files expire automatically after 48 hours.
 * 
 * @param {number} [pageSize=10] - Number of files to retrieve
 * @returns {Promise<GeminiFile[]>} Array of file metadata
 * 
 * @example
 * const files = await listGeminiFiles();
 * console.log(`Found ${files.length} files`);
 */
export async function listGeminiFiles(pageSize: number = 10): Promise<GeminiFile[]> {
  const ai = getGeminiClient();

  try {
    const pager = await ai.files.list({ config: { pageSize } });
    const files: GeminiFile[] = [];

    for (const file of pager.page) {
      files.push(file);
    }

    logger.info({
      msg: 'Listed Gemini files',
      count: files.length,
    });

    return files;
  } catch (error) {
    logger.error({
      msg: 'Error listing Gemini files',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Upload, extract, and cleanup in one operation (convenience wrapper)
 * 
 * This is the recommended high-level API for most use cases.
 * Automatically handles the full lifecycle: upload → extract → delete.
 * 
 * @template T - Expected extraction result type
 * @param {string | Blob} file - File to process
 * @param {string} mimeType - File MIME type
 * @param {string} prompt - Extraction prompt
 * @param {any} responseSchema - JSON Schema for structured output
 * @param {string} [displayName] - Optional file display name
 * @param {string} [model] - Optional model override
 * @returns {Promise<T>} Extracted structured data
 * @throws {Error} If any step fails
 * 
 * @example
 * const receipt = await uploadAndExtract<ReceiptData>(
 *   filePath,
 *   'image/jpeg',
 *   'Extract transaction details',
 *   receiptSchema
 * );
 */
export async function uploadAndExtract<T>(
  file: string | Blob,
  mimeType: string,
  prompt: string,
  responseSchema: any,
  displayName?: string,
  model?: string
): Promise<T> {
  let geminiFile: GeminiFile | null = null;

  try {
    // Step 1: Upload
    geminiFile = await uploadFileToGemini(file, mimeType, displayName);

    // Step 2: Extract
    const result = await extractWithGemini<T>(
      geminiFile.uri!,
      geminiFile.mimeType!,
      prompt,
      responseSchema,
      model
    );

    return result;
  } finally {
    // Step 3: Cleanup (always runs, even on error)
    if (geminiFile?.name) {
      await deleteGeminiFile(geminiFile.name);
    }
  }
}
