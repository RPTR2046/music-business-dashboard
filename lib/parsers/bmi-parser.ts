/**
 * BMI CSV Parser
 *
 * Parses CSV exports from BMI (Broadcast Music, Inc.) and normalizes them
 * into the unified transaction schema.
 *
 * Expected columns:
 * - PERIOD, W OR P, PARTICIPANT NAME, PARTICIPANT #, IP #
 * - TITLE NAME, TITLE #, PERF SOURCE, COUNTRY OF PERFORMANCE
 * - SHOW NAME, EPISODE NAME, SHOW #, USE CODE, TIMING
 * - PARTICIPANT %, PERF COUNT, BONUS LEVEL, ROYALTY AMOUNT
 * - WITHHOLD, PERF PERIOD, CURRENT ACTIVITY AMT
 * - HITS SONG OR TV NET SUPER USAGE BONUS, STANDARDS OR TV NET THEME BONUS
 * - FOREIGN SOCIETY ADJUSTMENT, COMPANY CODE, COMPANY NAME, PERF DATE
 */

import {
  NormalizedTransaction,
  ParseResult,
  ParseError,
  ParseSummary,
  BMIRow,
} from './types';
import {
  sanitizeRow,
  parseNumber,
  parsePercentage,
  normalizeTerritory,
} from './csv-utils';

/**
 * Parse a BMI CSV and return normalized transactions
 */
