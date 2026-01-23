/**
 * File upload validation utilities
 */

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/plain', // Some systems report CSV as text/plain
  'application/vnd.ms-excel', // Excel compatibility
];

// Allowed file extensions
export const ALLOWED_EXTENSIONS = ['.csv'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): ValidationResult {
  const errors: string[] = [];

  if (size === 0) {
    errors.push('File is empty');
  } else if (size > MAX_FILE_SIZE) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    errors.push(`File size (${sizeMB}MB) exceeds maximum allowed size (10MB)`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string | null): ValidationResult {
  const errors: string[] = [];

  if (!mimeType) {
    // Be lenient if MIME type is not provided
    return { valid: true, errors: [] };
  }

  const normalizedType = mimeType.toLowerCase().split(';')[0].trim();

  if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
    errors.push(
      `Invalid file type: ${mimeType}. Allowed types: CSV files only`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): ValidationResult {
  const errors: string[] = [];

  if (!filename) {
    errors.push('Filename is required');
    return { valid: false, errors };
  }

  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push(
      `Invalid file extension: ${extension}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate CSV content structure
 * Performs basic validation without full parsing
 */
export function validateCSVStructure(content: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push('File content is empty');
    return { valid: false, errors };
  }

  // Check for at least one newline (header + at least one data row)
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    errors.push('CSV file must contain a header row and at least one data row');
  }

  // Check that the first line has commas (basic CSV structure)
  if (lines.length > 0 && !lines[0].includes(',')) {
    errors.push('File does not appear to be a valid CSV (no commas found in header)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Comprehensive file validation
 */
export function validateUploadFile(
  file: { size: number; type: string | null; name: string },
  content?: string
): ValidationResult {
  const allErrors: string[] = [];

  // Validate file size
  const sizeResult = validateFileSize(file.size);
  allErrors.push(...sizeResult.errors);

  // Validate MIME type
  const mimeResult = validateMimeType(file.type);
  allErrors.push(...mimeResult.errors);

  // Validate extension
  const extResult = validateFileExtension(file.name);
  allErrors.push(...extResult.errors);

  // Validate content structure if provided
  if (content) {
    const structureResult = validateCSVStructure(content);
    allErrors.push(...structureResult.errors);
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}

/**
 * Sanitize filename for storage
 * Removes potentially dangerous characters and normalizes the name
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[/\\]/).pop() || 'upload.csv';

  // Remove or replace dangerous characters
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .replace(/^[._-]+/, '') // Remove leading dots/underscores/hyphens
    .toLowerCase();

  // Ensure it has .csv extension
  if (!sanitized.endsWith('.csv')) {
    return sanitized + '.csv';
  }

  return sanitized || 'upload.csv';
}

/**
 * Generate S3 key for upload
 * Format: uploads/{userId}/{timestamp}_{filename}
 */
export function generateS3Key(userId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = sanitizeFilename(filename);

  return `uploads/${userId}/${timestamp}_${sanitizedFilename}`;
}
