import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCSV, NormalizedTransaction } from '../../lib/parsers';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('Duplicate Detection', () => {
  describe('Within-File Duplicates', () => {
    it('should parse file with duplicate rows', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-duplicates.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // The parser should parse all rows (7 total)
      expect(result.transactions.length).toBe(7);
    });

    it('should identify duplicate rows by composite key', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-duplicates.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // Create composite keys for duplicate detection
      const keys = result.transactions.map(tx =>
        `${tx.reportingPeriod}|${tx.trackTitle}|${tx.platform}|${tx.earnings}`
      );

      // Count occurrences
      const keyCounts = new Map<string, number>();
      keys.forEach(key => {
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      });

      // Find duplicate keys
      const duplicateKeys = [...keyCounts.entries()].filter(([, count]) => count > 1);

      // Should have at least one duplicate group
      expect(duplicateKeys.length).toBeGreaterThan(0);
    });

    it('should have 3 identical Midnight Dreams rows', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-duplicates.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      const midnightDreamsRows = result.transactions.filter(
        tx => tx.trackTitle === 'Midnight Dreams' && tx.platform === 'Spotify'
      );

      expect(midnightDreamsRows.length).toBe(3);

      // All should have same values
      const firstRow = midnightDreamsRows[0];
      midnightDreamsRows.forEach(row => {
        expect(row.earnings).toBe(firstRow.earnings);
        expect(row.reportingPeriod).toBe(firstRow.reportingPeriod);
        expect(row.territory).toBe(firstRow.territory);
      });
    });

    it('should have 2 identical Ocean Waves rows', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-duplicates.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      const oceanWavesRows = result.transactions.filter(
        tx => tx.trackTitle === 'Ocean Waves'
      );

      expect(oceanWavesRows.length).toBe(2);
    });

    it('should have unique rows for City Lights and Unique Track', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-duplicates.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      const cityLightsRows = result.transactions.filter(
        tx => tx.trackTitle === 'City Lights'
      );
      expect(cityLightsRows.length).toBe(1);

      const uniqueTrackRows = result.transactions.filter(
        tx => tx.trackTitle === 'Unique Track'
      );
      expect(uniqueTrackRows.length).toBe(1);
    });
  });

  describe('Composite Key Components', () => {
    it('should differentiate by date', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // Find Midnight Dreams rows
      const midnightDreams = result.transactions.filter(
        tx => tx.trackTitle === 'Midnight Dreams' && tx.platform === 'Spotify' && tx.territory === 'US'
      );

      // Should have rows from different months
      const periods = [...new Set(midnightDreams.map(tx => tx.reportingPeriod))];
      expect(periods.length).toBeGreaterThan(1);
    });

    it('should differentiate by platform', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // Find Midnight Dreams rows from same period
      const midnightDreams = result.transactions.filter(
        tx => tx.trackTitle === 'Midnight Dreams' && tx.reportingPeriod === '2024-12'
      );

      const platforms = [...new Set(midnightDreams.map(tx => tx.platform))];
      expect(platforms.length).toBeGreaterThan(1);
    });

    it('should differentiate by territory (different amounts)', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // Find rows for same track/platform/period but different territories
      const spotifyMidnight = result.transactions.filter(
        tx => tx.trackTitle === 'Midnight Dreams' &&
              tx.platform === 'Spotify' &&
              tx.reportingPeriod === '2024-12'
      );

      // Different territories often have different amounts
      const territories = [...new Set(spotifyMidnight.map(tx => tx.territory))];
      expect(territories.length).toBeGreaterThan(1);
    });
  });

  describe('Duplicate Detection Utility', () => {
    /**
     * This tests the logic that would be used in the confirm endpoint
     * to detect duplicates before inserting.
     */
    function findDuplicatesInBatch(transactions: NormalizedTransaction[]): {
      unique: NormalizedTransaction[];
      duplicates: NormalizedTransaction[];
    } {
      const seen = new Set<string>();
      const unique: NormalizedTransaction[] = [];
      const duplicates: NormalizedTransaction[] = [];

      for (const tx of transactions) {
        const key = `${tx.reportingPeriod}-01|${tx.trackTitle}|${tx.platform}|${tx.earnings}`;

        if (seen.has(key)) {
          duplicates.push(tx);
        } else {
          seen.add(key);
          unique.push(tx);
        }
      }

      return { unique, duplicates };
    }

    it('should identify duplicates within a batch', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-duplicates.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      const { unique, duplicates } = findDuplicatesInBatch(result.transactions);

      // 7 rows total, 3 Midnight Dreams (2 dupes), 2 Ocean Waves (1 dupe) = 4 unique, 3 dupes
      expect(unique.length).toBe(4);
      expect(duplicates.length).toBe(3);
    });

    it('should keep all rows from file without duplicates', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      const { unique, duplicates } = findDuplicatesInBatch(result.transactions);

      // Valid file should have no exact duplicates
      expect(unique.length).toBe(result.transactions.length);
      expect(duplicates.length).toBe(0);
    });
  });

  describe('Cross-Upload Duplicate Simulation', () => {
    /**
     * Simulates checking new transactions against existing ones
     */
    function checkAgainstExisting(
      newTransactions: NormalizedTransaction[],
      existingKeys: Set<string>
    ): { newOnly: NormalizedTransaction[]; duplicates: NormalizedTransaction[] } {
      const newOnly: NormalizedTransaction[] = [];
      const duplicates: NormalizedTransaction[] = [];

      for (const tx of newTransactions) {
        const key = `${tx.reportingPeriod}-01|${tx.trackTitle}|${tx.platform}|${tx.earnings}`;

        if (existingKeys.has(key)) {
          duplicates.push(tx);
        } else {
          newOnly.push(tx);
        }
      }

      return { newOnly, duplicates };
    }

    it('should detect all as duplicates when re-uploading same file', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // Simulate existing transactions
      const existingKeys = new Set(
        result.transactions.map(tx =>
          `${tx.reportingPeriod}-01|${tx.trackTitle}|${tx.platform}|${tx.earnings}`
        )
      );

      // Upload same file again
      const { newOnly, duplicates } = checkAgainstExisting(
        result.transactions,
        existingKeys
      );

      expect(duplicates.length).toBe(result.transactions.length);
      expect(newOnly.length).toBe(0);
    });

    it('should detect partial overlap', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // Simulate only first half already exists
      const halfIndex = Math.floor(result.transactions.length / 2);
      const existingKeys = new Set(
        result.transactions.slice(0, halfIndex).map(tx =>
          `${tx.reportingPeriod}-01|${tx.trackTitle}|${tx.platform}|${tx.earnings}`
        )
      );

      const { newOnly, duplicates } = checkAgainstExisting(
        result.transactions,
        existingKeys
      );

      expect(duplicates.length).toBe(halfIndex);
      expect(newOnly.length).toBe(result.transactions.length - halfIndex);
    });

    it('should detect no duplicates for completely new data', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = parseCSV(content);

      // Empty existing set
      const existingKeys = new Set<string>();

      const { newOnly, duplicates } = checkAgainstExisting(
        result.transactions,
        existingKeys
      );

      expect(newOnly.length).toBe(result.transactions.length);
      expect(duplicates.length).toBe(0);
    });
  });
});
