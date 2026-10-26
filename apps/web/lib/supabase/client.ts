import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@workspace/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(url, anonKey) as unknown as SupabaseClient<Database>;
}
