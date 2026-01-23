/**
 * Track Performance Export API Route
 *
 * GET /api/exports/track/[id]
 * Exports detailed performance data for a specific track as CSV.
 *
 * Query params:
 * - from: Start date (ISO format)
 * - to: End date (ISO format)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the song belongs to the user
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title, artist_name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 });
    }

    // Get transactions for this song
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('song_id', id)
      .eq('user_id', user.id)
      .gte('sale_month', from)
      .lte('sale_month', to)
      .order('sale_month', { ascending: false });

    if (error) {
      throw error;
    }

    // Generate CSV
    const headers = [
      'Date',
      'Platform',
      'Territory',
      'Track Title (Original)',
      'Quantity',
      'Earnings',
      'Match Method',
      'Match Confidence',
    ];

    const rows = (transactions || []).map((tx) => {
      return [
        tx.sale_month,
        escapeCSV(tx.platform),
        escapeCSV(tx.territory || ''),
        escapeCSV(tx.track_title),
        tx.quantity?.toString() || '0',
        tx.earnings?.toFixed(2) || '0.00',
        escapeCSV(tx.matched_by || ''),
        tx.match_confidence?.toString() || '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    const safeName = song.title.replace(/[^a-z0-9]/gi, '_');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${safeName}_performance_${from}_to_${to}.csv"`,
      },
    });
  } catch (error) {
    console.error('Track export error:', error);
    return NextResponse.json(
      { error: 'Failed to export track data' },
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
