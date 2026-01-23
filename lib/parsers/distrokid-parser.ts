/**
 * DistroKid CSV Parser
 *
 * Parses CSV exports from DistroKid and normalizes them into the unified transaction schema.
 *
 * Expected columns:
 * - Date Inserted, Reporting Date, Sale Month, Store, Artist, Title
 * - ISRC, UPC, Quantity, Team Percentage, Source Type, Country of Sale
 * - Songwriter Royalties Withheld (USD), Earnings (USD), Recoup (USD)
 */

import {
  NormalizedTransaction,
  ParseResult,
  ParseError,
  ParseSummary,
  DistroKidRow,
} from './types';
import {
  sanitizeRow,
  parseNumber,
  parsePercentage,
  normalizeTerritory,
} from './csv-utils';

/**
 * Parse a DistroKid CSV and return normalized transactions
 */
export function parseDistroKid(rows: Record<string, string>[]): ParseResult {
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
      const row = sanitizeRow(rawRow) as unknown as DistroKidRow;

      // Validate required fields
      const title = row['Title'];
      const saleMonth = row['Sale Month'];
      const earnings = row['Earnings (USD)'];

      if (!title) {
        errors.push({
          row: rowIndex,
          column: 'Title',
          message: 'Missing track title',
        });
        continue;
      }

      if (!saleMonth) {
        errors.push({
          row: rowIndex,
          column: 'Sale Month',
          message: 'Missing sale month',
        });
        continue;
      }

      // Parse earnings
      const earningsValue = parseNumber(earnings);

      // Parse the sale month (format: YYYY-MM)
      const reportingPeriod = normalizeSaleMonth(saleMonth);
      if (!reportingPeriod) {
        errors.push({
          row: rowIndex,
          column: 'Sale Month',
          message: `Invalid sale month format: ${saleMonth}`,
          value: saleMonth,
        });
        continue;
      }

      // Parse reporting date
      const reportingDate = parseReportingDate(row['Reporting Date']);

      // Create normalized transaction
      // DistroKid = master/recording royalties (artist share from streaming/sales)
      const transaction: NormalizedTransaction = {
        trackTitle: title,
        artistName: row['Artist'] || '',
        isrc: row['ISRC'] || null,
        upc: row['UPC'] || null,
        earnings: earningsValue,
        quantity: parseNumber(row['Quantity']) || 1,
        platform: normalizePlatform(row['Store']),
        source: 'distrokid',
        incomeType: 'master',
        royaltyType: 'recording',
        reportingPeriod,
        reportingDate,
        territory: normalizeTerritory(row['Country of Sale']),
        usageType: normalizeUsageType(row['Source Type']),
        ownershipPercentage: parsePercentage(row['Team Percentage']),
        rawRowIndex: rowIndex,
      };

      transactions.push(transaction);

      // Track statistics
      totalEarnings += earningsValue;
      trackSet.add(`${transaction.trackTitle}|${transaction.isrc || ''}`);

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
    source: 'distrokid',
    transactions,
    errors,
    summary,
  };
}

/**
 * Normalize the Sale Month field to YYYY-MM format
 * DistroKid uses YYYY-MM format already
 */
function normalizeSaleMonth(saleMonth: string): string | null {
  if (!saleMonth) return null;

  const trimmed = saleMonth.trim();

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try to parse other formats
  // MM/YYYY
  const mmYYYY = trimmed.match(/^(\d{2})\/(\d{4})$/);
  if (mmYYYY) {
    return `${mmYYYY[2]}-${mmYYYY[1]}`;
  }

  // YYYY/MM
  const yyyyMM = trimmed.match(/^(\d{4})\/(\d{2})$/);
  if (yyyyMM) {
    return `${yyyyMM[1]}-${yyyyMM[2]}`;
  }

  return null;
}

/**
 * Parse the reporting date string to a Date object
 */
function parseReportingDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  const trimmed = dateStr.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  // Try MM/DD/YYYY
  const mmddyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mmddyyyy) {
    return new Date(`${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`);
  }

  return new Date();
}

/**
 * Normalize platform/store names for consistency
 */
function normalizePlatform(store: string): string {
  if (!store) return 'Unknown';

  const trimmed = store.trim().toLowerCase();

  // Map common variations to consistent names
  const platformMap: Record<string, string> = {
    'spotify': 'Spotify',
    'apple music': 'Apple Music',
    'apple': 'Apple Music',
    'itunes': 'iTunes',
    'amazon music': 'Amazon Music',
    'amazon': 'Amazon Music',
    'amazon unltd': 'Amazon Music',
    'amazon prime': 'Amazon Music',
    'youtube music': 'YouTube Music',
    'youtube': 'YouTube',
    'tiktok': 'TikTok',
    'tiktok (social media pack)': 'TikTok',
    'deezer': 'Deezer',
    'tidal': 'Tidal',
    'pandora': 'Pandora',
    'kkbox': 'KKBOX',
    'soundcloud': 'SoundCloud',
    'facebook': 'Facebook',
    'instagram': 'Instagram',
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

  // Return original with proper casing
  return store.trim();
}

/**
 * Normalize usage type
 */
function normalizeUsageType(sourceType: string): string | null {
  if (!sourceType) return null;

  const trimmed = sourceType.trim().toLowerCase();

  const usageMap: Record<string, string> = {
    'song': 'Streaming',
    'album': 'Album',
    'video': 'Video',
    'ringtone': 'Ringtone',
    'download': 'Download',
  };

  return usageMap[trimmed] || sourceType.trim();
}
