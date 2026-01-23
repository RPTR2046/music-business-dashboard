import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/songs/[id] - Get a single song
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: song, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  return NextResponse.json({ song });
}

// PATCH /api/songs/[id] - Update a song
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updateData.title = body.title.trim();
    }

    if (body.artist_name !== undefined) {
      updateData.artist_name = body.artist_name?.trim() || null;
    }

    if (body.release_date !== undefined) {
      updateData.release_date = body.release_date || null;
    }

    if (body.isrc !== undefined) {
      const isrc = body.isrc?.trim().toUpperCase() || null;
      if (isrc && !/^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(isrc.replace(/-/g, ''))) {
        return NextResponse.json(
          { error: 'Invalid ISRC format. Expected format: CC-XXX-YY-NNNNN or CCXXXYYNNNNN' },
          { status: 400 }
        );
      }
      updateData.isrc = isrc;
    }

    if (body.iswc !== undefined) {
      updateData.iswc = body.iswc?.trim().toUpperCase() || null;
    }

    if (body.upc !== undefined) {
      updateData.upc = body.upc?.trim() || null;
    }

    if (body.release_title !== undefined) {
      updateData.release_title = body.release_title?.trim() || null;
    }

    if (body.distributor !== undefined) {
      updateData.distributor = body.distributor?.trim() || null;
    }

    if (body.master_ownership_percent !== undefined) {
      updateData.master_ownership_percent = body.master_ownership_percent ?? null;
    }

    if (body.publishing_ownership_percent !== undefined) {
      updateData.publishing_ownership_percent = body.publishing_ownership_percent ?? null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: song, error } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating song:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A song with this ISRC already exists in your catalog' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
    }

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    return NextResponse.json({ song });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/songs/[id] - Delete a song
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
