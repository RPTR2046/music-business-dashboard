/**
 * Unified transaction schema that all CSV formats normalize to
 */
export interface NormalizedTransaction {
  // Track identification
  trackTitle: string;
  artistName: string;
  isrc: string | null;
  upc: string | null;

  // Revenue data
  earnings: number;
  quantity: number;

  // Source information
  platform: string;
  source: 'distrokid' | 'bmi' | 'ascap';

  // Time period
  reportingPeriod: string; // YYYY-MM format
  reportingDate: Date;

  // Territory
  territory: string | null;

  // Usage type
  usageType: string | null;

  // Ownership
  ownershipPercentage: number;

  // Raw data reference (for debugging/audit)
  rawRowIndex: number;
}

/**
 * Result of parsing a CSV file
 */
export interface ParseResult {
  success: boolean;
  source: 'distrokid' | 'bmi' | 'ascap' | 'unknown';
  transactions: NormalizedTransaction[];
  errors: ParseError[];
  summary: ParseSummary;
}

/**
 * Error during parsing
 */
export interface ParseError {
  row: number;
  column?: string;
  message: string;
  value?: string;
}

/**
 * Summary statistics from parsing
 */
export interface ParseSummary {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  totalEarnings: number;
  uniqueTracks: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

/**
 * DistroKid CSV row structure
 */
export interface DistroKidRow {
  'Date Inserted': string;
  'Reporting Date': string;
  'Sale Month': string;
  'Store': string;
  'Artist': string;
  'Title': string;
  'ISRC': string;
  'UPC': string;
  'Quantity': string;
  'Team Percentage': string;
  'Source Type': string;
  'Country of Sale': string;
  'Songwriter Royalties Withheld (USD)': string;
  'Earnings (USD)': string;
  'Recoup (USD)': string;
}

/**
 * BMI CSV row structure
 */
export interface BMIRow {
  'PERIOD': string;
  'W OR P': string;
  'PARTICIPANT NAME': string;
  'PARTICIPANT #': string;
  'IP #': string;
  'TITLE NAME': string;
  'TITLE #': string;
  'PERF SOURCE': string;
  'COUNTRY OF PERFORMANCE': string;
  'SHOW NAME': string;
  'EPISODE NAME': string;
  'SHOW #': string;
  'USE CODE': string;
  'TIMING': string;
  'PARTICIPANT %': string;
  'PERF COUNT': string;
  'BONUS LEVEL': string;
  'ROYALTY AMOUNT': string;
  'WITHHOLD': string;
  'PERF PERIOD': string;
  'CURRENT ACTIVITY AMT': string;
  'HITS SONG OR TV NET SUPER USAGE BONUS': string;
  'STANDARDS OR TV NET THEME BONUS': string;
  'FOREIGN SOCIETY ADJUSTMENT': string;
  'COMPANY CODE': string;
  'COMPANY NAME': string;
  'PERF DATE': string;
}

/**
 * Column signatures for auto-detection
 */
export const DISTROKID_SIGNATURE_COLUMNS = [
  'Sale Month',
  'Store',
  'ISRC',
  'Earnings (USD)',
];

export const BMI_SIGNATURE_COLUMNS = [
  'PERIOD',
  'TITLE NAME',
  'PERF SOURCE',
  'ROYALTY AMOUNT',
];

export const ASCAP_SIGNATURE_COLUMNS = [
  // To be defined when sample is available
];
