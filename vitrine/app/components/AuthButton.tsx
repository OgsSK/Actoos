'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

// Lien vers le portail Actoos ID (à terme id.actoos.com, en attendant jobs.actoos.com)
const ACTOOS_ID_LOGIN_URL = 'https://jobs.actoos.com/connexion';
const ACTOOS_ID_ACCOUNT_URL = 'https://jobs.actoos.com/mon-compte';

type AuthUser = {
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
} | null;

export default function AuthButton() {
  const { language } = useLanguage();
  const tr = t[language];

  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Lecture de la session en arrière-plan (non bloquant)
    let cancelled = false;

    async function loadSession() {
      try {
        // Import dynamique pour ne pas charger Supabase si pas nécessaire
        const { createBrowserClient } = await import('@supabase/ssr').catch(() => ({ createBrowserClient: null }));

        if (!createBrowserClient) {
          // @supabase/ssr non installé → fallback
          if (!cancelled) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase.auth.getUser();

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
      } catch {
        // En cas d'erreur (Supabase down, réseau, etc.) → fallback silencieux
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

  // Pendant le chargement : afficher un placeholder discret (pas de blocage)
  if (loading) {
    return (
      <span className="inline-block w-24 h-9 rounded-full bg-slate-200 animate-pulse" aria-hidden />
    );
  }

  // Non connecté → lien vers Actoos ID
  if (!user) {
    return (
      <a
        href={ACTOOS_ID_LOGIN_URL}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-full hover:bg-slate-100 transition-colors"
      >
        {tr.navLogin}
      </a>
    );
  }

  // Connecté → avatar + menu
  const initials =
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') || user.email[0]?.toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label={tr.navAccount}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
            {initials}
          </span>
        )}
      </button>

      {menuOpen && (
        <>
          {/* Overlay pour fermer au clic extérieur */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
            <a
              href={ACTOOS_ID_ACCOUNT_URL}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {tr.navAccount}
            </a>
            <a
              href={ACTOOS_ID_ACCOUNT_URL + '/projets'}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {tr.navProjects}
            </a>
          </div>
        </>
      )}
    </div>
  );
}