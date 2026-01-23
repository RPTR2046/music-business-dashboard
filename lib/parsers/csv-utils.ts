/**
 * CSV parsing utilities with security measures
 */

/**
 * Characters that indicate potential formula injection
 * These are dangerous when opened in spreadsheet software
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitize a cell value to prevent formula injection
 * Prefixes dangerous characters with a single quote
 */
export function sanitizeCell(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  // Check if starts with a dangerous character
  if (FORMULA_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    // Prefix with single quote to neutralize formula
    return `'${trimmed}`;
  }

  return trimmed;
}

/**
 * Sanitize all values in a row
 */
export function sanitizeRow(row: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeCell(value);
  }

  return sanitized;
}

/**
 * Parse a CSV string into rows
 * Handles quoted fields and escaped quotes
 */
export function parseCSVString(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }

    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      }
      // Toggle quote mode
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Don't forget the last field
  values.push(current.trim());

  return values;
}

/**
 * Detect the source format based on column headers
 */
export function detectSource(headers: string[]): 'distrokid' | 'bmi' | 'ascap' | 'unknown' {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  // Check for DistroKid signature
  const distrokidSignature = ['sale month', 'store', 'isrc', 'earnings (usd)'];
  if (distrokidSignature.every(col => headerSet.has(col))) {
    return 'distrokid';
  }

  // Check for BMI signature
  const bmiSignature = ['period', 'title name', 'perf source', 'royalty amount'];
  if (bmiSignature.every(col => headerSet.has(col))) {
    return 'bmi';
  }

  // Check for ASCAP signature (to be implemented)
  // const ascapSignature = [...];

  return 'unknown';
}

/**
 * Parse a numeric value safely
 */
export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;

  // Remove any currency symbols, commas, and whitespace
  const cleaned = value.toString().replace(/[$,\s]/g, '').trim();

  if (!cleaned) return 0;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a percentage value (handles both "50" and "50.00" formats)
 */
export function parsePercentage(value: string | undefined | null): number {
  const num = parseNumber(value);
  // If the value is greater than 1, assume it's already a percentage (50 = 50%)
  // Otherwise treat it as a decimal (0.5 = 50%)
  return num > 1 ? num : num * 100;
}

/**
 * Normalize territory codes
 * Converts full country names to ISO 2-letter codes where possible
 */
export function normalizeTerritory(value: string | undefined | null): string | null {
  if (!value) return null;

  const trimmed = value.trim().toUpperCase();

  // Common country name to code mappings
  const countryMap: Record<string, string> = {
    'UNITED STATES': 'US',
    'UNITED KINGDOM': 'GB',
    'GERMANY': 'DE',
    'FRANCE': 'FR',
    'CANADA': 'CA',
    'AUSTRALIA': 'AU',
    'JAPAN': 'JP',
    'BRAZIL': 'BR',
    'MEXICO': 'MX',
    'SPAIN': 'ES',
    'ITALY': 'IT',
    'NETHERLANDS': 'NL',
    'SWEDEN': 'SE',
    'NORWAY': 'NO',
    'DENMARK': 'DK',
    'FINLAND': 'FI',
    'POLAND': 'PL',
    'TAIWAN': 'TW',
    'SOUTH KOREA': 'KR',
    'INDIA': 'IN',
    'INDONESIA': 'ID',
    'PHILIPPINES': 'PH',
    'SINGAPORE': 'SG',
    'NEW ZEALAND': 'NZ',
  };

  // If it's already a 2-letter code, return it
  if (trimmed.length === 2) {
    return trimmed;
  }

  // Try to map full country name
  return countryMap[trimmed] || trimmed;
}
