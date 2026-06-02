import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://icfkacmdwzvdctmncecp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wc9enqDFTP-3Zn0u4y2RTg_IVbHlvmm';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
