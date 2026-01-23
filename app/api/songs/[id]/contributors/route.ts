/**
 * Song Contributors API
 *
 * Manages contributors and their splits for a specific song.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/songs/[id]/contributors - List all contributors for a song
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: songId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify song belongs to user
  const { data: song, error: songError } = await supabase
    .from('songs')
    .select('id')
    .eq('id', songId)
    .eq('user_id', user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // Get song contributors with contributor details
  const { data: songContributors, error: scError } = await supabase
    .from('song_contributors')
    .select(`
      id,
      role,
      split_percent,
      created_at,
      contributor:contributors (
        id,
        legal_name,
        pro_affiliation,
        ipi_cae_number
      )
    `)
    .eq('song_id', songId)
    .order('split_percent', { ascending: false });

  if (scError) {
    console.error('Error fetching song contributors:', scError);
    return NextResponse.json({ error: 'Failed to fetch contributors' }, { status: 500 });
  }

  // Calculate total split
  const totalSplit = (songContributors || []).reduce(
    (sum, sc) => sum + Number(sc.split_percent),
    0
  );

  return NextResponse.json({
    contributors: songContributors || [],
    totalSplit: Math.round(totalSplit * 100) / 100,
  });
}

// POST /api/songs/[id]/contributors - Add a contributor to a song
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: songId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify song belongs to user
  const { data: song, error: songError } = await supabase
    .from('songs')
    .select('id')
    .eq('id', songId)
    .eq('user_id', user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { contributorId, role, splitPercent } = body;

  // Validate required fields
  if (!contributorId) {
    return NextResponse.json({ error: 'Contributor ID is required' }, { status: 400 });
  }

  if (splitPercent === undefined || splitPercent === null) {
    return NextResponse.json({ error: 'Split percentage is required' }, { status: 400 });
  }

  const splitValue = Number(splitPercent);
  if (isNaN(splitValue) || splitValue < 0 || splitValue > 100) {
    return NextResponse.json({ error: 'Split percentage must be between 0 and 100' }, { status: 400 });
  }

  // Verify contributor belongs to user
  const { data: contributor, error: contribError } = await supabase
    .from('contributors')
    .select('id')
    .eq('id', contributorId)
    .eq('user_id', user.id)
    .single();

  if (contribError || !contributor) {
    return NextResponse.json({ error: 'Contributor not found' }, { status: 404 });
  }

  // Add song contributor
  const { data: songContributor, error: insertError } = await supabase
    .from('song_contributors')
    .insert({
      song_id: songId,
      contributor_id: contributorId,
      role: role || null,
      split_percent: splitValue,
    })
    .select(`
      id,
      role,
      split_percent,
      created_at,
      contributor:contributors (
        id,
        legal_name,
        pro_affiliation,
        ipi_cae_number
      )
    `)
    .single();

  if (insertError) {
    console.error('Error adding song contributor:', insertError);
    // Check for duplicate or validation errors
    if (insertError.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'This contributor already has this role on the song' },
        { status: 409 }
      );
    }
    if (insertError.message.includes('100')) {
      return NextResponse.json(
        { error: 'Total splits cannot exceed 100%' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to add contributor' }, { status: 500 });
  }

  return NextResponse.json(songContributor, { status: 201 });
}

// PUT /api/songs/[id]/contributors - Update a song contributor
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: songId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify song belongs to user
  const { data: song, error: songError } = await supabase
    .from('songs')
    .select('id')
    .eq('id', songId)
    .eq('user_id', user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { songContributorId, role, splitPercent } = body;

  if (!songContributorId) {
    return NextResponse.json({ error: 'Song contributor ID is required' }, { status: 400 });
  }

  // Build update object
  const updates: { role?: string | null; split_percent?: number } = {};

  if (role !== undefined) {
    updates.role = role || null;
  }

  if (splitPercent !== undefined && splitPercent !== null) {
    const splitValue = Number(splitPercent);
    if (isNaN(splitValue) || splitValue < 0 || splitValue > 100) {
      return NextResponse.json({ error: 'Split percentage must be between 0 and 100' }, { status: 400 });
    }
    updates.split_percent = splitValue;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  // Update song contributor
  const { data: updated, error: updateError } = await supabase
    .from('song_contributors')
    .update(updates)
    .eq('id', songContributorId)
    .eq('song_id', songId)
    .select(`
      id,
      role,
      split_percent,
      created_at,
      contributor:contributors (
        id,
        legal_name,
        pro_affiliation,
        ipi_cae_number
      )
    `)
    .single();

  if (updateError) {
    console.error('Error updating song contributor:', updateError);
    if (updateError.message.includes('100')) {
      return NextResponse.json(
        { error: 'Total splits cannot exceed 100%' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to update contributor' }, { status: 500 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/songs/[id]/contributors - Remove a contributor from a song
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: songId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify song belongs to user
  const { data: song, error: songError } = await supabase
    .from('songs')
    .select('id')
    .eq('id', songId)
    .eq('user_id', user.id)
    .single();

  if (songError || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // Get song contributor ID from query params
  const url = new URL(request.url);
  const songContributorId = url.searchParams.get('songContributorId');

  if (!songContributorId) {
    return NextResponse.json({ error: 'Song contributor ID is required' }, { status: 400 });
  }

  // Delete song contributor
  const { error: deleteError } = await supabase
    .from('song_contributors')
    .delete()
    .eq('id', songContributorId)
    .eq('song_id', songId);

  if (deleteError) {
    console.error('Error deleting song contributor:', deleteError);
    return NextResponse.json({ error: 'Failed to remove contributor' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
