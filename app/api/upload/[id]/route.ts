/**
 * Upload Detail API Route
 *
 * GET /api/upload/[id] - Get upload details
 * DELETE /api/upload/[id] - Cancel/delete a pending upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedDownloadUrl } from '@/lib/upload/s3-upload';

export async function GET(
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

    // Get upload record
    const { data: upload, error: dbError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (dbError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Generate signed URL for downloading original file
    let downloadUrl: string | null = null;
    if (upload.s3_key) {
      try {
        downloadUrl = await getSignedDownloadUrl(upload.s3_key);
      } catch (e) {
        console.error('Failed to generate download URL:', e);
      }
    }

    // Get transaction count for this upload
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', id);

    return NextResponse.json({
      upload: {
        ...upload,
        downloadUrl,
        actualTransactionCount: transactionCount || 0,
      },
    });

  } catch (error) {
    console.error('Error fetching upload:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel a pending upload or rollback a completed one
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

    // Get upload record
    const { data: upload, error: dbError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (dbError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    if (upload.status === 'pending') {
      // For pending uploads, just delete the record
      const { error: deleteError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to cancel upload' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Upload cancelled' });
    }

    if (upload.status === 'completed') {
      // For completed uploads, this is a rollback operation
      // Delete all transactions associated with this upload
      const { error: txDeleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('upload_id', id);

      if (txDeleteError) {
        return NextResponse.json(
          { error: 'Failed to rollback transactions' },
          { status: 500 }
        );
      }

      // Update upload status to rolled_back
      const { error: updateError } = await supabase
        .from('uploads')
        .update({ status: 'rolled_back' })
        .eq('id', id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update upload status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Upload rolled back successfully',
      });
    }

    return NextResponse.json(
      { error: `Cannot delete upload with status: ${upload.status}` },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error deleting upload:', error);
    return NextResponse.json(
      { error: 'Failed to delete upload' },
      { status: 500 }
    );
  }
}
