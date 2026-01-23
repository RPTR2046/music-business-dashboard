/**
 * Dashboard Types
 *
 * TypeScript interfaces for dashboard data and API responses.
 */

export interface DashboardSummary {
  totalRevenue: number;
  transactionCount: number;
  songCount: number;
  uploadCount: number;
  unmatchedCount: number;
}

export interface MonthlyRevenue {
  month: string; // YYYY-MM format
  revenue: number;
  transactionCount: number;
}

export interface PlatformRevenue {
  platform: string;
  revenue: number;
  percentage: number;
  color: string;
}

export interface TopTrack {
  trackTitle: string;
  revenue: number;
  transactionCount: number;
  platforms: string[];
}

export interface RecentActivity {
  type: 'upload' | 'transaction';
  title: string;
  description: string;
  amount?: number;
  createdAt: string;
}

export interface DashboardStatsResponse {
  summary: DashboardSummary;
  revenueByMonth: MonthlyRevenue[];
  revenueByPlatform: PlatformRevenue[];
  topTracks: TopTrack[];
  recentActivity: RecentActivity[];
}

export interface DateRange {
  from: string | null;
  to: string | null;
}

// Platform brand colors for charts
export const PLATFORM_COLORS: Record<string, string> = {
  'Spotify': '#1DB954',
  'Apple Music': '#FC3C44',
  'iTunes': '#FC3C44',
  'YouTube Music': '#FF0000',
  'YouTube': '#FF0000',
  'Amazon Music': '#FF9900',
  'Amazon': '#FF9900',
  'Tidal': '#000000',
  'TIDAL': '#000000',
  'Deezer': '#FEAA2D',
  'Pandora': '#005483',
  'SoundCloud': '#FF5500',
  'TikTok': '#010101',
  'Instagram': '#E4405F',
  'Facebook': '#1877F2',
  'default': '#6B7280',
};

export function getPlatformColor(platform: string): string {
  // Check for exact match first
  if (PLATFORM_COLORS[platform]) {
    return PLATFORM_COLORS[platform];
  }

  // Check for partial match (case-insensitive)
  const lowerPlatform = platform.toLowerCase();
  for (const [key, color] of Object.entries(PLATFORM_COLORS)) {
    if (lowerPlatform.includes(key.toLowerCase())) {
      return color;
    }
  }

  return PLATFORM_COLORS.default;
}
