/**
 * PDF Export API
 *
 * Generates and returns a PDF report of dashboard data.
 */

import { NextRequest, NextResponse } from 'next/server';
import ReactPDF from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { ReportPDF } from '@/lib/exports/pdf-report';
import {
  aggregateByMonth,
  aggregateByPlatform,
  aggregateTopTracks,
  aggregateByIncomeType,
  aggregateByTerritory,
  getDefaultDateRange,
} from '@/lib/dashboard/aggregation';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get date range from query params
  const url = new URL(request.url);
  const defaultRange = getDefaultDateRange();
  const from = url.searchParams.get('from') || defaultRange.from;
  const to = url.searchParams.get('to') || defaultRange.to;

  try {
    // Fetch transactions for the period
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, reporting_period_start, platform_source, track_title, income_type, territory, created_at')
      .eq('user_id', user.id)
      .gte('reporting_period_start', from)
      .lte('reporting_period_start', to);

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Fetch summary counts
    const [songsResult, uploadsResult, unmatchedResult] = await Promise.all([
      supabase.from('songs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('uploads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('song_id', null),
    ]);

    // Calculate previous period for comparison
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodLength = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - periodLength);

    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gte('reporting_period_start', prevFrom.toISOString().split('T')[0])
      .lte('reporting_period_start', prevTo.toISOString().split('T')[0]);

    // Aggregate data
    const txData = transactions || [];
    const prevTxData = prevTransactions || [];

    const currentRevenue = txData.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const previousRevenue = prevTxData.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const revenueChangePercent =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : null;
    const transactionChangePercent =
      prevTxData.length > 0
        ? ((txData.length - prevTxData.length) / prevTxData.length) * 100
        : null;

    const incomeBreakdown = aggregateByIncomeType(txData);

    const dashboardData = {
      summary: {
        totalRevenue: Math.round(currentRevenue * 100) / 100,
        transactionCount: txData.length,
        songCount: songsResult.count || 0,
        uploadCount: uploadsResult.count || 0,
        unmatchedCount: unmatchedResult.count || 0,
      },
      comparison: {
        currentRevenue: Math.round(currentRevenue * 100) / 100,
        previousRevenue: Math.round(previousRevenue * 100) / 100,
        revenueChangePercent: revenueChangePercent !== null ? Math.round(revenueChangePercent * 10) / 10 : null,
        currentTransactions: txData.length,
        previousTransactions: prevTxData.length,
        transactionChangePercent: transactionChangePercent !== null ? Math.round(transactionChangePercent * 10) / 10 : null,
      },
      incomeBreakdown,
      revenueByMonth: aggregateByMonth(txData),
      revenueByPlatform: aggregateByPlatform(txData),
      revenueByTerritory: aggregateByTerritory(txData),
      topTracks: aggregateTopTracks(txData),
      recentActivity: [],
    };

    // Generate PDF
    const generatedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const pdfDocument = ReportPDF({
      data: dashboardData,
      dateRange: { from, to },
      generatedAt,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await ReactPDF.renderToBuffer(pdfDocument as any);

    // Return PDF with appropriate headers
    const filename = `royalty-report-${from}-to-${to}.pdf`;

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
