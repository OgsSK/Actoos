import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthClientConfig } from './types.js';

export interface AuthClientSSRConfig extends AuthClientConfig {
  /**
   * Domaine du cookie de session.
   * Pour le SSO cross-domain, mettre ".actoos.com" (avec le point en préfixe).
   * Ignoré automatiquement sur localhost / 127.0.0.1 / *.local.
   */
  cookieDomain?: string;
}

/**
 * Variante SSR/SSO de createAuthClient.
 * Utilise les cookies (via @supabase/ssr) au lieu du localStorage.
 *
 * Avantages :
 * - Session partagée entre tous les sous-domaines (via cookieDomain)
 * - Compatible avec les Server Components / API routes Next.js
 *
 * Différences avec createAuthClient :
 * - Pas de storageKey configurable (le cookie a un nom standard)
 * - Le cookie est posé avec domain si fourni (SSO cross-domain)
 */
export function createAuthClientSSR(config: AuthClientSSRConfig) {
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local')
  );

  // Ne pas mettre de domain sur localhost (impossible de poser .actoos.com sur localhost)
  const cookieOptions = (!isLocalhost && config.cookieDomain)
    ? {
        domain: config.cookieDomain,
        path: '/',
        sameSite: 'lax' as const,
        secure: true,
      }
    : undefined;

  const supabase: SupabaseClient = createBrowserClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    cookieOptions ? { cookieOptions } : undefined
  );

  return {
    supabase,
    config,
  };
}

export type AuthClientSSR = ReturnType<typeof createAuthClientSSR>;