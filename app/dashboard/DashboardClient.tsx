'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RevenueChart,
  PlatformBreakdown,
  TopTracksTable,
  DateRangePicker,
  RecentActivityFeed,
} from '@/components/charts';
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

function StatsCard({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">Music Business Dashboard</h1>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/dashboard"
                  className="text-blue-600 font-medium px-3 py-2"
                >
                  Dashboard
                </Link>
                <Link
                  href="/uploads"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Uploads
                </Link>
                <Link
                  href="/review"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Review
                </Link>
                <Link
                  href="/catalog"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Catalog
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{userEmail}</span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatsCard
            label="Total Revenue"
            value={formatCurrency(data.summary.totalRevenue)}
            color="text-green-600"
          />
          <StatsCard
            label="Transactions"
            value={data.summary.transactionCount.toLocaleString()}
          />
          <StatsCard
            label="Songs"
            value={data.summary.songCount}
          />
          <StatsCard
            label="Uploads"
            value={data.summary.uploadCount}
          />
          <StatsCard
            label="Needs Review"
            value={data.summary.unmatchedCount}
            color={data.summary.unmatchedCount > 0 ? 'text-amber-600' : 'text-gray-900'}
          />
        </div>

        {/* Date Range Filter */}
        <div className="mb-6">
          <DateRangePicker from={from} to={to} onChange={handleDateRangeChange} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RevenueChart data={data.revenueByMonth} isLoading={isLoading} />
          <PlatformBreakdown data={data.revenueByPlatform} isLoading={isLoading} />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TopTracksTable data={data.topTracks} isLoading={isLoading} />
          </div>
          <div>
            <RecentActivityFeed data={data.recentActivity} isLoading={isLoading} />
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 mt-8 text-center">
          This platform provides financial visibility and catalog organization only.
          It does not provide tax, legal, or financial advice.
        </p>
      </main>
    </div>
  );
}
