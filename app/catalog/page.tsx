import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CatalogClient from './CatalogClient';

export default async function CatalogPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch songs and unmatched count in parallel
  const [{ data: songs }, { count: unmatchedCount }] = await Promise.all([
    supabase
      .from('songs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('song_id', null),
  ]);

  return (
    <CatalogClient
      initialSongs={songs || []}
      userEmail={user.email || ''}
      unmatchedCount={unmatchedCount || 0}
    />
  );
}
