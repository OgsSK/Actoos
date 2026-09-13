'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import { createAuthClientSSR, clearAll } from '@actoos/auth-client';
import { Settings, FolderOpen, LogOut, X } from 'lucide-react';

const ACTOOS_ID_BASE = process.env.NODE_ENV === 'production'
  ? 'https://id.actoos.com'
  : 'http://localhost:3001';

const LOGIN_URL = `${ACTOOS_ID_BASE}/login`;
const ACCOUNT_URL = `${ACTOOS_ID_BASE}/account`;

let _client: ReturnType<typeof createAuthClientSSR> | null = null;
function getClient() {
  if (_client) return _client;
  _client = createAuthClientSSR({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    appName: 'vitrine',
    cookieDomain: process.env.NODE_ENV === 'production' ? '.actoos.com' : undefined,
  });
  return _client;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function AuthButton() {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<{ email: string; firstName?: string; lastName?: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = getClient();
        const { data } = await client.supabase.auth.getSession();
        const session = data.session;
        if (cancelled) return;

        if (session?.user) {
          const meta = session.user.user_metadata || {};
          setUser({
            email: session.user.email || '',
            firstName: meta.first_name,
            lastName: meta.last_name,
            avatarUrl: meta.avatar_url,
          });
          setAvatarError(false);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthButton] session error:', err);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fermer au clic extérieur (desktop)
  useEffect(() => {
    if (!menuOpen || isMobile) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen, isMobile]);

    const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      clearAll();
    } catch (e) {
      console.warn('[AuthButton] signOut failed:', e);
    }
    setMenuOpen(false);
    window.location.href = '/';
  };

  const loginHref = `${LOGIN_URL}?redirect=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : 'https://actoos.com/'
  )}`;

  if (loading) {
    return <span className="inline-block w-24 h-9 rounded-full bg-slate-200 animate-pulse" aria-hidden />;
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
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') ||
    user.email[0]?.toUpperCase() ||
    '?';

  const menuContent = (
    <>
      {/* Compte actif */}
      <div className="px-4 py-3 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Actions produit */}
      <div className="border-t border-slate-100">
        <a
          href={ACCOUNT_URL}
          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <Settings size={16} className="text-slate-500" />
          <span className="text-sm text-slate-700">
            {language === 'fr' ? 'Mon compte Actoos' : 'My Actoos account'}
          </span>
        </a>
        <a
          href="https://actoos.com/studio/account"
          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <FolderOpen size={16} className="text-slate-500" />
          <span className="text-sm text-slate-700">
            {language === 'fr' ? 'Mes projets' : 'My projects'}
          </span>
        </a>
      </div>

      {/* Déconnexion */}
      <div className="border-t border-slate-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
        >
          <LogOut size={16} className="text-red-500" />
          <span className="text-sm text-red-600">
            {language === 'fr' ? 'Se déconnecter' : 'Sign out'}
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="inline-flex items-center gap-2 p-0.5 rounded-full hover:opacity-90 active:opacity-75 transition-opacity"
        aria-label="Mon compte"
      >
        {user.avatarUrl && !avatarError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
            {initials}
          </span>
        )}
      </button>

      {/* MOBILE : Bottom Sheet */}
      {menuOpen && isMobile && mounted && createPortal(
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            <div className="flex justify-center pt-3 pb-2 shrink-0 border-b border-slate-100 relative">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
              <button
                onClick={() => setMenuOpen(false)}
                className="absolute top-2 right-3 p-2 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {menuContent}
            </div>
            <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
          </div>
        </>,
        document.body
      )}

      {/* DESKTOP : Dropdown */}
      {menuOpen && !isMobile && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
            {menuContent}
          </div>
        </>
      )}
    </div>
  );
}