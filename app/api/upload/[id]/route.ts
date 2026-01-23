/**
 * Upload Detail API Route
 *
 * GET /api/upload/[id] - Get upload details
 * DELETE /api/upload/[id] - Cancel/delete a pending upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedDownloadUrl, getFileFromS3 } from '@/lib/upload/s3-upload';
import { parseCSV } from '@/lib/parsers';

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

    // For pending uploads, also return parsed data for review
    let summary = null;
    let preview: Array<{
      trackTitle: string;
      artistName: string;
      platform: string;
      earnings: number;
      reportingPeriod: string;
      isrc: string | null;
      upc: string | null;
      quantity: number;
      territory: string | null;
      ownershipPercentage: number;
    }> = [];
    let errors: Array<{ row: number; message: string }> = [];
    let hasMoreTransactions = false;
    let hasMoreErrors = false;

    if (upload.status === 'pending' && upload.s3_key) {
      try {
        const content = await getFileFromS3(upload.s3_key);
        if (content) {
          const parseResult = parseCSV(content);
          summary = parseResult.summary;

          // Return first 20 transactions as preview
          preview = parseResult.transactions.slice(0, 20).map((tx) => ({
            trackTitle: tx.trackTitle,
            artistName: tx.artistName || '',
            platform: tx.platform,
            earnings: tx.earnings,
            reportingPeriod: tx.reportingPeriod,
            isrc: tx.isrc || null,
            upc: tx.upc || null,
            quantity: tx.quantity || 0,
            territory: tx.territory || null,
            ownershipPercentage: tx.ownershipPercentage || 100,
          }));
          hasMoreTransactions = parseResult.transactions.length > 20;

          // Return first 10 errors
          errors = parseResult.errors.slice(0, 10).map((e) => ({
            row: e.row,
            message: e.message,
          }));
          hasMoreErrors = parseResult.errors.length > 10;
        }
      } catch (e) {
        console.error('Failed to parse CSV for preview:', e);
      }
    }

    return NextResponse.json({
      upload: {
        ...upload,
        downloadUrl,
        actualTransactionCount: transactionCount || 0,
      },
      summary,
      preview,
      errors,
      hasMoreTransactions,
      hasMoreErrors,
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
