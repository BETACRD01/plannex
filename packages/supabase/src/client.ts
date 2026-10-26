import { createClient as createSupabaseClientJs, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js'
import { Database } from './types'

export type TypedSupabaseClient = SupabaseClient<Database>

export function createUniversalSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  options?: SupabaseClientOptions<'public'>
): TypedSupabaseClient {
  return createSupabaseClientJs<Database>(supabaseUrl, supabaseKey, options)
}
