'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import { createAuthClientSSR } from '@actoos/auth-client';

const ACTOOS_ID_BASE = process.env.NODE_ENV === 'production'
  ? 'https://id.actoos.com'
  : 'http://localhost:3001';

const LOGIN_URL = `${ACTOOS_ID_BASE}/login`;
const ACCOUNT_URL = `${ACTOOS_ID_BASE}/account`;

type AuthUser = {
  email: string;
  firstName?: string;
  lastName?: string;
} | null;

let _client: ReturnType<typeof createAuthClientSSR> | null = null;
function getClient() {
  if (_client) return _client;
  _client = createAuthClientSSR({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    appName: 'teach',
    cookieDomain: process.env.NODE_ENV === 'production' ? '.actoos.com' : undefined,
  });
  return _client;
}

export default function AuthButton() {
  const { language } = useLanguage();
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const client = getClient();
        const { data } = await client.supabase.auth.getUser();
        if (cancelled) return;
        if (data?.user) {
          const meta = data.user.user_metadata ?? {};
          setUser({
            email: data.user.email ?? '',
            firstName: meta.first_name,
            lastName: meta.last_name,
          });
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <span className="inline-block w-24 h-9 rounded-full bg-slate-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-full hover:bg-slate-100 transition-colors"
      >
        {t[language].navLogin}
      </a>
    );
  }

  const initials = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') || user.email[0]?.toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="inline-flex items-center gap-2 p-0.5 rounded-full hover:opacity-90 transition-opacity"
      >
        <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
          {initials}
        </span>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
            <a href="/dashboard" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              {t[language].navDashboard}
            </a>
            <a href={ACCOUNT_URL} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              {t[language].navAccount}
            </a>
            <button
              onClick={async () => {
                await getClient().supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100"
            >
              {t[language].dashboardLogout}
            </button>
          </div>
        </>
      )}
    </div>
  );
}