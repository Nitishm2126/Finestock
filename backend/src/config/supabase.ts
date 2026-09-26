import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient: SupabaseClient | null = null;

const isSupabaseConfigured = Boolean(
  config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)
);

if (isSupabaseConfigured) {
  const supabaseKey = config.supabase.serviceRoleKey || config.supabase.anonKey || '';
  try {
    supabaseClient = createClient(config.supabase.url as string, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialize Supabase client:', (err as Error).message);
    supabaseClient = null;
  }
} else {
  // Non-sensitive logging that environment variables are not yet populated
  console.log('[Supabase] Credentials not configured. Running in unconfigured mode.');
}

export type SupabaseStatus = 'connected' | 'not_configured' | 'connection_error';

export interface SupabaseHealthResult {
  status: SupabaseStatus;
  configured: boolean;
  details?: string;
}

/**
 * Checks connectivity with Supabase without exposing credentials or sensitive data.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return {
      status: 'not_configured',
      configured: false,
      details: 'Supabase URL or keys are not configured in environment variables',
    };
  }

  try {
    // Perform a lightweight request to verify the Supabase instance is reachable
    const { error } = await supabaseClient.auth.getSession();
    if (error) {
      return {
        status: 'connection_error',
        configured: true,
        details: 'Failed to communicate with Supabase instance',
      };
    }

    return {
      status: 'connected',
      configured: true,
    };
  } catch {
    return {
      status: 'connection_error',
      configured: true,
      details: 'Network error communicating with Supabase',
    };
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}
