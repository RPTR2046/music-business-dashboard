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
      <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-6 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
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
      <h3 className="text-lg font-semibold mb-4">Top Performing Tracks</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Track
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">
                Revenue
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                Platforms
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((track, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-3 text-sm text-gray-500">{idx + 1}</td>
                <td className="px-3 py-3">
                  <Link
                    href={`/catalog?search=${encodeURIComponent(track.trackTitle)}`}
                    className="block group"
                  >
                    <div className="text-sm font-medium text-blue-600 group-hover:text-blue-800 truncate max-w-xs">
                      {track.trackTitle}
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${(track.revenue / maxRevenue) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {track.transactionCount.toLocaleString()} transactions
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium">
                  {formatCurrency(track.revenue)}
                </td>
                <td className="px-3 py-3 hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {track.platforms.slice(0, 3).map((platform, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {platform}
                      </span>
                    ))}
                    {track.platforms.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
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
