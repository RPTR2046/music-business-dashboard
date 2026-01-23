/**
 * Dashboard Stats API Route
 *
 * GET /api/dashboard/stats
 * Returns aggregated dashboard data with optional date range filtering.
 *
 * Query params:
 * - from: Start date (ISO 8601 date string, e.g., "2024-01-01")
 * - to: End date (ISO 8601 date string, e.g., "2024-12-31")
 * - incomeType: Filter by income type ('master' or 'publishing')
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  aggregateByMonth,
  aggregateByPlatform,
  aggregateTopTracks,
  aggregateByIncomeType,
  getDefaultDateRange,
  TransactionRow,
} from '@/lib/dashboard/aggregation';
import { DashboardStatsResponse, RecentActivity } from '@/lib/dashboard/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse date range and filters from query params
    const searchParams = request.nextUrl.searchParams;
    const defaultRange = getDefaultDateRange();
    // Empty string means "no filter" (All time), null means use default
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const from = fromParam === '' ? null : (fromParam || defaultRange.from);
    const to = toParam === '' ? null : (toParam || defaultRange.to);
    const incomeType = searchParams.get('incomeType'); // 'master' or 'publishing'

    // Fetch transactions within date range
    let transactionsQuery = supabase
      .from('transactions')
      .select('amount, reporting_period_start, platform_source, track_title, created_at, income_type, royalty_type')
      .eq('user_id', user.id)
      .order('reporting_period_start', { ascending: false });

    if (from) {
      transactionsQuery = transactionsQuery.gte('reporting_period_start', from);
    }
    if (to) {
      transactionsQuery = transactionsQuery.lte('reporting_period_start', to);
    }
    if (incomeType) {
      transactionsQuery = transactionsQuery.eq('income_type', incomeType);
    }

    const { data: transactions, error: txError } = await transactionsQuery;

    if (txError) {
      throw txError;
    }

    const txData = (transactions || []) as TransactionRow[];

    // Fetch summary counts (not filtered by date for total counts)
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

    // Calculate total revenue for filtered period
    const totalRevenue = txData.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Aggregate data for charts
    const revenueByMonth = aggregateByMonth(txData);
    const revenueByPlatform = aggregateByPlatform(txData);
    const topTracks = aggregateTopTracks(txData, 10);
    const incomeBreakdown = aggregateByIncomeType(txData);

    // Fetch recent activity (uploads and high-value transactions)
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
    const limitedActivity = recentActivity.slice(0, 10);

    const response: DashboardStatsResponse = {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        transactionCount: totalTransactionCount || 0,
        songCount: songCount || 0,
        uploadCount: uploadCount || 0,
        unmatchedCount: unmatchedCount || 0,
      },
      incomeBreakdown,
      revenueByMonth,
      revenueByPlatform,
      topTracks,
      recentActivity: limitedActivity,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
