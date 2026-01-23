import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/songs/bulk-delete - Delete multiple songs
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

    // Validate all IDs are strings (UUIDs)
    const ids = body.ids.filter((id: unknown) => typeof id === 'string');

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid song IDs provided' }, { status: 400 });
    }

    // Delete songs (only those belonging to the user)
    const { error, count } = await supabase
      .from('songs')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .in('id', ids);

    if (error) {
      console.error('Error deleting songs:', error);
      return NextResponse.json({ error: 'Failed to delete songs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: count || 0,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
