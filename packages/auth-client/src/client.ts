import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthClientConfig } from './types.js';

export function createAuthClient(config: AuthClientConfig) {
  const supabase: SupabaseClient = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: `actoos-auth-${config.appName}`,
        flowType: 'pkce',
      },
    }
  );

  return {
    supabase,
    config,
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;