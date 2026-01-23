'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MonthlyRevenue } from '@/lib/dashboard/types';
import { formatMonthLabel } from '@/lib/dashboard/aggregation';

interface RevenueChartProps {
  data: MonthlyRevenue[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: MonthlyRevenue }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900">
        {label ? formatMonthLabel(label) : ''}
      </p>
      <p className="text-sm text-green-600">
        ${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-gray-500">
        {data.transactionCount.toLocaleString()} transactions
      </p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="h-80 bg-gray-100 rounded animate-pulse flex items-end justify-around px-4 pb-8">
        {[40, 65, 45, 80, 55, 70, 60, 85, 50, 75, 65, 90].map((h, i) => (
          <div
            key={i}
            className="w-6 bg-gray-200 rounded-t animate-pulse"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No revenue data available for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickFormatter={formatMonthLabel}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickFormatter={formatCurrency}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={{ stroke: '#E5E7EB' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
