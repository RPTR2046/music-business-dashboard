import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get unique track titles from unmatched transactions
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all unmatched transactions with artist and ISRC info
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('track_title, artist_name, isrc, platform_source')
    .eq('user_id', user.id)
    .is('song_id', null);

  if (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  // Group by track title and collect platforms, artist, isrc
  interface TrackInfo {
    platforms: Set<string>;
    artistName: string | null;
    isrc: string | null;
  }
  const trackMap = new Map<string, TrackInfo>();

  for (const tx of transactions || []) {
    const title = tx.track_title;
    if (!trackMap.has(title)) {
      trackMap.set(title, {
        platforms: new Set(),
        artistName: tx.artist_name || null,
        isrc: tx.isrc || null,
      });
    }
    const info = trackMap.get(title)!;
    info.platforms.add(tx.platform_source);
    // Use first non-null artist/isrc we find
    if (!info.artistName && tx.artist_name) {
      info.artistName = tx.artist_name;
    }
    if (!info.isrc && tx.isrc) {
      info.isrc = tx.isrc;
    }
  }

  // Get existing songs to check for duplicates
  const { data: existingSongs } = await supabase
    .from('songs')
    .select('title')
    .eq('user_id', user.id);

  const existingTitles = new Set(
    (existingSongs || []).map((s) => s.title.toLowerCase())
  );

  // Build result array
  const tracks = Array.from(trackMap.entries())
    .map(([title, info]) => ({
      title,
      artistName: info.artistName,
      isrc: info.isrc,
      platforms: Array.from(info.platforms),
      transactionCount: transactions?.filter((t) => t.track_title === title).length || 0,
      alreadyInCatalog: existingTitles.has(title.toLowerCase()),
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount);

  return NextResponse.json({
    tracks,
    summary: {
      total: tracks.length,
      newTracks: tracks.filter((t) => !t.alreadyInCatalog).length,
      existingTracks: tracks.filter((t) => t.alreadyInCatalog).length,
    },
  });
}

// POST - Bulk create songs from selected track titles
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!Array.isArray(body.tracks) || body.tracks.length === 0) {
      return NextResponse.json({ error: 'No tracks provided' }, { status: 400 });
    }

    // Validate and prepare song data
    const songsToCreate = body.tracks
      .filter((track: { title?: string; selected?: boolean }) =>
        track.selected !== false && track.title && typeof track.title === 'string'
      )
      .map((track: { title: string; artistName?: string; isrc?: string }) => ({
        user_id: user.id,
        title: track.title.trim(),
        artist_name: track.artistName?.trim() || null,
        isrc: track.isrc?.trim().toUpperCase() || null,
      }));

    if (songsToCreate.length === 0) {
      return NextResponse.json({ error: 'No valid tracks to create' }, { status: 400 });
    }

    // Insert songs (ignore duplicates)
    const { data: createdSongs, error } = await supabase
      .from('songs')
      .insert(songsToCreate)
      .select();

    if (error) {
      console.error('Error creating songs:', error);
      // Handle partial success - some may already exist
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Some songs already exist in your catalog', partial: true },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create songs' }, { status: 500 });
    }

    // Now auto-link transactions to newly created songs by title match
    let linkedCount = 0;
    for (const song of createdSongs || []) {
      // First update the transactions
      await supabase
        .from('transactions')
        .update({ song_id: song.id, matched_by: 'title_exact' })
        .eq('user_id', user.id)
        .eq('track_title', song.title)
        .is('song_id', null);

      // Then count how many were linked
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('song_id', song.id);

      linkedCount += count || 0;
    }

    return NextResponse.json({
      success: true,
      created: createdSongs?.length || 0,
      linked: linkedCount,
      songs: createdSongs,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
