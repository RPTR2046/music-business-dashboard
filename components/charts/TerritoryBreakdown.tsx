'use client';

import { TerritoryRevenue } from '@/lib/dashboard/types';

interface TerritoryBreakdownProps {
  data: TerritoryRevenue[];
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

function ChartSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-3 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TerritoryBreakdown({ data, isLoading }: TerritoryBreakdownProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  // Filter out unknown territories and take top 8
  const filteredData = data
    .filter((t) => t.territory !== 'Unknown' && t.territory !== '')
    .slice(0, 8);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Territories</h3>
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No territory data available for this period
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...filteredData.map((t) => t.revenue));

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Top Territories</h3>
      <div className="space-y-3">
        {filteredData.map((territory, index) => {
          const barWidth = maxRevenue > 0 ? (territory.revenue / maxRevenue) * 100 : 0;

          return (
            <div key={territory.territory} className="group">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                    {territory.territoryName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(territory.revenue)}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {territory.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {data.length > 8 && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          +{data.length - 8} more territories
        </p>
      )}
    </div>
  );
}
