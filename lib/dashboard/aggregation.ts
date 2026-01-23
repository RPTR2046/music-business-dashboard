/**
 * Dashboard Aggregation Utilities
 *
 * Functions for aggregating transaction data for dashboard visualizations.
 */

import {
  MonthlyRevenue,
  PlatformRevenue,
  TopTrack,
  IncomeBreakdown,
  TerritoryRevenue,
  getPlatformColor,
} from './types';

export interface TransactionRow {
  amount: number;
  reporting_period_start: string | null;
  platform_source: string;
  track_title: string;
  created_at: string;
  income_type?: string | null;
  royalty_type?: string | null;
  territory?: string | null;
}

// ISO 3166-1 alpha-2 country code to name mapping (common ones)
const TERRITORY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  BR: 'Brazil',
  MX: 'Mexico',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  NZ: 'New Zealand',
  IE: 'Ireland',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  PL: 'Poland',
  IN: 'India',
  KR: 'South Korea',
  TW: 'Taiwan',
  SG: 'Singapore',
  HK: 'Hong Kong',
  PH: 'Philippines',
  ID: 'Indonesia',
  TH: 'Thailand',
  MY: 'Malaysia',
  ZA: 'South Africa',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  PT: 'Portugal',
  RU: 'Russia',
  TR: 'Turkey',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  IL: 'Israel',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',
  // Add more as needed
};

function getTerritoryName(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  const upper = code.toUpperCase().trim();
  return TERRITORY_NAMES[upper] || upper;
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
 * Aggregate transactions by territory for geographic breakdown
 */
export function aggregateByTerritory(
  transactions: TransactionRow[],
  limit: number = 10
): TerritoryRevenue[] {
  const territoryMap = new Map<string, { revenue: number; count: number }>();
  let total = 0;

  for (const tx of transactions) {
    const territory = tx.territory?.toUpperCase().trim() || 'Unknown';
    const existing = territoryMap.get(territory) || { revenue: 0, count: 0 };
    const amount = tx.amount || 0;
    territoryMap.set(territory, {
      revenue: existing.revenue + amount,
      count: existing.count + 1,
    });
    total += amount;
  }

  return Array.from(territoryMap.entries())
    .map(([territory, data]) => ({
      territory,
      territoryName: getTerritoryName(territory),
      revenue: Math.round(data.revenue * 100) / 100,
      percentage: total > 0 ? Math.round((data.revenue / total) * 1000) / 10 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Aggregate income by type (master vs publishing)
 */
export function aggregateByIncomeType(transactions: TransactionRow[]): IncomeBreakdown {
  let masterRevenue = 0;
  let publishingRevenue = 0;

  for (const tx of transactions) {
    const amount = tx.amount || 0;
    if (tx.income_type === 'master') {
      masterRevenue += amount;
    } else if (tx.income_type === 'publishing') {
      publishingRevenue += amount;
    } else {
      // If no income_type set, assume master (legacy data from DistroKid)
      masterRevenue += amount;
    }
  }

  const total = masterRevenue + publishingRevenue;

  return {
    masterRevenue: Math.round(masterRevenue * 100) / 100,
    publishingRevenue: Math.round(publishingRevenue * 100) / 100,
    masterPercentage: total > 0 ? Math.round((masterRevenue / total) * 1000) / 10 : 0,
    publishingPercentage: total > 0 ? Math.round((publishingRevenue / total) * 1000) / 10 : 0,
  };
}

/**
 * Date utility functions for date range presets
 */
export function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  // Default to 24 months to include typical reporting lag
  from.setMonth(from.getMonth() - 24);

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
