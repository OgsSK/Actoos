'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Settings, Shield, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';

const ACTOOS_ID_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://id.actoos.com'
    : 'http://localhost:3001';

export default function AdminHeader() {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isFr = language === 'fr';

  const displayName =
    [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
      .filter(Boolean)
      .join(' ') ||
    user?.email?.split('@')[0] ||
    'Admin';

  const initials =
    (
      (user?.user_metadata?.first_name?.[0] ?? '') +
      (user?.user_metadata?.last_name?.[0] ?? '')
    ).toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?';

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0);
    document.addEventListener('keydown', esc);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen]);

  // Fermer mobile au change de route
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Logo + titre admin */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm text-white">{BRAND.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {isFr ? 'Administration' : 'Admin'}
              </span>
            </div>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">

          {/* Sélecteur langue (desktop) */}
          <div className="hidden md:flex items-center gap-0.5 mr-1">
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                language === 'fr' ? 'text-white bg-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                language === 'en' ? 'text-white bg-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Lien vitrine publique */}
          <Link
            href="/"
            className="hidden md:inline-flex items-center px-3 h-9 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isFr ? 'Voir le site' : 'View site'}
          </Link>

          {/* Dropdown user (desktop) */}
          <div className="hidden md:block relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Menu utilisateur"
            >
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                    <Shield className="w-2.5 h-2.5" />
                    {isFr ? 'Administrateur' : 'Administrator'}
                  </span>
                </div>
                <a
                  href={`${ACTOOS_ID_BASE}/account`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  {isFr ? 'Gérer mon compte' : 'Manage my account'}
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-slate-100 text-left transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {isFr ? 'Se déconnecter' : 'Sign out'}
                </button>
              </div>
            )}
          </div>

          {/* Menu mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity md:hidden ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-slate-900 transform transition-transform duration-300 md:hidden flex flex-col ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
          <span className="font-bold text-white">{isFr ? 'Administration' : 'Admin'}</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Profil */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800">
            <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Langue */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {isFr ? 'Langue' : 'Language'}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  language === 'fr' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Français
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  language === 'en' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Liens */}
          <div className="space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {isFr ? 'Voir le site public' : 'View public site'}
            </Link>
            <a
              href={`${ACTOOS_ID_BASE}/account`}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {isFr ? 'Gérer mon compte' : 'Manage my account'}
            </a>
          </div>
        </div>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {isFr ? 'Se déconnecter' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
}