/**
 * Upload Confirm API Route
 *
 * POST /api/upload/[id]/confirm
 * Commits parsed transactions to the database after user review.
 *
 * Body:
 * - skipDuplicates: boolean - Whether to skip duplicate transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFileFromS3 } from '@/lib/upload/s3-upload';
import { parseCSV, NormalizedTransaction } from '@/lib/parsers';
import { matchTransactionsToSongs, Song } from '@/lib/matching';

export const runtime = 'nodejs';
export const maxDuration = 120; // Allow up to 2 minutes for large files

interface ConfirmRequestBody {
  skipDuplicates?: boolean;
  matchToSongs?: boolean; // Enable song matching
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

    // Parse request body
    const body: ConfirmRequestBody = await request.json().catch(() => ({}));
    const skipDuplicates = body.skipDuplicates ?? true;
    const matchToSongs = body.matchToSongs ?? true;

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

    if (upload.status !== 'pending') {
      return NextResponse.json(
        { error: `Upload has already been ${upload.status}` },
        { status: 400 }
      );
    }

    // Get file content from S3
    const content = await getFileFromS3(upload.s3_key);
    if (!content) {
      return NextResponse.json(
        { error: 'Failed to retrieve file from storage' },
        { status: 500 }
      );
    }

    // Parse the CSV again
    const parseResult = parseCSV(content);
    console.log(`[Confirm] Parsed ${parseResult.transactions.length} transactions from S3 file, content length: ${content.length}`);

    if (parseResult.transactions.length === 0) {
      return NextResponse.json(
        { error: 'No valid transactions to import' },
        { status: 400 }
      );
    }

    // Check for duplicates if skipDuplicates is enabled
    let transactionsToInsert = parseResult.transactions;
    let duplicateCount = 0;

    if (skipDuplicates) {
      const duplicateCheck = await checkForDuplicates(
        supabase,
        user.id,
        parseResult.transactions
      );
      transactionsToInsert = duplicateCheck.newTransactions;
      duplicateCount = duplicateCheck.duplicateCount;
    }

    if (transactionsToInsert.length === 0) {
      // All transactions are duplicates
      await supabase
        .from('uploads')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          transaction_count: 0,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: 'All transactions were duplicates. Nothing imported.',
        imported: 0,
        duplicatesSkipped: duplicateCount,
      });
    }

    // Match transactions to songs if enabled
    let matchingResults: Map<string, { songId: string; matchType: string; confidence: number }> | null = null;
    let matchingSummary = { matchedByIsrc: 0, matchedByTitle: 0, unmatched: 0 };

    if (matchToSongs) {
      // Get user's song catalog
      const { data: songs } = await supabase
        .from('songs')
        .select('id, title, artist_name, isrc')
        .eq('user_id', user.id);

      if (songs && songs.length > 0) {
        const songList: Song[] = songs.map((s) => ({
          id: s.id,
          title: s.title,
          artist_name: s.artist_name,
          isrc: s.isrc,
        }));

        const matchResult = matchTransactionsToSongs(transactionsToInsert, songList);
        matchingSummary = {
          matchedByIsrc: matchResult.matchedByIsrc,
          matchedByTitle: matchResult.matchedByTitle,
          unmatched: matchResult.unmatched,
        };

        // Create lookup map for matched songs
        matchingResults = new Map();
        for (const result of matchResult.results) {
          if (result.matchedSong && result.matchType) {
            const key = `${result.transaction.trackTitle}|${result.transaction.isrc || ''}`;
            matchingResults.set(key, {
              songId: result.matchedSong.id,
              matchType: result.matchType,
              confidence: result.matchConfidence,
            });
          }
        }
      }
    }

    // Insert transactions in batches
    const batchSize = 1000;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
      const batch = transactionsToInsert.slice(i, i + batchSize);

      const transactionRecords = batch.map((tx) => {
        // Check for song match
        const matchKey = `${tx.trackTitle}|${tx.isrc || ''}`;
        const match = matchingResults?.get(matchKey);

        // Store all parsed CSV fields for future feature development
        return {
          user_id: user.id,
          upload_id: id,
          song_id: match?.songId || null,
          track_title: tx.trackTitle,
          artist_name: tx.artistName || null,
          isrc: tx.isrc || null,
          upc: tx.upc || null,
          platform_source: tx.platform,
          reporting_period_start: `${tx.reportingPeriod}-01`, // Convert YYYY-MM to date
          amount: tx.earnings,
          quantity: tx.quantity || 0,
          ownership_percent: tx.ownershipPercentage || null,
          currency_code: 'USD',
          territory: tx.territory,
          usage_type: tx.usageType,
          income_type: tx.incomeType,
          royalty_type: tx.royaltyType,
          matched_by: match?.matchType || null,
          match_confidence: match?.confidence || null,
        };
      });

      const { error: insertError, data: insertedData } = await supabase
        .from('transactions')
        .insert(transactionRecords)
        .select('id');

      if (insertError) {
        console.error('Batch insert error:', insertError);
        errorCount += batch.length;

        // If it's a duplicate key error, try inserting one by one
        if (insertError.code === '23505') {
          for (const record of transactionRecords) {
            const { error: singleError } = await supabase
              .from('transactions')
              .insert(record);

            if (!singleError) {
              insertedCount++;
            } else {
              duplicateCount++;
            }
          }
        }
      } else {
        insertedCount += insertedData?.length || batch.length;
      }
    }

    // Update upload status
    const { error: updateError } = await supabase
      .from('uploads')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        transaction_count: insertedCount,
        total_revenue: transactionsToInsert.reduce((sum, tx) => sum + tx.earnings, 0),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update upload status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} transactions`,
      imported: insertedCount,
      duplicatesSkipped: duplicateCount,
      errors: errorCount,
      matching: matchToSongs ? matchingSummary : null,
    });

  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm upload' },
      { status: 500 }
    );
  }
}

/**
 * Normalize amount for comparison (round to 2 decimal places as cents)
 * This avoids floating point precision issues when comparing amounts
 */
function normalizeAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/**
 * Check for duplicate transactions in the database
 * Returns transactions that don't already exist
 */
async function checkForDuplicates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  transactions: NormalizedTransaction[]
): Promise<{
  newTransactions: NormalizedTransaction[];
  duplicateCount: number;
}> {
  // For efficiency, we'll check in batches by creating composite keys
  // and querying the database

  const compositeKeys = transactions.map((tx) => ({
    reportingPeriod: `${tx.reportingPeriod}-01`,
    trackTitle: tx.trackTitle,
    platform: tx.platform,
    amount: tx.earnings,
  }));

  // Get existing transactions for this user
  // We'll query by date range to limit the search
  const dates = [...new Set(compositeKeys.map((k) => k.reportingPeriod))];

  const { data: existingTransactions, error } = await supabase
    .from('transactions')
    .select('track_title, platform_source, reporting_period_start, amount')
    .eq('user_id', userId)
    .in('reporting_period_start', dates);

  if (error) {
    console.error('Error checking duplicates:', error);
    // If we can't check, proceed with all transactions
    return { newTransactions: transactions, duplicateCount: 0 };
  }

  console.log(`[Duplicate Check] Dates to check: ${dates.length}, Existing transactions found: ${existingTransactions?.length || 0}, New transactions: ${transactions.length}`);

  // Log sample of existing transactions for debugging
  if (existingTransactions && existingTransactions.length > 0) {
    console.log(`[Duplicate Check] Sample existing: ${JSON.stringify(existingTransactions.slice(0, 3))}`);
  }

  // Log sample of new transactions for debugging
  if (transactions.length > 0) {
    console.log(`[Duplicate Check] Sample new: ${JSON.stringify(transactions.slice(0, 3).map(tx => ({
      reportingPeriod: tx.reportingPeriod,
      trackTitle: tx.trackTitle,
      platform: tx.platform,
      earnings: tx.earnings
    })))}`);
  }

  // Create a set of existing composite keys for fast lookup
  // Use normalized amounts to avoid floating point precision issues
  const existingKeys = new Set(
    (existingTransactions || []).map(
      (tx) =>
        `${tx.reporting_period_start}|${tx.track_title}|${tx.platform_source}|${normalizeAmount(tx.amount)}`
    )
  );

  console.log(`[Duplicate Check] Existing keys count: ${existingKeys.size}`);

  // Filter out duplicates
  const newTransactions: NormalizedTransaction[] = [];
  let duplicateCount = 0;
  let firstDuplicateKey: string | null = null;

  for (const tx of transactions) {
    const key = `${tx.reportingPeriod}-01|${tx.trackTitle}|${tx.platform}|${normalizeAmount(tx.earnings)}`;

    if (existingKeys.has(key)) {
      duplicateCount++;
      if (!firstDuplicateKey) {
        firstDuplicateKey = key;
      }
    } else {
      newTransactions.push(tx);
      // Add to set to catch duplicates within the same file
      existingKeys.add(key);
    }
  }

  console.log(`[Duplicate Check] Result: ${newTransactions.length} new, ${duplicateCount} duplicates`);
  if (firstDuplicateKey) {
    console.log(`[Duplicate Check] First duplicate key: ${firstDuplicateKey}`);
  }

  return { newTransactions, duplicateCount };
}
