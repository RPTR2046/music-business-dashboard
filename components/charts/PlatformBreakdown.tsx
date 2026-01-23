'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PlatformRevenue } from '@/lib/dashboard/types';

interface PlatformBreakdownProps {
  data: PlatformRevenue[];
  isLoading?: boolean;
}

// Transform data to include index signature for Recharts compatibility
interface ChartData {
  platform: string;
  revenue: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

function toChartData(data: PlatformRevenue[]): ChartData[] {
  return data.map((item) => ({
    platform: item.platform,
    revenue: item.revenue,
    percentage: item.percentage,
    color: item.color,
  }));
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartData }>;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900">{data.platform}</p>
      <p className="text-sm text-green-600">
        ${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-gray-500">{data.percentage.toFixed(1)}% of total</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="h-80 flex items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

interface LabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function renderCustomLabel(props: LabelProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

  // Guard against undefined values
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    percent === undefined
  ) {
    return null;
  }

  // Only show label for slices > 5%
  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function PlatformBreakdown({ data, isLoading }: PlatformBreakdownProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue by Platform</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No platform data available for this period
        </div>
      </div>
    );
  }

  const chartData = toChartData(data);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Revenue by Platform</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="revenue"
              nameKey="platform"
              label={renderCustomLabel}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value: string) => (
                <span className="text-sm text-gray-700">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
