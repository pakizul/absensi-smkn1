import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);
if (!supabaseReady && typeof window !== 'undefined') {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. Isi di .env.local atau Vercel > Environment Variables, lalu Redeploy.');
}

// Placeholder mencegah aplikasi crash saat env belum diisi; query tetap gagal dengan pesan error yang jelas.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');
