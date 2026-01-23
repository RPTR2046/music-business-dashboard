import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the song
  const { data: song, error: songError } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // Get all transactions for this song
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('song_id', id)
    .eq('user_id', user.id)
    .order('reporting_period', { ascending: false });

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  const txList = transactions || [];

  // Calculate summary stats
  const lifetimeEarnings = txList.reduce((sum, tx) => sum + (tx.earnings || 0), 0);
  const totalStreams = txList.reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  // Get current and last month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthEarnings = txList
    .filter(tx => tx.reporting_period?.startsWith(currentMonth))
    .reduce((sum, tx) => sum + (tx.earnings || 0), 0);

  const lastMonthEarnings = txList
    .filter(tx => tx.reporting_period?.startsWith(lastMonth))
    .reduce((sum, tx) => sum + (tx.earnings || 0), 0);

  // Monthly revenue trend (last 12 months)
  const monthlyRevenue: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenue[key] = 0;
  }

  txList.forEach(tx => {
    if (tx.reporting_period) {
      const month = tx.reporting_period.substring(0, 7);
      if (monthlyRevenue.hasOwnProperty(month)) {
        monthlyRevenue[month] += tx.earnings || 0;
      }
    }
  });

  const revenueByMonth = Object.entries(monthlyRevenue).map(([month, earnings]) => ({
    month,
    earnings: Math.round(earnings * 100) / 100,
  }));

  // Platform breakdown
  const platformTotals: Record<string, number> = {};
  txList.forEach(tx => {
    const platform = tx.platform || 'Unknown';
    platformTotals[platform] = (platformTotals[platform] || 0) + (tx.earnings || 0);
  });

  const revenueByPlatform = Object.entries(platformTotals)
    .map(([platform, earnings]) => ({
      platform,
      earnings: Math.round(earnings * 100) / 100,
    }))
    .sort((a, b) => b.earnings - a.earnings);

  // Territory breakdown
  const territoryTotals: Record<string, number> = {};
  txList.forEach(tx => {
    const territory = tx.territory || 'Unknown';
    territoryTotals[territory] = (territoryTotals[territory] || 0) + (tx.earnings || 0);
  });

  const revenueByTerritory = Object.entries(territoryTotals)
    .map(([territory, earnings]) => ({
      territory,
      earnings: Math.round(earnings * 100) / 100,
    }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 20); // Top 20 territories

  // Recent transactions (paginated)
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  const recentTransactions = txList.slice(offset, offset + limit).map(tx => ({
    id: tx.id,
    platform: tx.platform,
    territory: tx.territory,
    reportingPeriod: tx.reporting_period,
    quantity: tx.quantity || 0,
    earnings: tx.earnings || 0,
  }));

  return NextResponse.json({
    song: {
      id: song.id,
      title: song.title,
      artistName: song.artist_name,
      isrc: song.isrc,
      iswc: song.iswc,
      upc: song.upc,
      releaseDate: song.release_date,
      distributor: song.distributor,
    },
    summary: {
      lifetimeEarnings: Math.round(lifetimeEarnings * 100) / 100,
      thisMonthEarnings: Math.round(thisMonthEarnings * 100) / 100,
      lastMonthEarnings: Math.round(lastMonthEarnings * 100) / 100,
      totalStreams,
      transactionCount: txList.length,
    },
    revenueByMonth,
    revenueByPlatform,
    revenueByTerritory,
    recentTransactions,
    pagination: {
      page,
      limit,
      total: txList.length,
      totalPages: Math.ceil(txList.length / limit),
    },
  });
}
