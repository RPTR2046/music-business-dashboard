/**
 * Contributors API
 *
 * Manages the user's list of contributors (collaborators, writers, producers).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/contributors - List all contributors for the user
export async function GET() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all contributors for user
  const { data: contributors, error } = await supabase
    .from('contributors')
    .select('id, legal_name, pro_affiliation, ipi_cae_number, created_at, updated_at')
    .eq('user_id', user.id)
    .order('legal_name', { ascending: true });

  if (error) {
    console.error('Error fetching contributors:', error);
    return NextResponse.json({ error: 'Failed to fetch contributors' }, { status: 500 });
  }

  return NextResponse.json({ contributors: contributors || [] });
}

// POST /api/contributors - Create a new contributor
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { legalName, proAffiliation, ipiCaeNumber } = body;

  // Validate required fields
  if (!legalName || typeof legalName !== 'string' || legalName.trim().length === 0) {
    return NextResponse.json({ error: 'Legal name is required' }, { status: 400 });
  }

  // Validate PRO affiliation if provided
  const validPROs = ['BMI', 'ASCAP', 'SESAC', 'SOCAN', 'PRS', 'GEMA', 'SACEM', 'Other'];
  if (proAffiliation && !validPROs.includes(proAffiliation)) {
    return NextResponse.json(
      { error: `Invalid PRO. Must be one of: ${validPROs.join(', ')}` },
      { status: 400 }
    );
  }

  // Validate IPI/CAE number format if provided (9-11 digits)
  if (ipiCaeNumber) {
    const cleanIpi = String(ipiCaeNumber).replace(/\D/g, '');
    if (cleanIpi.length < 9 || cleanIpi.length > 11) {
      return NextResponse.json(
        { error: 'IPI/CAE number must be 9-11 digits' },
        { status: 400 }
      );
    }
  }

  // Create contributor
  const { data: contributor, error: insertError } = await supabase
    .from('contributors')
    .insert({
      user_id: user.id,
      legal_name: legalName.trim(),
      pro_affiliation: proAffiliation || null,
      ipi_cae_number: ipiCaeNumber ? String(ipiCaeNumber).replace(/\D/g, '') : null,
    })
    .select('id, legal_name, pro_affiliation, ipi_cae_number, created_at')
    .single();

  if (insertError) {
    console.error('Error creating contributor:', insertError);
    if (insertError.message.includes('duplicate') || insertError.code === '23505') {
      return NextResponse.json(
        { error: 'A contributor with this name and IPI number already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create contributor' }, { status: 500 });
  }

  return NextResponse.json(contributor, { status: 201 });
}

// PUT /api/contributors - Update a contributor
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, legalName, proAffiliation, ipiCaeNumber } = body;

  if (!id) {
    return NextResponse.json({ error: 'Contributor ID is required' }, { status: 400 });
  }

  // Build update object
  const updates: {
    legal_name?: string;
    pro_affiliation?: string | null;
    ipi_cae_number?: string | null;
  } = {};

  if (legalName !== undefined) {
    if (typeof legalName !== 'string' || legalName.trim().length === 0) {
      return NextResponse.json({ error: 'Legal name cannot be empty' }, { status: 400 });
    }
    updates.legal_name = legalName.trim();
  }

  if (proAffiliation !== undefined) {
    const validPROs = ['BMI', 'ASCAP', 'SESAC', 'SOCAN', 'PRS', 'GEMA', 'SACEM', 'Other', ''];
    if (proAffiliation && !validPROs.includes(proAffiliation)) {
      return NextResponse.json({ error: 'Invalid PRO affiliation' }, { status: 400 });
    }
    updates.pro_affiliation = proAffiliation || null;
  }

  if (ipiCaeNumber !== undefined) {
    if (ipiCaeNumber) {
      const cleanIpi = String(ipiCaeNumber).replace(/\D/g, '');
      if (cleanIpi.length < 9 || cleanIpi.length > 11) {
        return NextResponse.json(
          { error: 'IPI/CAE number must be 9-11 digits' },
          { status: 400 }
        );
      }
      updates.ipi_cae_number = cleanIpi;
    } else {
      updates.ipi_cae_number = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  // Update contributor
  const { data: updated, error: updateError } = await supabase
    .from('contributors')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, legal_name, pro_affiliation, ipi_cae_number, created_at, updated_at')
    .single();

  if (updateError) {
    console.error('Error updating contributor:', updateError);
    if (updateError.message.includes('duplicate') || updateError.code === '23505') {
      return NextResponse.json(
        { error: 'A contributor with this name and IPI number already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to update contributor' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Contributor not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/contributors - Delete a contributor
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get contributor ID from query params
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Contributor ID is required' }, { status: 400 });
  }

  // Delete contributor (will cascade to song_contributors)
  const { error: deleteError } = await supabase
    .from('contributors')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error deleting contributor:', deleteError);
    return NextResponse.json({ error: 'Failed to delete contributor' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
