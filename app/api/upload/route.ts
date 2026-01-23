/**
 * CSV Upload API Route
 *
 * Handles file upload, validation, parsing, and storage.
 * Returns parsed data for review before commit.
 *
 * POST /api/upload
 * - Accepts multipart/form-data with a 'file' field
 * - Returns: ParseResult with preview data and upload record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUploadFile } from '@/lib/upload/validation';
import { uploadToS3 } from '@/lib/upload/s3-upload';
import { parseCSV, validateCSV } from '@/lib/parsers';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for large files

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to upload files.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please select a CSV file to upload.' },
        { status: 400 }
      );
    }

    // Validate file metadata
    const fileValidation = validateUploadFile({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: 'File validation failed', details: fileValidation.errors },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Validate content structure
    const contentValidation = validateUploadFile(
      { size: file.size, type: file.type, name: file.name },
      content
    );

    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid CSV file', details: contentValidation.errors },
        { status: 400 }
      );
    }

    // Quick validation to detect format
    const quickValidation = validateCSV(content);
    if (!quickValidation.valid || quickValidation.source === 'unknown') {
      return NextResponse.json(
        {
          error: 'Unrecognized CSV format',
          details: quickValidation.errors.length > 0
            ? quickValidation.errors
            : ['File format not recognized. Supported formats: DistroKid, BMI, ASCAP'],
        },
        { status: 400 }
      );
    }

    // Parse the CSV
    const parseResult = parseCSV(content);

    if (parseResult.transactions.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid transactions found in file',
          details: parseResult.errors.slice(0, 10).map(e => e.message),
        },
        { status: 400 }
      );
    }

    // Upload original file to S3
    const s3Result = await uploadToS3(user.id, file.name, content);

    if (!s3Result.success) {
      return NextResponse.json(
        { error: 'Failed to store file', details: [s3Result.error || 'Unknown storage error'] },
        { status: 500 }
      );
    }

    // Create upload record in database (status: pending)
    const { data: uploadRecord, error: dbError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        source: parseResult.source,
        original_filename: file.name,
        s3_key: s3Result.s3Key,
        status: 'pending',
        transaction_count: parseResult.summary.successfulRows,
        total_revenue: parseResult.summary.totalEarnings,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating upload record:', dbError);
      return NextResponse.json(
        { error: 'Failed to create upload record', details: [dbError.message] },
        { status: 500 }
      );
    }

    // Return parse result with upload ID for confirmation step
    return NextResponse.json({
      uploadId: uploadRecord.id,
      source: parseResult.source,
      summary: parseResult.summary,
      preview: parseResult.transactions.slice(0, 50), // First 50 for preview
      errors: parseResult.errors.slice(0, 20), // First 20 errors
      hasMoreTransactions: parseResult.transactions.length > 50,
      hasMoreErrors: parseResult.errors.length > 20,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: [error instanceof Error ? error.message : 'An unexpected error occurred'],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 * Returns upload history for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get upload history
    const { data: uploads, error: dbError } = await supabase
      .from('uploads')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (dbError) {
      return NextResponse.json(
        { error: 'Failed to fetch upload history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ uploads });

  } catch (error) {
    console.error('Error fetching uploads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload history' },
      { status: 500 }
    );
  }
}
