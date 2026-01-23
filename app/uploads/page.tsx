import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UploadsClient from './UploadsClient';

export default async function UploadsPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch upload history
  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })
    .limit(50);

  return <UploadsClient initialUploads={uploads || []} userEmail={user.email || ''} />;
}
