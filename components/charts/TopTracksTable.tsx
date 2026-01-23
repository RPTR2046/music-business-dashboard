'use client';

import Link from 'next/link';
import { TopTrack } from '@/lib/dashboard/types';

interface TopTracksTableProps {
  data: TopTrack[];
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function TableSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="h-5 w-48 skeleton mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-6 h-4 skeleton" />
            <div className="flex-1 h-4 skeleton" />
            <div className="w-20 h-4 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopTracksTable({ data, isLoading }: TopTracksTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Tracks</h3>
        <div className="py-8 text-center text-gray-500">
          No track data available for this period
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((t) => t.revenue));

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Performing Tracks</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {data.length} tracks
        </span>
      </div>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Track
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                Revenue
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                Platforms
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((track, idx) => (
              <tr
                key={idx}
                className="table-row-hover group"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <td className="px-3 py-4">
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-200 text-gray-600' :
                    idx === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <Link
                    href={`/catalog?search=${encodeURIComponent(track.trackTitle)}`}
                    className="block group/link"
                  >
                    <div className="text-sm font-medium text-gray-900 group-hover/link:text-blue-600 truncate max-w-xs transition-colors">
                      {track.trackTitle}
                    </div>
                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${(track.revenue / maxRevenue) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {track.transactionCount.toLocaleString()} transactions
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-4 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(track.revenue)}
                  </span>
                </td>
                <td className="px-3 py-4 hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {track.platforms.slice(0, 3).map((platform, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full transition-colors hover:bg-blue-100"
                      >
                        {platform}
                      </span>
                    ))}
                    {track.platforms.length > 3 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                        +{track.platforms.length - 3}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
