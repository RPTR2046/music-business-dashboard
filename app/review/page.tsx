import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReviewClient from './ReviewClient';

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get user's songs for the link dropdown
  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, artist_name, isrc')
    .eq('user_id', user.id)
    .order('title');

  return (
    <ReviewClient
      userEmail={user.email || ''}
      songs={songs || []}
    />
  );
}
