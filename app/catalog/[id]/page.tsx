import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SongDetailClient from './SongDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SongDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify the song exists and belongs to this user
  const { data: song, error: songError } = await supabase
    .from('songs')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (songError || !song) {
    redirect('/catalog');
  }

  return <SongDetailClient songId={id} userEmail={user.email || ''} />;
}
