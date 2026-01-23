import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCSV, detectSource, parseCSVString, NormalizedTransaction } from '../../lib/parsers';
import {
  validateUploadFile,
  validateFileSize,
  validateMimeType,
  validateCSVStructure,
  sanitizeFilename,
  generateS3Key,
} from '../../lib/upload/validation';
import { matchTransactionsToSongs, Song } from '../../lib/matching';

const fixturesDir = path.join(__dirname, '../fixtures');

interface CatalogSong {
  title: string;
  artist_name: string;
  isrc: string | null;
}

// Test song catalog
const catalogData: { songs: CatalogSong[] } = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'test-song-catalog.json'), 'utf-8')
);

const testSongs: Song[] = catalogData.songs.map((s: CatalogSong, index: number) => ({
  id: `song-${index + 1}`,
  title: s.title,
  artist_name: s.artist_name,
  isrc: s.isrc,
}));

/**
 * These integration tests simulate the complete upload flow:
 * 1. File validation
 * 2. CSV parsing
 * 3. Song matching
 * 4. Duplicate detection (within file)
 *
 * Note: S3 upload and database operations are not tested here
 * as they require actual AWS/Supabase connections.
 */

describe('Upload Flow Integration', () => {
  describe('Happy Path - DistroKid File', () => {
    const filename = 'distrokid-valid.csv';
    let fileContent: string;

    beforeEach(() => {
      fileContent = fs.readFileSync(
        path.join(fixturesDir, filename),
        'utf-8'
      );
    });

    it('should complete full validation -> parse -> match flow', () => {
      // Step 1: File validation
      const validationResult = validateUploadFile(
        {
          size: fileContent.length,
          type: 'text/csv',
          name: filename,
        },
        fileContent
      );
      expect(validationResult.valid).toBe(true);

      // Step 2: Format detection
      const { headers } = parseCSVString(fileContent);
      const format = detectSource(headers);
      expect(format).toBe('distrokid');

      // Step 3: Parse CSV
      const parseResult = parseCSV(fileContent);
      expect(parseResult.errors.length).toBe(0);
      expect(parseResult.transactions.length).toBeGreaterThan(0);

      // Step 4: Song matching
      const matchResult = matchTransactionsToSongs(
        parseResult.transactions,
        testSongs
      );
      expect(matchResult.total).toBe(parseResult.transactions.length);

      // Step 5: Verify summary data
      expect(parseResult.summary.totalRows).toBe(
        parseResult.transactions.length
      );
      expect(parseResult.summary.totalEarnings).toBeGreaterThan(0);
    });

    it('should generate valid S3 key for upload', () => {
      const userId = 'user-test-123';
      const s3Key = generateS3Key(userId, filename);

      expect(s3Key).toMatch(/^uploads\/user-test-123\/\d+_distrokid-valid\.csv$/);
    });

    it('should sanitize filename for storage', () => {
      const sanitized = sanitizeFilename('My Report (Jan 2024).CSV');
      expect(sanitized).toMatch(/^my_report_jan_2024_\.csv$/);
    });
  });

  describe('Happy Path - BMI File', () => {
    const filename = 'bmi-valid.csv';
    let fileContent: string;

    beforeEach(() => {
      fileContent = fs.readFileSync(
        path.join(fixturesDir, filename),
        'utf-8'
      );
    });

    it('should detect and parse BMI format', () => {
      // Step 1: Format detection
      const { headers } = parseCSVString(fileContent);
      const format = detectSource(headers);
      expect(format).toBe('bmi');

      // Step 2: Parse CSV
      const parseResult = parseCSV(fileContent);
      expect(parseResult.errors.length).toBe(0);
      expect(parseResult.transactions.length).toBeGreaterThan(0);

      // Step 3: Verify normalized data
      const firstTx = parseResult.transactions[0];
      expect(firstTx.platform).toBeDefined();
      expect(firstTx.earnings).toBeGreaterThan(0);
      expect(firstTx.reportingPeriod).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('Error Handling - Invalid Files', () => {
    it('should reject oversized files', () => {
      const result = validateFileSize(15 * 1024 * 1024); // 15MB
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds');
    });

    it('should reject wrong file types', () => {
      const result = validateUploadFile({
        size: 1000,
        type: 'application/pdf',
        name: 'report.pdf',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject empty files', () => {
      const result = validateUploadFile(
        {
          size: 0,
          type: 'text/csv',
          name: 'empty.csv',
        },
        ''
      );
      expect(result.valid).toBe(false);
    });

    it('should handle malformed CSV gracefully', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-malformed.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);

      // Should not throw
      expect(parseResult).toBeDefined();

      // Should report errors or have fewer transactions
      // Either errors are reported or rows are skipped
      expect(
        parseResult.errors.length > 0 ||
          parseResult.transactions.length < 10
      ).toBe(true);
    });

    it('should reject unknown CSV format', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'unknown-format.csv'),
        'utf-8'
      );

      const { headers } = parseCSVString(content);
      const format = detectSource(headers);
      expect(format).toBe('unknown');

      // Parsing unknown format should still work but may have issues
      const parseResult = parseCSV(content);
      expect(parseResult).toBeDefined();
    });
  });

  describe('Security - Formula Injection', () => {
    it('should sanitize malicious content during upload flow', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-formula-injection.csv'),
        'utf-8'
      );

      // File validation should pass (it's a valid CSV)
      const validationResult = validateUploadFile(
        {
          size: content.length,
          type: 'text/csv',
          name: 'data.csv',
        },
        content
      );
      expect(validationResult.valid).toBe(true);

      // Parsing should sanitize dangerous values
      const parseResult = parseCSV(content);
      expect(parseResult.transactions.length).toBeGreaterThan(0);

      // Check that formula prefixes are sanitized
      const dangerousTx = parseResult.transactions.find(
        (tx) =>
          tx.trackTitle.includes('=') || tx.artistName.includes('=')
      );

      if (dangerousTx) {
        // If we found a transaction with = in it, it should be quoted
        const hasFormula =
          dangerousTx.trackTitle.startsWith('=') ||
          dangerousTx.artistName.startsWith('=');
        expect(hasFormula).toBe(false);
      }
    });
  });

  describe('Duplicate Detection Within Upload', () => {
    it('should identify duplicates in file with duplicate rows', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-duplicates.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);

      // File has 7 rows with duplicates
      expect(parseResult.transactions.length).toBe(7);

      // Implement duplicate detection logic
      const seen = new Set<string>();
      let duplicateCount = 0;

      for (const tx of parseResult.transactions) {
        const key = `${tx.reportingPeriod}|${tx.trackTitle}|${tx.platform}|${tx.earnings}`;
        if (seen.has(key)) {
          duplicateCount++;
        } else {
          seen.add(key);
        }
      }

      // Should have duplicates
      expect(duplicateCount).toBeGreaterThan(0);
    });
  });

  describe('Song Matching Integration', () => {
    it('should match catalog songs from parsed transactions', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);
      const matchResult = matchTransactionsToSongs(
        parseResult.transactions,
        testSongs
      );

      // Summary should be consistent
      expect(matchResult.total).toBe(parseResult.transactions.length);
      expect(
        matchResult.matchedByIsrc +
          matchResult.matchedByTitle +
          matchResult.unmatched
      ).toBe(matchResult.total);

      // Should have some matches (our test data is designed to match)
      expect(matchResult.matchedByIsrc + matchResult.matchedByTitle).toBeGreaterThan(0);
    });

    it('should provide actionable unmatched suggestions', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-matching-test.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);
      const matchResult = matchTransactionsToSongs(
        parseResult.transactions,
        testSongs
      );

      // Should have some unmatched
      expect(matchResult.unmatched).toBeGreaterThan(0);

      // Each unmatched result should have transaction data
      const unmatchedResults = matchResult.results.filter(
        (r) => r.matchedSong === null
      );

      unmatchedResults.forEach((result) => {
        expect(result.transaction.trackTitle).toBeDefined();
        expect(result.transaction.artistName).toBeDefined();
        expect(result.matchType).toBeNull();
        expect(result.matchConfidence).toBe(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty CSV (headers only)', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-empty.csv'),
        'utf-8'
      );

      // Validation should fail for headers-only file
      const validationResult = validateCSVStructure(content);
      expect(validationResult.valid).toBe(false);
    });

    it('should handle special characters in data', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-special-chars.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);

      // Should parse without throwing
      expect(parseResult).toBeDefined();

      // Should have some transactions
      expect(parseResult.transactions.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined MIME types gracefully', () => {
      const result = validateMimeType(null);
      // Should be lenient with null MIME type
      expect(result.valid).toBe(true);
    });
  });

  describe('Data Integrity Checks', () => {
    it('should preserve earnings precision', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);

      // Check that earnings are numbers with reasonable precision
      parseResult.transactions.forEach((tx) => {
        expect(typeof tx.earnings).toBe('number');
        expect(isNaN(tx.earnings)).toBe(false);
      });

      // Sum should match summary
      const calculatedSum = parseResult.transactions.reduce(
        (sum, tx) => sum + tx.earnings,
        0
      );

      // Allow small floating point differences
      expect(calculatedSum).toBeCloseTo(
        parseResult.summary.totalEarnings,
        2
      );
    });

    it('should normalize reporting periods consistently', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);

      // All reporting periods should be in YYYY-MM format
      parseResult.transactions.forEach((tx) => {
        expect(tx.reportingPeriod).toMatch(/^\d{4}-\d{2}$/);
      });
    });

    it('should have valid reporting dates', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );

      const parseResult = parseCSV(content);

      parseResult.transactions.forEach((tx) => {
        expect(tx.reportingDate).toBeInstanceOf(Date);
        expect(isNaN(tx.reportingDate.getTime())).toBe(false);
      });
    });
  });

  describe('Batch Processing Simulation', () => {
    it('should handle processing multiple files in sequence', () => {
      const files = ['distrokid-valid.csv', 'bmi-valid.csv'];
      const allTransactions: NormalizedTransaction[] = [];

      for (const filename of files) {
        const content = fs.readFileSync(
          path.join(fixturesDir, filename),
          'utf-8'
        );

        const parseResult = parseCSV(content);
        allTransactions.push(...parseResult.transactions);
      }

      // Should accumulate transactions from both files
      expect(allTransactions.length).toBeGreaterThan(30);

      // All should have required fields
      allTransactions.forEach((tx) => {
        expect(tx.trackTitle).toBeDefined();
        expect(tx.platform).toBeDefined();
        expect(tx.earnings).toBeDefined();
      });
    });
  });
});
