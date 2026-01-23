/**
 * Royalty Anomaly Detection
 *
 * Detects unusual patterns in royalty data that may indicate issues.
 */

export interface Anomaly {
  type: 'revenue_drop' | 'missing_platform' | 'unusual_spike' | 'no_recent_activity';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface MonthlyData {
  month: string;
  revenue: number;
  platforms: Set<string>;
}

interface TransactionRow {
  amount: number;
  reporting_period_start: string | null;
  platform_source: string | null;
}

/**
 * Groups transactions by month for analysis
 */
function groupByMonth(transactions: TransactionRow[]): Map<string, MonthlyData> {
  const monthlyMap = new Map<string, MonthlyData>();

  for (const tx of transactions) {
    if (!tx.reporting_period_start) continue;

    const month = tx.reporting_period_start.slice(0, 7); // YYYY-MM
    const existing = monthlyMap.get(month) || {
      month,
      revenue: 0,
      platforms: new Set<string>(),
    };

    existing.revenue += tx.amount || 0;
    if (tx.platform_source) {
      existing.platforms.add(tx.platform_source);
    }

    monthlyMap.set(month, existing);
  }

  return monthlyMap;
}

/**
 * Detects significant revenue drops month-over-month
 */
function detectRevenueDrops(monthlyData: Map<string, MonthlyData>): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const months = Array.from(monthlyData.keys()).sort();

  if (months.length < 2) return anomalies;

  for (let i = 1; i < months.length; i++) {
    const prevMonth = monthlyData.get(months[i - 1])!;
    const currMonth = monthlyData.get(months[i])!;

    if (prevMonth.revenue === 0) continue;

    const changePercent = ((currMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;

    // Flag drops of 50% or more
    if (changePercent <= -50) {
      const severity = changePercent <= -75 ? 'high' : 'medium';
      anomalies.push({
        type: 'revenue_drop',
        severity,
        title: `Revenue dropped ${Math.abs(changePercent).toFixed(0)}% in ${formatMonth(currMonth.month)}`,
        description: `Revenue fell from $${prevMonth.revenue.toFixed(2)} to $${currMonth.revenue.toFixed(2)} compared to the previous month.`,
        metadata: {
          month: currMonth.month,
          previousMonth: prevMonth.month,
          previousRevenue: prevMonth.revenue,
          currentRevenue: currMonth.revenue,
          changePercent,
        },
      });
    }
  }

  return anomalies;
}

/**
 * Detects unusual revenue spikes that might indicate errors
 */
function detectRevenueSpikes(monthlyData: Map<string, MonthlyData>): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const months = Array.from(monthlyData.keys()).sort();

  if (months.length < 3) return anomalies;

  // Calculate average excluding the last month
  const values = months.slice(0, -1).map((m) => monthlyData.get(m)!.revenue);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  const lastMonth = monthlyData.get(months[months.length - 1])!;

  // Flag if latest month is 3x the average
  if (avg > 0 && lastMonth.revenue > avg * 3) {
    anomalies.push({
      type: 'unusual_spike',
      severity: 'medium',
      title: `Unusual revenue spike in ${formatMonth(lastMonth.month)}`,
      description: `Revenue of $${lastMonth.revenue.toFixed(2)} is significantly higher than average ($${avg.toFixed(2)}). This might be a new deal, viral moment, or data entry issue.`,
      metadata: {
        month: lastMonth.month,
        revenue: lastMonth.revenue,
        average: avg,
        multiplier: lastMonth.revenue / avg,
      },
    });
  }

  return anomalies;
}

/**
 * Detects platforms that were present but are now missing
 */
function detectMissingPlatforms(monthlyData: Map<string, MonthlyData>): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const months = Array.from(monthlyData.keys()).sort();

  if (months.length < 3) return anomalies;

  // Get platforms from earlier months (excluding the last 2)
  const historicalPlatforms = new Set<string>();
  for (let i = 0; i < months.length - 2; i++) {
    const data = monthlyData.get(months[i])!;
    data.platforms.forEach((p) => historicalPlatforms.add(p));
  }

  // Get platforms from recent months (last 2)
  const recentPlatforms = new Set<string>();
  for (let i = Math.max(0, months.length - 2); i < months.length; i++) {
    const data = monthlyData.get(months[i])!;
    data.platforms.forEach((p) => recentPlatforms.add(p));
  }

  // Find platforms that disappeared
  const missingPlatforms: string[] = [];
  historicalPlatforms.forEach((platform) => {
    if (!recentPlatforms.has(platform)) {
      missingPlatforms.push(platform);
    }
  });

  if (missingPlatforms.length > 0) {
    anomalies.push({
      type: 'missing_platform',
      severity: missingPlatforms.length >= 2 ? 'high' : 'medium',
      title: `Missing data from ${missingPlatforms.length} platform${missingPlatforms.length > 1 ? 's' : ''}`,
      description: `No recent transactions from: ${missingPlatforms.join(', ')}. This might indicate delayed statements or unclaimed royalties.`,
      metadata: {
        missingPlatforms,
        lastSeenMonths: months.slice(-2),
      },
    });
  }

  return anomalies;
}

/**
 * Detects if there's been no recent activity
 */
function detectNoRecentActivity(
  monthlyData: Map<string, MonthlyData>,
  currentDate: Date = new Date()
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const months = Array.from(monthlyData.keys()).sort();

  if (months.length === 0) return anomalies;

  const lastMonth = months[months.length - 1];
  const lastMonthDate = new Date(lastMonth + '-01');
  const monthsDiff =
    (currentDate.getFullYear() - lastMonthDate.getFullYear()) * 12 +
    (currentDate.getMonth() - lastMonthDate.getMonth());

  // Flag if no data for 3+ months (accounting for typical 2-month reporting delay)
  if (monthsDiff >= 3) {
    anomalies.push({
      type: 'no_recent_activity',
      severity: monthsDiff >= 6 ? 'high' : 'medium',
      title: `No transactions for ${monthsDiff} months`,
      description: `The last reported earnings were from ${formatMonth(lastMonth)}. This might indicate missing uploads or uncollected royalties.`,
      metadata: {
        lastMonth,
        monthsSinceActivity: monthsDiff,
      },
    });
  }

  return anomalies;
}

/**
 * Format month string for display
 */
function formatMonth(month: string): string {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Main function to detect all anomalies
 */
export function detectAnomalies(transactions: TransactionRow[]): Anomaly[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const monthlyData = groupByMonth(transactions);

  const anomalies: Anomaly[] = [
    ...detectRevenueDrops(monthlyData),
    ...detectRevenueSpikes(monthlyData),
    ...detectMissingPlatforms(monthlyData),
    ...detectNoRecentActivity(monthlyData),
  ];

  // Sort by severity (high first)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return anomalies;
}

/**
 * Get summary stats for the anomaly detection results
 */
export function getAnomalySummary(anomalies: Anomaly[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    total: anomalies.length,
    high: anomalies.filter((a) => a.severity === 'high').length,
    medium: anomalies.filter((a) => a.severity === 'medium').length,
    low: anomalies.filter((a) => a.severity === 'low').length,
  };
}
