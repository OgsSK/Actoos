import { createAuthClientSSR } from '@actoos/auth-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: ReturnType<typeof createAuthClientSSR> | null = null;

if (!_client) {
  _client = createAuthClientSSR({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    appName: 'actoos-id',
    cookieDomain: process.env.NODE_ENV === 'production' ? '.actoos.com' : undefined,
  });
}

export const authClient = _client;
export const supabase = _client.supabase;
export default _client;