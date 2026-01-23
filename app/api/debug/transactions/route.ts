/**
 * Debug API for transactions
 * GET - Returns transaction counts and sample data
 * DELETE - Clears all transactions for the current user (use with caution!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get sample transactions
    const { data: sampleTransactions } = await supabase
      .from('transactions')
      .select('id, track_title, platform_source, reporting_period_start, amount, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get transactions by date
    const { data: byDate } = await supabase
      .from('transactions')
      .select('reporting_period_start')
      .eq('user_id', user.id);

    const dateCounts: Record<string, number> = {};
    for (const tx of byDate || []) {
      const date = tx.reporting_period_start;
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    }

    return NextResponse.json({
      totalCount,
      sampleTransactions,
      dateCounts,
      userId: user.id,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Failed to get debug info' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all transactions for this user
    const { error: deleteError, count } = await supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      deleted: count,
      message: `Deleted ${count} transactions`,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete transactions' }, { status: 500 });
  }
}
