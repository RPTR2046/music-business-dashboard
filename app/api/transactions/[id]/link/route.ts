/**
 * Link Transaction to Song API Route
 *
 * POST /api/transactions/[id]/link
 * Links a transaction to a song in the catalog.
 *
 * Body:
 * - songId: UUID of the song to link
 *
 * POST /api/transactions/[id]/link with { linkAll: true }
 * Links all transactions with the same track title to the specified song.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface LinkRequestBody {
  songId: string;
  linkAll?: boolean; // Link all transactions with the same title
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: LinkRequestBody = await request.json();
    const { songId, linkAll } = body;

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    // Verify the song belongs to the user
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title')
      .eq('id', songId)
      .eq('user_id', user.id)
      .single();

    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Get the transaction to link
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('id, track_title, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    let linkedCount = 0;

    if (linkAll) {
      // Link all transactions with the same track title
      const { data: updated, error: updateError } = await supabase
        .from('transactions')
        .update({
          song_id: songId,
          matched_by: 'manual',
          match_confidence: 100,
        })
        .eq('user_id', user.id)
        .ilike('track_title', transaction.track_title) // Case-insensitive match
        .is('song_id', null) // Only update unlinked transactions
        .select('id');

      if (updateError) {
        throw updateError;
      }

      linkedCount = updated?.length || 0;
    } else {
      // Link just this transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          song_id: songId,
          matched_by: 'manual',
          match_confidence: 100,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      linkedCount = 1;
    }

    return NextResponse.json({
      success: true,
      linkedCount,
      message: `Linked ${linkedCount} transaction${linkedCount !== 1 ? 's' : ''} to "${song.title}"`,
    });
  } catch (error) {
    console.error('Link transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to link transaction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transactions/[id]/link
 * Unlinks a transaction from its song.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        song_id: null,
        matched_by: null,
        match_confidence: null,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction unlinked from song',
    });
  } catch (error) {
    console.error('Unlink transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to unlink transaction' },
      { status: 500 }
    );
  }
}
