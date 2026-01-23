/**
 * Anomaly Detection API
 *
 * Returns detected anomalies in the user's royalty data.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectAnomalies, getAnomalySummary } from '@/lib/analytics/anomaly-detection';

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

  try {
    // Fetch all transactions for the user (last 24 months is sufficient)
    const twoYearsAgo = new Date();
    twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, reporting_period_start, platform_source')
      .eq('user_id', user.id)
      .gte('reporting_period_start', twoYearsAgo.toISOString().split('T')[0])
      .order('reporting_period_start', { ascending: true });

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Detect anomalies
    const anomalies = detectAnomalies(transactions || []);
    const summary = getAnomalySummary(anomalies);

    return NextResponse.json({
      anomalies,
      summary,
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to detect anomalies' },
      { status: 500 }
    );
  }
}