export function parseBMI(rows: Record<string, string>[]): ParseResult {
  const transactions: NormalizedTransaction[] = [];
  const errors: ParseError[] = [];
  const trackSet = new Set<string>();
  let totalEarnings = 0;
  let earliest: string | null = null;
  let latest: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2; // +2 because: 1-indexed + header row
    const rawRow = rows[i];

    try {
      // Sanitize the row to prevent formula injection
      const row = sanitizeRow(rawRow) as unknown as BMIRow;

      // Validate required fields
      const titleName = row['TITLE NAME'];
      const period = row['PERIOD'];
      const royaltyAmount = row['ROYALTY AMOUNT'];

      if (!titleName) {
        errors.push({
          row: rowIndex,
          column: 'TITLE NAME',
          message: 'Missing title name',
        });
        continue;
      }

      if (!period) {
        errors.push({
          row: rowIndex,
          column: 'PERIOD',
          message: 'Missing period',
        });
        continue;
      }

      // Parse earnings
      const earningsValue = parseNumber(royaltyAmount);

      // Parse the period (format: YYYYQ where Q is quarter 1-4)
      const reportingPeriod = normalizeBMIPeriod(period);
      if (!reportingPeriod) {
        errors.push({
          row: rowIndex,
          column: 'PERIOD',
          message: `Invalid period format: ${period}`,
          value: period,
        });
        continue;
      }

      // Parse performance date if available
      const reportingDate = parsePerformanceDate(row['PERF DATE'], period);

      // Create normalized transaction
      // BMI = publishing/performance royalties (songwriter share from public performances)
      const transaction: NormalizedTransaction = {
        trackTitle: titleName,
        artistName: row['PARTICIPANT NAME'] || '',
        isrc: null, // BMI doesn't include ISRC
        upc: null,
        earnings: earningsValue,
        quantity: parseNumber(row['PERF COUNT']) || 1,
        platform: normalizeBMIPlatform(row['PERF SOURCE']),
        source: 'bmi',
        incomeType: 'publishing',
        royaltyType: 'performance',
        reportingPeriod,
        reportingDate,
        territory: normalizeTerritory(row['COUNTRY OF PERFORMANCE']),
        usageType: normalizeUsageCode(row['USE CODE']),
        ownershipPercentage: parsePercentage(row['PARTICIPANT %']),
        rawRowIndex: rowIndex,
      };

      transactions.push(transaction);

      // Track statistics
      totalEarnings += earningsValue;
      trackSet.add(`${transaction.trackTitle}|${row['TITLE #'] || ''}`);

      // Update date range
      if (!earliest || reportingPeriod < earliest) {
        earliest = reportingPeriod;
      }
      if (!latest || reportingPeriod > latest) {
        latest = reportingPeriod;
      }
    } catch (error) {
      errors.push({
        row: rowIndex,
        message: `Unexpected error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  const summary: ParseSummary = {
    totalRows: rows.length,
    successfulRows: transactions.length,
    failedRows: errors.length,
    totalEarnings,
    uniqueTracks: trackSet.size,
    dateRange: {
      earliest,
      latest,
    },
  };

  return {
    success: errors.length === 0,
    source: 'bmi',
    transactions,
    errors,
    summary,
  };
}

/**
 * Normalize BMI period format to YYYY-MM
 * BMI uses YYYYQ format (e.g., 20252 = 2025 Q2)
 *
 * Quarter to month mapping:
 * Q1 = January (01)
 * Q2 = April (04)
 * Q3 = July (07)
 * Q4 = October (10)
 */
function normalizeBMIPeriod(period: string): string | null {
  if (!period) return null;

  const trimmed = period.trim();

  // Format: YYYYQ (e.g., 20252 for 2025 Q2)
  const match = trimmed.match(/^(\d{4})(\d)$/);
  if (match) {
    const year = match[1];
    const quarter = parseInt(match[2], 10);

    if (quarter < 1 || quarter > 4) {
      return null;
    }

    // Map quarter to first month of that quarter
    const monthMap: Record<number, string> = {
      1: '01',
      2: '04',
      3: '07',
      4: '10',
    };

    return `${year}-${monthMap[quarter]}`;
  }

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Parse performance date string to Date object
 */
function parsePerformanceDate(perfDate: string, period: string): Date {
  // If we have a specific performance date, use it
  if (perfDate && perfDate.trim()) {
    const trimmed = perfDate.trim();

    // Try various date formats
    // MM/DD/YYYY
    const mmddyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mmddyyyy) {
      return new Date(`${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`);
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(trimmed);
    }
  }

  // Fall back to first day of the period
  const normalizedPeriod = normalizeBMIPeriod(period);
  if (normalizedPeriod) {
    return new Date(`${normalizedPeriod}-01`);
  }

  return new Date();
}

/**
 * Normalize BMI performance source names
 */
function normalizeBMIPlatform(perfSource: string): string {
  if (!perfSource) return 'BMI Performance';

  const trimmed = perfSource.trim().toUpperCase();

  // Map BMI source names to consistent platform names
  const platformMap: Record<string, string> = {
    'SPOTIFY': 'Spotify',
    'APPLE MUSIC': 'Apple Music',
    'AMAZON PRIME': 'Amazon Music',
    'AMAZON UNLTD': 'Amazon Music',
    'AMAZON MUSIC': 'Amazon Music',
    'YOUTUBE': 'YouTube',
    'YOUTUBE MUSIC': 'YouTube Music',
    'PANDORA': 'Pandora',
    'DEEZER': 'Deezer',
    'TIDAL': 'Tidal',
    'SOUNDCLOUD': 'SoundCloud',
    'COMM RADIO': 'Commercial Radio',
    'RADIO': 'Radio',
    'TV': 'Television',
    'CABLE': 'Cable TV',
    'LIVE': 'Live Performance',
    'BACKGROUND': 'Background Music',
    'INTERNET': 'Internet Streaming',
  };

  // Check for exact match
  if (platformMap[trimmed]) {
    return platformMap[trimmed];
  }

  // Check for partial match
  for (const [key, value] of Object.entries(platformMap)) {
    if (trimmed.includes(key)) {
      return value;
    }
  }

  // Return original with title casing
  return perfSource.trim().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize BMI use codes to human-readable usage types
 */
function normalizeUsageCode(useCode: string): string | null {
  if (!useCode) return null;

  const trimmed = useCode.trim().toUpperCase();

  // BMI use code mappings
  const useCodeMap: Record<string, string> = {
    'FF': 'Feature Film',
    'BM': 'Background Music',
    'TH': 'Theme',
    'JI': 'Jingle',
    'PR': 'Promotional',
    'LD': 'Live Dance',
    'LV': 'Live Vocal',
    'SD': 'Standard',
    'VS': 'Visual',
    'AU': 'Audio',
    'RA': 'Radio',
    'TV': 'Television',
    'IN': 'Internet',
    'MO': 'Mobile',
  };

  return useCodeMap[trimmed] || useCode.trim();
}
