import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCSV } from '../../lib/parsers';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('DistroKid Parser', () => {
  describe('Valid File Parsing', () => {
    it('should parse a valid DistroKid CSV file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      expect(result.success).toBe(true);
      expect(result.source).toBe('distrokid');
      expect(result.transactions.length).toBe(25);
      expect(result.errors.length).toBe(0);
    });

    it('should correctly extract track titles', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const titles = [...new Set(result.transactions.map(t => t.trackTitle))];
      expect(titles).toContain('Midnight Dreams');
      expect(titles).toContain('Ocean Waves');
      expect(titles).toContain('City Lights');
      expect(titles).toContain('Starlight');
    });

    it('should correctly extract ISRC codes', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const isrcs = [...new Set(result.transactions.map(t => t.isrc).filter(Boolean))];
      expect(isrcs).toContain('USTEST0000001');
      expect(isrcs).toContain('USTEST0000002');
      expect(isrcs).toContain('USTEST0000003');
    });

    it('should correctly parse earnings as numbers', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      result.transactions.forEach(tx => {
        expect(typeof tx.earnings).toBe('number');
        expect(tx.earnings).toBeGreaterThanOrEqual(0);
      });
    });

    it('should normalize date format to YYYY-MM', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      result.transactions.forEach(tx => {
        expect(tx.reportingPeriod).toMatch(/^\d{4}-\d{2}$/);
      });
    });

    it('should preserve 2-letter territory codes', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const territories = [...new Set(result.transactions.map(t => t.territory).filter(Boolean))];
      territories.forEach(t => {
        expect(t).toMatch(/^[A-Z]{2}$/);
      });
    });

    it('should parse team percentage as ownership', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const ownerships = [...new Set(result.transactions.map(t => t.ownershipPercentage))];
      expect(ownerships).toContain(100);
      expect(ownerships).toContain(50);
    });
  });

  describe('Platform Normalization', () => {
    it('should normalize TikTok Social Media Pack to TikTok', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const tiktokTx = result.transactions.filter(t =>
        t.platform === 'TikTok' || t.platform.includes('TikTok')
      );
      expect(tiktokTx.length).toBeGreaterThan(0);
      tiktokTx.forEach(tx => {
        expect(tx.platform).toBe('TikTok');
      });
    });

    it('should normalize kkbox to KKBOX', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const kkboxTx = result.transactions.filter(t => t.platform === 'KKBOX');
      expect(kkboxTx.length).toBeGreaterThan(0);
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate correct total earnings', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const manualSum = result.transactions.reduce((sum, tx) => sum + tx.earnings, 0);
      expect(result.summary.totalEarnings).toBeCloseTo(manualSum, 6);
    });

    it('should count unique tracks correctly', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      // Based on fixture: Midnight Dreams, Ocean Waves, City Lights, Starlight, Shared Song = 5 unique
      expect(result.summary.uniqueTracks).toBe(5);
    });

    it('should report correct date range', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      expect(result.summary.dateRange.earliest).toBe('2024-10');
      expect(result.summary.dateRange.latest).toBe('2024-12');
    });
  });

  describe('Empty File Handling', () => {
    it('should handle CSV with headers only', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-empty.csv'), 'utf-8');
      const result = parseCSV(content);

      expect(result.success).toBe(false);
      expect(result.transactions.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Malformed Data Handling', () => {
    it('should skip rows with missing required fields', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-malformed.csv'), 'utf-8');
      const result = parseCSV(content);

      // Should have some successful rows and some errors
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report errors for rows missing title', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-malformed.csv'), 'utf-8');
      const result = parseCSV(content);

      const titleErrors = result.errors.filter(e => e.message.toLowerCase().includes('title'));
      expect(titleErrors.length).toBeGreaterThan(0);
    });

    it('should report errors for rows missing sale month', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-malformed.csv'), 'utf-8');
      const result = parseCSV(content);

      const dateErrors = result.errors.filter(e =>
        e.message.toLowerCase().includes('sale month') ||
        e.message.toLowerCase().includes('date')
      );
      expect(dateErrors.length).toBeGreaterThan(0);
    });

    it('should handle invalid earnings gracefully', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-malformed.csv'), 'utf-8');
      const result = parseCSV(content);

      // Should not throw, invalid numbers become 0
      result.transactions.forEach(tx => {
        expect(typeof tx.earnings).toBe('number');
        expect(isNaN(tx.earnings)).toBe(false);
      });
    });
  });

  describe('Special Characters', () => {
    it('should handle titles with quotes', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-special-chars.csv'), 'utf-8');
      const result = parseCSV(content);

      const quoteTx = result.transactions.find(t => t.trackTitle.includes('Quotes'));
      expect(quoteTx).toBeDefined();
    });

    it('should handle artist names with ampersands', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-special-chars.csv'), 'utf-8');
      const result = parseCSV(content);

      const ampTx = result.transactions.find(t => t.artistName.includes('&'));
      expect(ampTx).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-special-chars.csv'), 'utf-8');
      const result = parseCSV(content);

      // Japanese characters
      const jpTx = result.transactions.find(t => t.artistName.includes('日本語'));
      expect(jpTx).toBeDefined();

      // Korean characters
      const krTx = result.transactions.find(t => t.artistName.includes('한국'));
      expect(krTx).toBeDefined();
    });

    it('should handle titles with feat. annotations', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'distrokid-special-chars.csv'), 'utf-8');
      const result = parseCSV(content);

      const featTx = result.transactions.find(t => t.trackTitle.includes('feat.'));
      expect(featTx).toBeDefined();
    });
  });
});
