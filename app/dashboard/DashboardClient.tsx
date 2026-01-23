'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  RevenueChart,
  PlatformBreakdown,
  TopTracksTable,
  DateRangePicker,
  RecentActivityFeed,
  TerritoryBreakdown,
} from '@/components/charts';
import { AnomalyAlerts } from '@/components/AnomalyAlerts';
import { Navigation } from '@/components/Navigation';
import { DashboardStatsResponse } from '@/lib/dashboard/types';
import { getDefaultDateRange } from '@/lib/dashboard/aggregation';

interface DashboardClientProps {
  initialData: DashboardStatsResponse;
  userEmail: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

function TrendIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return null;

  const isPositive = changePercent >= 0;
  const absChange = Math.abs(changePercent);

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
        isPositive
          ? 'text-green-700 bg-green-50'
          : 'text-red-700 bg-red-50'
      }`}
    >
      {isPositive ? (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {absChange.toFixed(1)}%
    </span>
  );
}

// Icon components for stat cards
function DollarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function MusicIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function UploadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function AlertIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function StatsCard({
  label,
  value,
  color = 'text-gray-900',
  changePercent,
  subtitle,
  icon,
  iconBgColor = 'bg-gray-100',
  iconColor = 'text-gray-500',
}: {
  label: string;
  value: string | number;
  color?: string;
  changePercent?: number | null;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-xl sm:text-2xl font-bold ${color} truncate`}>{value}</p>
            {changePercent !== undefined && <TrendIndicator changePercent={changePercent} />}
          </div>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`${iconBgColor} ${iconColor} p-2 rounded-lg flex-shrink-0 ml-2`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function IncomeBreakdownCard({
  masterRevenue,
  publishingRevenue,
  masterPercentage,
  publishingPercentage,
}: {
  masterRevenue: number;
  publishingRevenue: number;
  masterPercentage: number;
  publishingPercentage: number;
}) {
  const total = masterRevenue + publishingRevenue;
  if (total === 0) return null;

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6 card-hover">
      <p className="text-sm text-gray-500 font-medium mb-3">Income Breakdown</p>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-600">Master</span>
            </div>
            <span className="font-semibold text-gray-900">{formatCompactCurrency(masterRevenue)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${masterPercentage}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-600">Publishing</span>
            </div>
            <span className="font-semibold text-gray-900">{formatCompactCurrency(publishingRevenue)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${publishingPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialData,
  userEmail,
}: DashboardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const defaultRange = getDefaultDateRange();
  const from = searchParams.get('from') || defaultRange.from;
  const to = searchParams.get('to') || defaultRange.to;

  const [data, setData] = useState<DashboardStatsResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Track initial params to know when to fetch
  const [initialFrom] = useState(from);
  const [initialTo] = useState(to);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    // Only fetch if params differ from initial load
    if (from !== initialFrom || to !== initialTo) {
      fetchData();
    }
  }, [from, to, initialFrom, initialTo, fetchData]);

  const handleDateRangeChange = (newFrom: string, newTo: string) => {
    const params = new URLSearchParams();
    if (newFrom) params.set('from', newFrom);
    if (newTo) params.set('to', newTo);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatsCard
            label="Period Revenue"
            value={formatCurrency(data.summary.totalRevenue)}
            color="text-green-600"
            changePercent={data.comparison?.revenueChangePercent}
            subtitle={data.comparison ? 'vs previous period' : undefined}
            icon={<DollarIcon />}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <StatsCard
            label="Transactions"
            value={data.comparison?.currentTransactions?.toLocaleString() ?? data.summary.transactionCount.toLocaleString()}
            changePercent={data.comparison?.transactionChangePercent}
            subtitle={data.comparison ? 'in period' : 'all time'}
            icon={<ChartIcon />}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatsCard
            label="Songs"
            value={data.summary.songCount}
            icon={<MusicIcon />}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatsCard
            label="Uploads"
            value={data.summary.uploadCount}
            icon={<UploadIcon />}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <StatsCard
            label="Needs Review"
            value={data.summary.unmatchedCount}
            color={data.summary.unmatchedCount > 0 ? 'text-amber-600' : 'text-gray-900'}
            icon={<AlertIcon />}
            iconBgColor={data.summary.unmatchedCount > 0 ? 'bg-amber-50' : 'bg-gray-100'}
            iconColor={data.summary.unmatchedCount > 0 ? 'text-amber-600' : 'text-gray-500'}
          />
          <IncomeBreakdownCard
            masterRevenue={data.incomeBreakdown.masterRevenue}
            publishingRevenue={data.incomeBreakdown.publishingRevenue}
            masterPercentage={data.incomeBreakdown.masterPercentage}
            publishingPercentage={data.incomeBreakdown.publishingPercentage}
          />
        </div>

        {/* Date Range Filter */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <DateRangePicker from={from} to={to} onChange={handleDateRangeChange} />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3 sm:px-4 py-2 bg-white shadow rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 self-end sm:self-auto"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <RevenueChart data={data.revenueByMonth} isLoading={isLoading} />
          <PlatformBreakdown data={data.revenueByPlatform} isLoading={isLoading} />
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <TerritoryBreakdown data={data.revenueByTerritory} isLoading={isLoading} />
          <AnomalyAlerts />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <TopTracksTable data={data.topTracks} isLoading={isLoading} />
          </div>
          <div>
            <RecentActivityFeed data={data.recentActivity} isLoading={isLoading} />
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 mt-6 sm:mt-8 text-center px-4">
          This platform provides financial visibility and catalog organization only.
          It does not provide tax, legal, or financial advice.
        </p>
      </main>
    </div>
  );
}
