/**
 * Catalog Export API Route
 *
 * GET /api/exports/catalog
 * Exports all song metadata as CSV.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkRateLimit,
  rateLimitHeaders,
  rateLimitExceededResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit for exports (20 per hour)
    const rateLimitResult = checkRateLimit(
      `export:${user.id}`,
      RATE_LIMITS.export
    );

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult.resetAt);
    }

    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .eq('user_id', user.id)
      .order('title', { ascending: true });

    if (error) {
      throw error;
    }

    // Generate CSV
    const headers = [
      'Title',
      'Artist Name',
      'ISRC',
      'UPC',
      'Album',
      'Label',
      'Release Date',
      'Genre',
      'Composer',
      'Writer Share %',
      'Publisher Share %',
      'Created At',
    ];

    const rows = (songs || []).map((song) => {
      return [
        escapeCSV(song.title),
        escapeCSV(song.artist_name),
        escapeCSV(song.isrc),
        escapeCSV(song.upc),
        escapeCSV(song.album),
        escapeCSV(song.label),
        song.release_date || '',
        escapeCSV(song.genre),
        escapeCSV(song.composer),
        song.writer_share?.toString() || '',
        song.publisher_share?.toString() || '',
        song.created_at ? new Date(song.created_at).toISOString().slice(0, 10) : '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="catalog_export_${today}.csv"`,
        ...rateLimitHeaders(
          rateLimitResult.remaining,
          rateLimitResult.resetAt,
          RATE_LIMITS.export.maxRequests
        ),
      },
    });
  } catch (error) {
    console.error('Catalog export error:', error);
    return NextResponse.json(
      { error: 'Failed to export catalog' },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }
  return escaped;
}
