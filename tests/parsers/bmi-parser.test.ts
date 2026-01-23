import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCSV } from '../../lib/parsers';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('BMI Parser', () => {
  describe('Valid File Parsing', () => {
    it('should parse a valid BMI CSV file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      expect(result.success).toBe(true);
      expect(result.source).toBe('bmi');
      expect(result.transactions.length).toBe(20);
      expect(result.errors.length).toBe(0);
    });

    it('should correctly extract title names', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const titles = [...new Set(result.transactions.map(t => t.trackTitle))];
      expect(titles).toContain('MIDNIGHT DREAMS');
      expect(titles).toContain('OCEAN WAVES');
      expect(titles).toContain('CITY LIGHTS');
      expect(titles).toContain('STARLIGHT');
    });

    it('should correctly parse royalty amounts', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      result.transactions.forEach(tx => {
        expect(typeof tx.earnings).toBe('number');
        expect(tx.earnings).toBeGreaterThanOrEqual(0);
      });
    });

    it('should not have ISRC (BMI does not include it)', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      result.transactions.forEach(tx => {
        expect(tx.isrc).toBeNull();
      });
    });
  });

  describe('Period Conversion', () => {
    it('should convert BMI period format to YYYY-MM', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      result.transactions.forEach(tx => {
        expect(tx.reportingPeriod).toMatch(/^\d{4}-\d{2}$/);
      });
    });

    it('should map Q4 (20244) to October (2024-10)', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const q4Tx = result.transactions.filter(tx => tx.reportingPeriod === '2024-10');
      expect(q4Tx.length).toBeGreaterThan(0);
    });

    it('should map Q3 (20243) to July (2024-07)', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const q3Tx = result.transactions.filter(tx => tx.reportingPeriod === '2024-07');
      expect(q3Tx.length).toBeGreaterThan(0);
    });

    it('should map Q2 (20242) to April (2024-04)', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const q2Tx = result.transactions.filter(tx => tx.reportingPeriod === '2024-04');
      expect(q2Tx.length).toBeGreaterThan(0);
    });
  });

  describe('Platform Normalization', () => {
    it('should normalize AMAZON UNLTD to Amazon Music', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const amazonTx = result.transactions.filter(t => t.platform === 'Amazon Music');
      expect(amazonTx.length).toBeGreaterThan(0);
    });

    it('should normalize AMAZON PRIME to Amazon Music', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      // All Amazon variants should be Amazon Music
      const amazonVariants = result.transactions.filter(t =>
        t.platform.toLowerCase().includes('amazon')
      );
      amazonVariants.forEach(tx => {
        expect(tx.platform).toBe('Amazon Music');
      });
    });

    it('should normalize COMM RADIO to Commercial Radio', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const radioTx = result.transactions.filter(t => t.platform === 'Commercial Radio');
      expect(radioTx.length).toBeGreaterThan(0);
    });
  });

  describe('Territory Normalization', () => {
    it('should convert UNITED STATES to US', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const usTx = result.transactions.filter(t => t.territory === 'US');
      expect(usTx.length).toBeGreaterThan(0);
    });

    it('should convert GERMANY to DE', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const deTx = result.transactions.filter(t => t.territory === 'DE');
      expect(deTx.length).toBeGreaterThan(0);
    });
  });

  describe('Use Code Mapping', () => {
    it('should map FF to Feature Film', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const ffTx = result.transactions.filter(t => t.usageType === 'Feature Film');
      expect(ffTx.length).toBeGreaterThan(0);
    });

    it('should map SD to Standard', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const sdTx = result.transactions.filter(t => t.usageType === 'Standard');
      expect(sdTx.length).toBeGreaterThan(0);
    });

    it('should map LV to Live Vocal', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const lvTx = result.transactions.filter(t => t.usageType === 'Live Vocal');
      expect(lvTx.length).toBeGreaterThan(0);
    });

    it('should map TH to Theme', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const thTx = result.transactions.filter(t => t.usageType === 'Theme');
      expect(thTx.length).toBeGreaterThan(0);
    });

    it('should map BM to Background Music', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const bmTx = result.transactions.filter(t => t.usageType === 'Background Music');
      expect(bmTx.length).toBeGreaterThan(0);
    });
  });

  describe('Participant Percentage', () => {
    it('should parse participant percentage as ownership', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const ownerships = [...new Set(result.transactions.map(t => t.ownershipPercentage))];
      expect(ownerships).toContain(100);
      expect(ownerships).toContain(50);
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate correct total earnings', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      const manualSum = result.transactions.reduce((sum, tx) => sum + tx.earnings, 0);
      expect(result.summary.totalEarnings).toBeCloseTo(manualSum, 2);
    });

    it('should count unique tracks', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bmi-valid.csv'), 'utf-8');
      const result = parseCSV(content);

      expect(result.summary.uniqueTracks).toBeGreaterThan(0);
    });
  });
});
