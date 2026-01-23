/**
 * Unmatched Transactions API Route
 *
 * GET /api/transactions/unmatched
 * Returns transactions that don't have a linked song_id (needs review).
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - groupBy: Group by title to show unique tracks (default: false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const groupBy = searchParams.get('groupBy') === 'true';
    const offset = (page - 1) * limit;

    if (groupBy) {
      // Get unique unmatched tracks with aggregated data
      const { data, error, count } = await supabase
        .from('transactions')
        .select('track_title, platform_source, amount, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .is('song_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Group by track title
      const grouped = new Map<string, {
        trackTitle: string;
        transactionCount: number;
        totalEarnings: number;
        platforms: Set<string>;
        latestDate: string;
      }>();

      for (const tx of data || []) {
        const key = tx.track_title.toLowerCase();
        if (!grouped.has(key)) {
          grouped.set(key, {
            trackTitle: tx.track_title,
            transactionCount: 0,
            totalEarnings: 0,
            platforms: new Set(),
            latestDate: tx.created_at,
          });
        }
        const group = grouped.get(key)!;
        group.transactionCount++;
        group.totalEarnings += tx.amount;
        group.platforms.add(tx.platform_source);
        if (tx.created_at > group.latestDate) {
          group.latestDate = tx.created_at;
        }
      }

      // Convert to array and paginate
      const groupedArray = Array.from(grouped.values())
        .map(g => ({
          ...g,
          platforms: Array.from(g.platforms),
        }))
        .sort((a, b) => b.totalEarnings - a.totalEarnings);

      const paginatedGroups = groupedArray.slice(offset, offset + limit);

      return NextResponse.json({
        transactions: paginatedGroups,
        pagination: {
          page,
          limit,
          total: groupedArray.length,
          totalPages: Math.ceil(groupedArray.length / limit),
        },
        summary: {
          uniqueTracks: groupedArray.length,
          totalTransactions: count || 0,
          totalEarnings: groupedArray.reduce((sum, g) => sum + g.totalEarnings, 0),
        },
      });
    }

    // Get individual unmatched transactions
    const { data, error, count } = await supabase
      .from('transactions')
      .select('id, track_title, platform_source, amount, reporting_period_start, territory, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .is('song_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get summary stats
    const { data: summaryData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .is('song_id', null);

    const totalEarnings = (summaryData || []).reduce((sum, tx) => sum + tx.amount, 0);

    return NextResponse.json({
      transactions: (data || []).map(tx => ({
        id: tx.id,
        trackTitle: tx.track_title,
        platform: tx.platform_source,
        earnings: tx.amount,
        reportingPeriod: tx.reporting_period_start?.slice(0, 7), // YYYY-MM
        territory: tx.territory,
        createdAt: tx.created_at,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary: {
        totalTransactions: count || 0,
        totalEarnings,
      },
    });
  } catch (error) {
    console.error('Unmatched transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unmatched transactions' },
      { status: 500 }
    );
  }
}
