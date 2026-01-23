import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { validateCSV, parseCSV } from '../../lib/parsers';
import { detectSource } from '../../lib/parsers/csv-utils';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('Format Detection', () => {
  describe('DistroKid Detection', () => {
    it('should detect DistroKid format from headers', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const validation = validateCSV(content);

      expect(validation.source).toBe('distrokid');
      expect(validation.valid).toBe(true);
    });

    it('should detect DistroKid from signature columns', () => {
      const headers = ['Sale Month', 'Store', 'ISRC', 'Earnings (USD)', 'Artist', 'Title'];
      const source = detectSource(headers);

      expect(source).toBe('distrokid');
    });

    it('should handle case-insensitive header detection', () => {
      const headers = ['SALE MONTH', 'STORE', 'ISRC', 'EARNINGS (USD)'];
      const source = detectSource(headers);

      expect(source).toBe('distrokid');
    });
  });

  describe('BMI Detection', () => {
    it('should detect BMI format from headers', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const validation = validateCSV(content);

      expect(validation.source).toBe('bmi');
      expect(validation.valid).toBe(true);
    });

    it('should detect BMI from signature columns', () => {
      const headers = ['PERIOD', 'TITLE NAME', 'PERF SOURCE', 'ROYALTY AMOUNT'];
      const source = detectSource(headers);

      expect(source).toBe('bmi');
    });
  });

  describe('Unknown Format Handling', () => {
    it('should return unknown for unrecognized format', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'unknown-format.csv'), 'utf-8');
      const validation = validateCSV(content);

      expect(validation.source).toBe('unknown');
      expect(validation.valid).toBe(false);
    });

    it('should return unknown for random headers', () => {
      const headers = ['id', 'name', 'value', 'date'];
      const source = detectSource(headers);

      expect(source).toBe('unknown');
    });

    it('should reject unknown format in parseCSV', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'unknown-format.csv'), 'utf-8');
      const result = parseCSV(content);

      expect(result.success).toBe(false);
      expect(result.source).toBe('unknown');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty header array', () => {
      const source = detectSource([]);
      expect(source).toBe('unknown');
    });

    it('should handle partial DistroKid headers', () => {
      // Missing some signature columns
      const headers = ['Sale Month', 'Store'];
      const source = detectSource(headers);

      expect(source).toBe('unknown');
    });

    it('should handle partial BMI headers', () => {
      // Missing some signature columns
      const headers = ['PERIOD', 'TITLE NAME'];
      const source = detectSource(headers);

      expect(source).toBe('unknown');
    });
  });

  describe('Row Count Validation', () => {
    it('should report row count for DistroKid file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const validation = validateCSV(content);

      expect(validation.rowCount).toBe(25);
    });

    it('should report row count for BMI file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const validation = validateCSV(content);

      expect(validation.rowCount).toBe(20);
    });

    it('should report 0 rows for empty file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-empty.csv'), 'utf-8');
      const validation = validateCSV(content);

      expect(validation.rowCount).toBe(0);
    });
  });
});
