import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/songs - List all songs for the user
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get query params for pagination
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('songs')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Add search filter if provided
  if (search) {
    query = query.or(`title.ilike.%${search}%,artist_name.ilike.%${search}%,isrc.ilike.%${search}%`);
  }

  // Add pagination
  query = query.range(offset, offset + limit - 1);

  const { data: songs, error, count } = await query;

  if (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }

  return NextResponse.json({
    songs: songs || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

// POST /api/songs - Create a new song
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

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Prepare song data
    const songData = {
      user_id: user.id,
      title: body.title.trim(),
      artist_name: body.artist_name?.trim() || null,
      release_date: body.release_date || null,
      isrc: body.isrc?.trim().toUpperCase() || null,
      iswc: body.iswc?.trim().toUpperCase() || null,
      upc: body.upc?.trim() || null,
      release_title: body.release_title?.trim() || null,
      distributor: body.distributor?.trim() || null,
      master_ownership_percent: body.master_ownership_percent ?? null,
      publishing_ownership_percent: body.publishing_ownership_percent ?? null,
    };

    // Validate ISRC format if provided (loose validation)
    if (songData.isrc && !/^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(songData.isrc.replace(/-/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid ISRC format. Expected format: CC-XXX-YY-NNNNN or CCXXXYYNNNNN' },
        { status: 400 }
      );
    }

    const { data: song, error } = await supabase
      .from('songs')
      .insert(songData)
      .select()
      .single();

    if (error) {
      console.error('Error creating song:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A song with this ISRC already exists in your catalog' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
    }

    return NextResponse.json({ song }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
