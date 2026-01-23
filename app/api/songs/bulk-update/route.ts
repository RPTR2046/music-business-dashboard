import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/songs/bulk-update - Update multiple songs
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

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'No song IDs provided' }, { status: 400 });
    }

    if (!body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Validate all IDs are strings (UUIDs)
    const ids = body.ids.filter((id: unknown) => typeof id === 'string');

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid song IDs provided' }, { status: 400 });
    }

    // Only allow updating certain fields
    const allowedFields = ['artist_name', 'release_date', 'distributor', 'release_title'];
    const updateData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body.updates)) {
      if (allowedFields.includes(key)) {
        // Sanitize values
        if (key === 'artist_name' || key === 'distributor' || key === 'release_title') {
          updateData[key] = typeof value === 'string' && value.trim() ? value.trim() : null;
        } else if (key === 'release_date') {
          // Validate date format or set to null
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            updateData[key] = value;
          } else {
            updateData[key] = null;
          }
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update songs (only those belonging to the user)
    const { error, count } = await supabase
      .from('songs')
      .update(updateData)
      .eq('user_id', user.id)
      .in('id', ids);

    if (error) {
      console.error('Error updating songs:', error);
      return NextResponse.json({ error: 'Failed to update songs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: count || 0,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
