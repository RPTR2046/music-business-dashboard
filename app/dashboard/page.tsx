import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import {
  aggregateByMonth,
  aggregateByPlatform,
  aggregateByTerritory,
  aggregateTopTracks,
  aggregateByIncomeType,
  getDefaultDateRange,
  TransactionRow,
} from '@/lib/dashboard/aggregation';
import { DashboardStatsResponse, RecentActivity, PeriodComparison } from '@/lib/dashboard/types';

/**
 * Calculate the previous period date range based on the current period
 */
function getPreviousPeriodRange(from: string, to: string): { prevFrom: string; prevTo: string } {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodMs = toDate.getTime() - fromDate.getTime();

  const prevTo = new Date(fromDate.getTime() - 1); // Day before current period starts
  const prevFrom = new Date(prevTo.getTime() - periodMs);

  return {
    prevFrom: prevFrom.toISOString().slice(0, 10),
    prevTo: prevTo.toISOString().slice(0, 10),
  };
}

function calculateChangePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get date range from URL params or defaults
  const params = await searchParams;
  const defaultRange = getDefaultDateRange();
  const from = params.from || defaultRange.from;
  const to = params.to || defaultRange.to;

  // Fetch transactions within date range
  let transactionsQuery = supabase
    .from('transactions')
    .select('amount, reporting_period_start, platform_source, track_title, created_at, income_type, royalty_type, territory')
    .eq('user_id', user.id)
    .order('reporting_period_start', { ascending: false });

  if (from) {
    transactionsQuery = transactionsQuery.gte('reporting_period_start', from);
  }
  if (to) {
    transactionsQuery = transactionsQuery.lte('reporting_period_start', to);
  }

  const { data: transactions } = await transactionsQuery;
  const txData = (transactions || []) as TransactionRow[];

  // Fetch summary counts
  const [
    { count: totalTransactionCount },
    { count: songCount },
    { count: uploadCount },
    { count: unmatchedCount },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('song_id', null),
  ]);

  // Calculate totals and aggregations
  const totalRevenue = txData.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const currentTransactionCount = txData.length;
  const revenueByMonth = aggregateByMonth(txData);
  const revenueByPlatform = aggregateByPlatform(txData);
  const revenueByTerritory = aggregateByTerritory(txData, 10);
  const topTracks = aggregateTopTracks(txData, 10);
  const incomeBreakdown = aggregateByIncomeType(txData);

  // Calculate period comparison
  let comparison: PeriodComparison | null = null;
  if (from && to) {
    const { prevFrom, prevTo } = getPreviousPeriodRange(from, to);

    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gte('reporting_period_start', prevFrom)
      .lte('reporting_period_start', prevTo);

    const prevTxData = prevTransactions || [];
    const previousRevenue = prevTxData.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const previousTransactions = prevTxData.length;

    comparison = {
      currentRevenue: Math.round(totalRevenue * 100) / 100,
      previousRevenue: Math.round(previousRevenue * 100) / 100,
      revenueChangePercent: calculateChangePercent(totalRevenue, previousRevenue),
      currentTransactions: currentTransactionCount,
      previousTransactions,
      transactionChangePercent: calculateChangePercent(currentTransactionCount, previousTransactions),
    };
  }

  // Fetch recent activity
  const [{ data: recentUploads }, { data: recentTransactions }] = await Promise.all([
    supabase
      .from('uploads')
      .select('id, original_filename, source, total_revenue, uploaded_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('uploaded_at', { ascending: false })
      .limit(5),
    supabase
      .from('transactions')
      .select('id, track_title, platform_source, amount, created_at')
      .eq('user_id', user.id)
      .order('amount', { ascending: false })
      .limit(5),
  ]);

  // Combine and format recent activity
  const recentActivity: RecentActivity[] = [];

  for (const upload of recentUploads || []) {
    recentActivity.push({
      type: 'upload',
      title: upload.original_filename,
      description: `Imported from ${upload.source}`,
      amount: upload.total_revenue,
      createdAt: upload.uploaded_at,
    });
  }

  for (const tx of recentTransactions || []) {
    recentActivity.push({
      type: 'transaction',
      title: tx.track_title,
      description: `Via ${tx.platform_source}`,
      amount: tx.amount,
      createdAt: tx.created_at,
    });
  }

  // Sort by date and limit
  recentActivity.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const initialData: DashboardStatsResponse = {
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      transactionCount: totalTransactionCount || 0,
      songCount: songCount || 0,
      uploadCount: uploadCount || 0,
      unmatchedCount: unmatchedCount || 0,
    },
    comparison,
    incomeBreakdown,
    revenueByMonth,
    revenueByPlatform,
    revenueByTerritory,
    topTracks,
    recentActivity: recentActivity.slice(0, 10),
  };

  return <DashboardClient initialData={initialData} userEmail={user.email || ''} />;
}
