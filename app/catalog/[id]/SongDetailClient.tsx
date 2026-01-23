'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RevenueChart, PlatformBreakdown } from '@/components/charts';
import { MonthlyRevenue, PlatformRevenue, getPlatformColor } from '@/lib/dashboard/types';

interface SongStats {
  song: {
    id: string;
    title: string;
    artistName: string | null;
    isrc: string | null;
    iswc: string | null;
    upc: string | null;
    releaseDate: string | null;
    distributor: string | null;
  };
  summary: {
    lifetimeEarnings: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
    totalStreams: number;
    transactionCount: number;
  };
  revenueByMonth: Array<{ month: string; earnings: number }>;
  revenueByPlatform: Array<{ platform: string; earnings: number }>;
  revenueByTerritory: Array<{ territory: string; earnings: number }>;
  recentTransactions: Array<{
    id: string;
    platform: string;
    territory: string | null;
    reportingPeriod: string;
    quantity: number;
    earnings: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SongDetailClientProps {
  songId: string;
  userEmail: string;
}

export default function SongDetailClient({ songId, userEmail }: SongDetailClientProps) {
  const [stats, setStats] = useState<SongStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/songs/${songId}/stats?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch song stats:', error);
    } finally {
      setLoading(false);
    }
  }, [songId, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleExportCSV = () => {
    if (!stats) return;

    const headers = ['Period', 'Platform', 'Territory', 'Quantity', 'Earnings'];
    const rows = stats.recentTransactions.map(tx => [
      tx.reportingPeriod,
      tx.platform,
      tx.territory || '',
      tx.quantity.toString(),
      tx.earnings.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stats.song.title.replace(/[^a-z0-9]/gi, '_')}_transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Transform data for RevenueChart (expects MonthlyRevenue with revenue and transactionCount)
  const transformMonthlyData = (data: Array<{ month: string; earnings: number }>): MonthlyRevenue[] => {
    return data.map(item => ({
      month: item.month,
      revenue: item.earnings,
      transactionCount: 0, // Not tracked at month level in song stats
    }));
  };

  // Transform data for PlatformBreakdown (expects PlatformRevenue with revenue, percentage, color)
  const transformPlatformData = (data: Array<{ platform: string; earnings: number }>): PlatformRevenue[] => {
    const total = data.reduce((sum, item) => sum + item.earnings, 0);
    return data.map(item => ({
      platform: item.platform,
      revenue: item.earnings,
      percentage: total > 0 ? (item.earnings / total) * 100 : 0,
      color: getPlatformColor(item.platform),
    }));
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading song details...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Song not found</p>
          <Link href="/catalog" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">Music Business Dashboard</h1>
              <div className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Dashboard
                </Link>
                <Link href="/uploads" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Uploads
                </Link>
                <Link href="/review" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Review
                </Link>
                <Link href="/catalog" className="text-blue-600 font-medium px-3 py-2">
                  Catalog
                </Link>
                <Link href="/reports" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Reports
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
        {/* Back Link */}
        <Link
          href="/catalog"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Catalog
        </Link>

        {/* Song Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{stats.song.title}</h2>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
            {stats.song.artistName && <span>{stats.song.artistName}</span>}
            {stats.song.isrc && (
              <span className="font-mono">ISRC: {stats.song.isrc}</span>
            )}
            {stats.song.upc && (
              <span className="font-mono">UPC: {stats.song.upc}</span>
            )}
            {stats.song.distributor && <span>{stats.song.distributor}</span>}
            {stats.song.releaseDate && (
              <span>Released: {new Date(stats.song.releaseDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Lifetime Earnings</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.summary.lifetimeEarnings)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">This Month</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.summary.thisMonthEarnings)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Last Month</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.summary.lastMonthEarnings)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Streams</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.summary.totalStreams.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Over Time */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue (Last 12 Months)</h3>
            {stats.revenueByMonth.length > 0 ? (
              <RevenueChart data={transformMonthlyData(stats.revenueByMonth)} />
            ) : (
              <p className="text-gray-500 text-center py-8">No revenue data</p>
            )}
          </div>

          {/* Platform Breakdown */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Breakdown</h3>
            {stats.revenueByPlatform.length > 0 ? (
              <PlatformBreakdown data={transformPlatformData(stats.revenueByPlatform)} />
            ) : (
              <p className="text-gray-500 text-center py-8">No platform data</p>
            )}
          </div>
        </div>

        {/* Territory Breakdown */}
        {stats.revenueByTerritory.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Top Territories</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {stats.revenueByTerritory.slice(0, 10).map((item) => (
                <div key={item.territory} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{item.territory}</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(item.earnings)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Export CSV
            </button>
          </div>

          {stats.recentTransactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Period
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Platform
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Territory
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Earnings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{tx.reportingPeriod}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{tx.platform}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{tx.territory || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">
                          {tx.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(tx.earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {stats.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * stats.pagination.limit + 1} to{' '}
                    {Math.min(page * stats.pagination.limit, stats.pagination.total)} of{' '}
                    {stats.pagination.total} transactions
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(stats.pagination.totalPages, page + 1))}
                      disabled={page === stats.pagination.totalPages}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          )}
        </div>
      </main>
    </div>
  );
}
