import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportsClient from './ReportsClient';

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get songs for the track performance dropdown
  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, artist_name')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  return <ReportsClient userEmail={user.email || ''} songs={songs || []} />;
}
