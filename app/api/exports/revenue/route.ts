/**
 * Revenue Export API Route
 *
 * GET /api/exports/revenue
 * Exports revenue data as CSV with filtering options.
 *
 * Query params:
 * - from: Start date (ISO format)
 * - to: End date (ISO format)
 * - platform: Optional platform filter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkRateLimit,
  rateLimitHeaders,
  rateLimitExceededResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit for exports (20 per hour)
    const rateLimitResult = checkRateLimit(
      `export:${user.id}`,
      RATE_LIMITS.export
    );

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult.resetAt);
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const platform = searchParams.get('platform');

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        id,
        track_title,
        platform,
        territory,
        quantity,
        earnings,
        sale_month,
        song_id,
        songs (
          title,
          artist_name
        )
      `)
      .eq('user_id', user.id)
      .gte('sale_month', from)
      .lte('sale_month', to)
      .order('sale_month', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    // Generate CSV
    const headers = [
      'Date',
      'Track Title',
      'Artist',
      'Platform',
      'Territory',
      'Quantity',
      'Earnings',
      'Linked Song',
    ];

    const rows = (transactions || []).map((tx) => {
      // songs is a single object when using foreign key join (not an array)
      const song = tx.songs as unknown as { title: string; artist_name: string | null } | null;
      return [
        tx.sale_month,
        escapeCSV(tx.track_title),
        escapeCSV(song?.artist_name || ''),
        escapeCSV(tx.platform),
        escapeCSV(tx.territory || ''),
        tx.quantity?.toString() || '0',
        tx.earnings?.toFixed(2) || '0.00',
        escapeCSV(song?.title || 'Unlinked'),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="revenue_export_${from}_to_${to}.csv"`,
        ...rateLimitHeaders(
          rateLimitResult.remaining,
          rateLimitResult.resetAt,
          RATE_LIMITS.export.maxRequests
        ),
      },
    });
  } catch (error) {
    console.error('Revenue export error:', error);
    return NextResponse.json(
      { error: 'Failed to export revenue data' },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }
  return escaped;
}
