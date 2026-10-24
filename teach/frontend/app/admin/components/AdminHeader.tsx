'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Shield, ChevronDown, Menu, X, ExternalLink } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';

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

  // Bloquer le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Logo + titre admin */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 group active:scale-95 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm text-slate-900">{BRAND.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                {isFr ? 'Administration' : 'Admin'}
              </span>
            </div>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">

          {/* Sélecteur langue (desktop) */}
          <div className="hidden md:flex items-center gap-1 mr-2 bg-slate-100/80 p-1 rounded-lg">
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                language === 'fr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              EN
            </button>
          </div>

          {/* Lien vitrine publique */}
          <Link
            href="/"
            className="hidden md:inline-flex items-center px-3 h-9 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            {isFr ? 'Voir le site' : 'View site'}
          </Link>

          {/* Dropdown user (desktop) */}
          <div className="hidden md:block relative ml-2" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 pl-2.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
              aria-label="Menu utilisateur"
            >
              <span className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                {initials}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform mr-1 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100">
                    <Shield className="w-2.5 h-2.5" />
                    {isFr ? 'Administrateur' : 'Administrator'}
                  </span>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 text-left transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {isFr ? 'Se déconnecter' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menu mobile (bouton hamburger) - Hit area 44x44px */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ─── DRAWER MOBILE ─── */}
      {/* Overlay sombre et flouté (opacité augmentée pour un vrai focus sur le menu) */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      
      {/* Panneau du menu */}
      <div
        className={`fixed top-0 right-0 z-50 h-[100dvh] w-[85vw] max-w-[320px] bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 bg-white shrink-0">
          <span className="font-bold text-slate-900">{isFr ? 'Administration' : 'Admin'}</span>
          
          {/* Bouton fermer - Hit area 44x44px */}
          <button
            onClick={() => setMobileOpen(false)}
            className="w-10 h-10 flex items-center justify-center -mr-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#fffafa]">
          {/* Profil */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                <Shield className="w-2.5 h-2.5" />
                Admin
              </span>
            </div>
          </div>

          {/* Langue */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {isFr ? 'Langue' : 'Language'}
            </p>
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setLanguage('fr')}
                className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-all ${
                  language === 'fr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Français
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-all ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Liens */}
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              {isFr ? 'Voir le site public' : 'View public site'}
            </Link>
          </div>
        </div>

        {/* Déconnexion */}
        <div className="border-t border-slate-100 p-5 bg-white shrink-0">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 h-12 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            {isFr ? 'Se déconnecter' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
}