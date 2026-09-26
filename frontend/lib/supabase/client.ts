import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Returns a Supabase client configured with the public anonymous key for browser usage.
 * Strictly avoids service-role keys to maintain client-side security.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Fine Stock] Supabase frontend credentials are not configured yet (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).'
      );
    }
    return null;
  }

  if (!clientInstance && supabaseUrl && supabaseAnonKey) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return clientInstance;
}
