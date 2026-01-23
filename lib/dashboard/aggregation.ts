/**
 * Dashboard Aggregation Utilities
 *
 * Functions for aggregating transaction data for dashboard visualizations.
 */

import {
  MonthlyRevenue,
  PlatformRevenue,
  TopTrack,
  getPlatformColor,
} from './types';

export interface TransactionRow {
  amount: number;
  reporting_period_start: string | null;
  platform_source: string;
  track_title: string;
  created_at: string;
}

/**
 * Aggregate transactions by month for time series chart
 */
export function aggregateByMonth(transactions: TransactionRow[]): MonthlyRevenue[] {
  const monthMap = new Map<string, { revenue: number; count: number }>();

  for (const tx of transactions) {
    // Extract YYYY-MM from date
    const month = tx.reporting_period_start?.slice(0, 7) || 'Unknown';
    const existing = monthMap.get(month) || { revenue: 0, count: 0 };
    monthMap.set(month, {
      revenue: existing.revenue + (tx.amount || 0),
      count: existing.count + 1,
    });
  }

  return Array.from(monthMap.entries())
    .filter(([month]) => month !== 'Unknown')
    .map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue * 100) / 100,
      transactionCount: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Aggregate transactions by platform for pie chart
 */
export function aggregateByPlatform(transactions: TransactionRow[]): PlatformRevenue[] {
  const platformMap = new Map<string, number>();
  let total = 0;

  for (const tx of transactions) {
    const platform = tx.platform_source || 'Unknown';
    const existing = platformMap.get(platform) || 0;
    const amount = tx.amount || 0;
    platformMap.set(platform, existing + amount);
    total += amount;
  }

  return Array.from(platformMap.entries())
    .map(([platform, revenue]) => ({
      platform,
      revenue: Math.round(revenue * 100) / 100,
      percentage: total > 0 ? Math.round((revenue / total) * 1000) / 10 : 0,
      color: getPlatformColor(platform),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Aggregate top performing tracks by revenue
 */
export function aggregateTopTracks(
  transactions: TransactionRow[],
  limit: number = 10
): TopTrack[] {
  const trackMap = new Map<
    string,
    {
      trackTitle: string;
      revenue: number;
      count: number;
      platforms: Set<string>;
    }
  >();

  for (const tx of transactions) {
    const title = tx.track_title || 'Unknown';
    const key = title.toLowerCase();
    const existing = trackMap.get(key);

    if (existing) {
      existing.revenue += tx.amount || 0;
      existing.count += 1;
      existing.platforms.add(tx.platform_source);
    } else {
      trackMap.set(key, {
        trackTitle: title, // Keep original casing from first occurrence
        revenue: tx.amount || 0,
        count: 1,
        platforms: new Set([tx.platform_source]),
      });
    }
  }

  return Array.from(trackMap.values())
    .map((data) => ({
      trackTitle: data.trackTitle,
      revenue: Math.round(data.revenue * 100) / 100,
      transactionCount: data.count,
      platforms: Array.from(data.platforms).filter(Boolean),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Date utility functions for date range presets
 */
export function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 12);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

export function formatMonthLabel(month: string): string {
  // Convert YYYY-MM to "Jan '24" format
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}
