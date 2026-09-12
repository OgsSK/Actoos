'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import { createAuthClientSSR } from '@actoos/auth-client';

const ACTOOS_ID_BASE = 'https://id.actoos.com';
const ACTOOS_ID_LOGIN_URL = `${ACTOOS_ID_BASE}/login`;
const ACTOOS_ID_ACCOUNT_URL = `${ACTOOS_ID_BASE}/account`;

type AuthUser = {
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
} | null;

export default function AuthButton() {
  const { language } = useLanguage();
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          if (!cancelled) setLoading(false);
          return;
        }

        // On utilise EXACTEMENT le même client que celui du AuthContext
        // (createAuthClientSSR → cookies .actoos.com en prod)
        const client = createAuthClientSSR({
          supabaseUrl,
          supabaseAnonKey,
          appName: 'vitrine',
          cookieDomain: process.env.NODE_ENV === 'production' ? '.actoos.com' : undefined,
        });

        const { data } = await client.supabase.auth.getUser();
        if (cancelled) return;

        if (data?.user) {
          const meta = data.user.user_metadata ?? {};
          setUser({
            email: data.user.email ?? '',
            firstName: meta.first_name,
            lastName: meta.last_name,
            avatarUrl: meta.avatar_url,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthButton] session error:', err);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginHref = `${ACTOOS_ID_LOGIN_URL}?redirect=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : 'https://actoos.com/'
  )}`;

  if (loading) {
    return (
      <span className="inline-block w-24 h-9 rounded-full bg-slate-200 animate-pulse" aria-hidden />
    );
  }

  if (!user) {
    return (
      <a
        href={loginHref}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-full hover:bg-slate-100 transition-colors"
      >
        {t[language].navLogin}
      </a>
    );
  }

  const initials =
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') || user.email[0]?.toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label={t[language].navAccount}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
            {initials}
          </span>
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
            <a
              href={ACTOOS_ID_ACCOUNT_URL}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t[language].navAccount}
            </a>
            <a
              href="https://actoos.com/studio/account"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t[language].navMyProjects}
            </a>
          </div>
        </>
      )}
    </div>
  );
}