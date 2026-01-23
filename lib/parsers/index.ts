/**
 * CSV Parser Service
 *
 * Main entry point for parsing royalty CSV files from various sources.
 * Auto-detects the source format and routes to the appropriate parser.
 */

import { ParseResult, NormalizedTransaction, ParseError } from './types';
import { parseCSVString, detectSource } from './csv-utils';
import { parseDistroKid } from './distrokid-parser';
import { parseBMI } from './bmi-parser';

export * from './types';
export { sanitizeRow, parseCSVString, detectSource } from './csv-utils';
export { parseDistroKid } from './distrokid-parser';
export { parseBMI } from './bmi-parser';

/**
 * Parse a CSV file content and return normalized transactions
 * Auto-detects the source format based on column headers
 */
export function parseCSV(content: string): ParseResult {
  // Validate content
  if (!content || typeof content !== 'string') {
    return {
      success: false,
      source: 'unknown',
      transactions: [],
      errors: [{ row: 0, message: 'Empty or invalid file content' }],
      summary: {
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        totalEarnings: 0,
        uniqueTracks: 0,
        dateRange: { earliest: null, latest: null },
      },
    };
  }

  // Parse CSV content
  const { headers, rows } = parseCSVString(content);

  if (headers.length === 0) {
    return {
      success: false,
      source: 'unknown',
      transactions: [],
      errors: [{ row: 0, message: 'No headers found in CSV file' }],
      summary: {
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        totalEarnings: 0,
        uniqueTracks: 0,
        dateRange: { earliest: null, latest: null },
      },
    };
  }

  if (rows.length === 0) {
    return {
      success: false,
      source: 'unknown',
      transactions: [],
      errors: [{ row: 0, message: 'No data rows found in CSV file' }],
      summary: {
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        totalEarnings: 0,
        uniqueTracks: 0,
        dateRange: { earliest: null, latest: null },
      },
    };
  }

  // Detect source format
  const source = detectSource(headers);

  if (source === 'unknown') {
    return {
      success: false,
      source: 'unknown',
      transactions: [],
      errors: [{
        row: 0,
        message: 'Unable to detect CSV format. Supported formats: DistroKid, BMI, ASCAP',
      }],
      summary: {
        totalRows: rows.length,
        successfulRows: 0,
        failedRows: rows.length,
        totalEarnings: 0,
        uniqueTracks: 0,
        dateRange: { earliest: null, latest: null },
      },
    };
  }

  // Route to appropriate parser
  switch (source) {
    case 'distrokid':
      return parseDistroKid(rows);
    case 'bmi':
      return parseBMI(rows);
    case 'ascap':
      return {
        success: false,
        source: 'ascap',
        transactions: [],
        errors: [{ row: 0, message: 'ASCAP parser not yet implemented' }],
        summary: {
          totalRows: rows.length,
          successfulRows: 0,
          failedRows: rows.length,
          totalEarnings: 0,
          uniqueTracks: 0,
          dateRange: { earliest: null, latest: null },
        },
      };
    default:
      return {
        success: false,
        source: 'unknown',
        transactions: [],
        errors: [{ row: 0, message: `Unknown source format: ${source}` }],
        summary: {
          totalRows: rows.length,
          successfulRows: 0,
          failedRows: rows.length,
          totalEarnings: 0,
          uniqueTracks: 0,
          dateRange: { earliest: null, latest: null },
        },
      };
  }
}

/**
 * Validate a CSV file before full parsing
 * Returns quick feedback on file validity without full processing
 */
export function validateCSV(content: string): {
  valid: boolean;
  source: 'distrokid' | 'bmi' | 'ascap' | 'unknown';
  rowCount: number;
  errors: string[];
} {
  const errors: string[] = [];

  if (!content || typeof content !== 'string') {
    return { valid: false, source: 'unknown', rowCount: 0, errors: ['Empty or invalid file'] };
  }

  const { headers, rows } = parseCSVString(content);

  if (headers.length === 0) {
    errors.push('No headers found');
    return { valid: false, source: 'unknown', rowCount: 0, errors };
  }

  const source = detectSource(headers);

  if (source === 'unknown') {
    errors.push('Unrecognized CSV format. Expected DistroKid, BMI, or ASCAP format.');
  }

  return {
    valid: errors.length === 0,
    source,
    rowCount: rows.length,
    errors,
  };
}

/**
 * Get a preview of the parsed data (first N rows)
 * Useful for showing a sample in the UI before full commit
 */
export function previewCSV(content: string, maxRows: number = 10): {
  source: 'distrokid' | 'bmi' | 'ascap' | 'unknown';
  preview: NormalizedTransaction[];
  totalRows: number;
  errors: ParseError[];
} {
  const result = parseCSV(content);

  return {
    source: result.source,
    preview: result.transactions.slice(0, maxRows),
    totalRows: result.summary.totalRows,
    errors: result.errors.slice(0, 10), // Limit errors shown in preview
  };
}
