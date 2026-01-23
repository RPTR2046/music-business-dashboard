/**
 * Download Original File API Route
 *
 * GET /api/upload/[id]/download
 * Returns a signed S3 URL for downloading the original uploaded file.
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
      .select('s3_key, original_filename, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (dbError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Generate signed URL (expires in 15 minutes)
    const signedUrl = await getSignedDownloadUrl(upload.s3_key);

    return NextResponse.json({
      url: signedUrl,
      filename: upload.original_filename,
    });
  } catch (error) {
    console.error('Download URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
