/**
 * Dashboard Aggregation Tests
 *
 * Tests for the data aggregation utilities used in dashboard visualizations.
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateByMonth,
  aggregateByPlatform,
  aggregateTopTracks,
  aggregateByIncomeType,
  getDefaultDateRange,
  formatMonthLabel,
  formatDateForDisplay,
  TransactionRow,
} from '../../lib/dashboard/aggregation';
import { getPlatformColor, PLATFORM_COLORS } from '../../lib/dashboard/types';

// Helper to create test transactions
function createTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    amount: 10.0,
    reporting_period_start: '2024-01-15',
    platform_source: 'Spotify',
    track_title: 'Test Song',
    created_at: '2024-01-20T12:00:00Z',
    ...overrides,
  };
}

describe('aggregateByMonth', () => {
  it('should group transactions by month', () => {
    const transactions = [
      createTransaction({ amount: 100, reporting_period_start: '2024-01-15' }),
      createTransaction({ amount: 50, reporting_period_start: '2024-01-20' }),
      createTransaction({ amount: 75, reporting_period_start: '2024-02-10' }),
    ];

    const result = aggregateByMonth(transactions);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      month: '2024-01',
      revenue: 150,
      transactionCount: 2,
    });
    expect(result[1]).toEqual({
      month: '2024-02',
      revenue: 75,
      transactionCount: 1,
    });
  });

  it('should handle empty array', () => {
    const result = aggregateByMonth([]);
    expect(result).toEqual([]);
  });

  it('should sort by month ascending', () => {
    const transactions = [
      createTransaction({ amount: 100, reporting_period_start: '2024-03-01' }),
      createTransaction({ amount: 50, reporting_period_start: '2024-01-01' }),
      createTransaction({ amount: 75, reporting_period_start: '2024-02-01' }),
    ];

    const result = aggregateByMonth(transactions);

    expect(result[0].month).toBe('2024-01');
    expect(result[1].month).toBe('2024-02');
    expect(result[2].month).toBe('2024-03');
  });

  it('should filter out transactions with null dates', () => {
    const transactions = [
      createTransaction({ amount: 100, reporting_period_start: '2024-01-15' }),
      createTransaction({ amount: 50, reporting_period_start: null }),
    ];

    const result = aggregateByMonth(transactions);

    expect(result).toHaveLength(1);
    expect(result[0].revenue).toBe(100);
  });

  it('should round revenue to 2 decimal places', () => {
    const transactions = [
      createTransaction({ amount: 10.123, reporting_period_start: '2024-01-15' }),
      createTransaction({ amount: 5.456, reporting_period_start: '2024-01-20' }),
    ];

    const result = aggregateByMonth(transactions);

    expect(result[0].revenue).toBe(15.58);
  });

  it('should handle transactions across multiple years', () => {
    const transactions = [
      createTransaction({ amount: 100, reporting_period_start: '2023-12-15' }),
      createTransaction({ amount: 50, reporting_period_start: '2024-01-15' }),
    ];

    const result = aggregateByMonth(transactions);

    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2023-12');
    expect(result[1].month).toBe('2024-01');
  });
});

describe('aggregateByPlatform', () => {
  it('should group transactions by platform', () => {
    const transactions = [
      createTransaction({ amount: 75, platform_source: 'Spotify' }),
      createTransaction({ amount: 25, platform_source: 'Apple Music' }),
    ];

    const result = aggregateByPlatform(transactions);

    expect(result).toHaveLength(2);
    expect(result[0].platform).toBe('Spotify');
    expect(result[0].revenue).toBe(75);
    expect(result[0].percentage).toBe(75);
    expect(result[1].platform).toBe('Apple Music');
    expect(result[1].revenue).toBe(25);
    expect(result[1].percentage).toBe(25);
  });

  it('should sort by revenue descending', () => {
    const transactions = [
      createTransaction({ amount: 25, platform_source: 'Amazon' }),
      createTransaction({ amount: 100, platform_source: 'Spotify' }),
      createTransaction({ amount: 50, platform_source: 'Apple Music' }),
    ];

    const result = aggregateByPlatform(transactions);

    expect(result[0].platform).toBe('Spotify');
    expect(result[1].platform).toBe('Apple Music');
    expect(result[2].platform).toBe('Amazon');
  });

  it('should include platform colors', () => {
    const transactions = [
      createTransaction({ amount: 100, platform_source: 'Spotify' }),
    ];

    const result = aggregateByPlatform(transactions);

    expect(result[0].color).toBe('#1DB954');
  });

  it('should handle unknown platforms with default color', () => {
    const transactions = [
      createTransaction({ amount: 100, platform_source: 'Unknown Service' }),
    ];

    const result = aggregateByPlatform(transactions);

    expect(result[0].color).toBe(PLATFORM_COLORS.default);
  });

  it('should handle empty array', () => {
    const result = aggregateByPlatform([]);
    expect(result).toEqual([]);
  });

  it('should calculate correct percentages with multiple platforms', () => {
    const transactions = [
      createTransaction({ amount: 50, platform_source: 'Spotify' }),
      createTransaction({ amount: 30, platform_source: 'Apple Music' }),
      createTransaction({ amount: 20, platform_source: 'YouTube' }),
    ];

    const result = aggregateByPlatform(transactions);
    const totalPercentage = result.reduce((sum, p) => sum + p.percentage, 0);

    expect(totalPercentage).toBe(100);
  });
});

describe('aggregateTopTracks', () => {
  it('should group transactions by track title', () => {
    const transactions = [
      createTransaction({ amount: 50, track_title: 'Song A', platform_source: 'Spotify' }),
      createTransaction({ amount: 30, track_title: 'Song A', platform_source: 'Apple Music' }),
      createTransaction({ amount: 20, track_title: 'Song B', platform_source: 'Spotify' }),
    ];

    const result = aggregateTopTracks(transactions);

    expect(result).toHaveLength(2);
    expect(result[0].trackTitle).toBe('Song A');
    expect(result[0].revenue).toBe(80);
    expect(result[0].transactionCount).toBe(2);
    expect(result[0].platforms).toContain('Spotify');
    expect(result[0].platforms).toContain('Apple Music');
  });

  it('should group case-insensitively', () => {
    const transactions = [
      createTransaction({ amount: 50, track_title: 'My Song' }),
      createTransaction({ amount: 30, track_title: 'my song' }),
      createTransaction({ amount: 20, track_title: 'MY SONG' }),
    ];

    const result = aggregateTopTracks(transactions);

    expect(result).toHaveLength(1);
    expect(result[0].revenue).toBe(100);
    expect(result[0].transactionCount).toBe(3);
  });

  it('should sort by revenue descending', () => {
    const transactions = [
      createTransaction({ amount: 10, track_title: 'Low Earner' }),
      createTransaction({ amount: 100, track_title: 'High Earner' }),
      createTransaction({ amount: 50, track_title: 'Medium Earner' }),
    ];

    const result = aggregateTopTracks(transactions);

    expect(result[0].trackTitle).toBe('High Earner');
    expect(result[1].trackTitle).toBe('Medium Earner');
    expect(result[2].trackTitle).toBe('Low Earner');
  });

  it('should limit results to specified count', () => {
    const transactions = Array.from({ length: 20 }, (_, i) =>
      createTransaction({ amount: i * 10, track_title: `Track ${i}` })
    );

    const result = aggregateTopTracks(transactions, 10);

    expect(result).toHaveLength(10);
  });

  it('should default to 10 results', () => {
    const transactions = Array.from({ length: 20 }, (_, i) =>
      createTransaction({ amount: i * 10, track_title: `Track ${i}` })
    );

    const result = aggregateTopTracks(transactions);

    expect(result).toHaveLength(10);
  });

  it('should collect unique platforms per track', () => {
    const transactions = [
      createTransaction({ track_title: 'Song', platform_source: 'Spotify' }),
      createTransaction({ track_title: 'Song', platform_source: 'Spotify' }),
      createTransaction({ track_title: 'Song', platform_source: 'Apple Music' }),
      createTransaction({ track_title: 'Song', platform_source: 'YouTube' }),
    ];

    const result = aggregateTopTracks(transactions);

    expect(result[0].platforms).toHaveLength(3);
    expect(result[0].platforms).toContain('Spotify');
    expect(result[0].platforms).toContain('Apple Music');
    expect(result[0].platforms).toContain('YouTube');
  });

  it('should handle empty array', () => {
    const result = aggregateTopTracks([]);
    expect(result).toEqual([]);
  });
});

describe('getPlatformColor', () => {
  it('should return correct color for known platforms', () => {
    expect(getPlatformColor('Spotify')).toBe('#1DB954');
    expect(getPlatformColor('Apple Music')).toBe('#FC3C44');
    expect(getPlatformColor('YouTube')).toBe('#FF0000');
    expect(getPlatformColor('Amazon Music')).toBe('#FF9900');
  });

  it('should match partial platform names case-insensitively', () => {
    expect(getPlatformColor('spotify premium')).toBe('#1DB954');
    expect(getPlatformColor('SPOTIFY')).toBe('#1DB954');
  });

  it('should return default color for unknown platforms', () => {
    expect(getPlatformColor('Random Service')).toBe(PLATFORM_COLORS.default);
  });
});

describe('getDefaultDateRange', () => {
  it('should return dates in YYYY-MM-DD format', () => {
    const range = getDefaultDateRange();

    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return a range spanning approximately 24 months', () => {
    const range = getDefaultDateRange();
    const from = new Date(range.from);
    const to = new Date(range.to);
    const diffMonths =
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

    expect(diffMonths).toBeGreaterThanOrEqual(23);
    expect(diffMonths).toBeLessThanOrEqual(25);
  });

  it('should have to date as today or very recent', () => {
    const range = getDefaultDateRange();
    const to = new Date(range.to);
    const today = new Date();

    // Allow for timezone differences - should be within 1 day
    const diffDays = Math.abs(
      (today.getTime() - to.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeLessThan(2);
  });
});

describe('formatMonthLabel', () => {
  it('should format YYYY-MM to readable format', () => {
    const result = formatMonthLabel('2024-01');
    // Should be something like "Jan '24"
    expect(result).toContain('Jan');
    expect(result).toContain('24');
  });

  it('should handle different months', () => {
    expect(formatMonthLabel('2024-06')).toContain('Jun');
    expect(formatMonthLabel('2024-12')).toContain('Dec');
  });
});

describe('aggregateByIncomeType', () => {
  it('should separate master and publishing income', () => {
    const transactions = [
      createTransaction({ amount: 100, income_type: 'master' }),
      createTransaction({ amount: 50, income_type: 'publishing' }),
    ];

    const result = aggregateByIncomeType(transactions);

    expect(result.masterRevenue).toBe(100);
    expect(result.publishingRevenue).toBe(50);
  });

  it('should treat null/missing income_type as master (legacy data)', () => {
    const transactions = [
      createTransaction({ amount: 75 }), // no income_type
      createTransaction({ amount: 25, income_type: null }),
    ];

    const result = aggregateByIncomeType(transactions);

    expect(result.masterRevenue).toBe(100);
    expect(result.publishingRevenue).toBe(0);
  });

  it('should calculate correct percentages', () => {
    const transactions = [
      createTransaction({ amount: 75, income_type: 'master' }),
      createTransaction({ amount: 25, income_type: 'publishing' }),
    ];

    const result = aggregateByIncomeType(transactions);

    expect(result.masterPercentage).toBe(75);
    expect(result.publishingPercentage).toBe(25);
  });

  it('should handle empty array', () => {
    const result = aggregateByIncomeType([]);

    expect(result.masterRevenue).toBe(0);
    expect(result.publishingRevenue).toBe(0);
    expect(result.masterPercentage).toBe(0);
    expect(result.publishingPercentage).toBe(0);
  });

  it('should round revenue to 2 decimal places', () => {
    const transactions = [
      createTransaction({ amount: 33.333, income_type: 'master' }),
      createTransaction({ amount: 16.667, income_type: 'publishing' }),
    ];

    const result = aggregateByIncomeType(transactions);

    expect(result.masterRevenue).toBe(33.33);
    expect(result.publishingRevenue).toBe(16.67);
  });
});

describe('formatDateForDisplay', () => {
  it('should format date string to readable format', () => {
    const result = formatDateForDisplay('2024-06-15');
    expect(result).toContain('Jun');
    expect(result).toContain('2024');
  });

  it('should handle different dates correctly', () => {
    expect(formatDateForDisplay('2023-01-01')).toContain('Jan');
    expect(formatDateForDisplay('2024-12-31')).toContain('Dec');
  });
});
