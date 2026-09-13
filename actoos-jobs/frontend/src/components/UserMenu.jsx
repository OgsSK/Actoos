import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User as UserIcon, Settings, LogOut, Shield, Bell, LayoutDashboard, ChevronDown,
} from 'lucide-react';
import { clearAll } from '@actoos/auth-client';
import { supabase } from '../lib/supabase';

const ACTOOS_ID_BASE = process.env.NODE_ENV === 'production'
  ? 'https://id.actoos.com'
  : 'http://localhost:3001';

const ACCOUNT_URL = `${ACTOOS_ID_BASE}/account`;

const UserMenu = ({
  user,
  profile,
  isAdmin,
  isCandidate,
  isCompany,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await supabase.auth.signOut();
      clearAll();
    } catch (e) {
      console.warn('[UserMenu] signOut failed:', e);
    }
    if (onLogout) onLogout();
  };

  if (!user) return null;

  const firstName = profile?.first_name || user?.user_metadata?.first_name || '';
  const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
  const displayEmail = user?.email || '';

  const getInitials = () => {
    const fn = firstName || displayEmail.split('@')[0] || '';
    const ln = lastName || '';
    const init = (fn.charAt(0) + ln.charAt(0)).toUpperCase();
    return init || fn.slice(0, 2).toUpperCase() || '?';
  };

  const initials = getInitials();
  const profileLink = isCompany ? '/dashboard/entreprise/profil' : '/profil';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[320px] sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-200/60 z-50 overflow-hidden max-h-[85vh] overflow-y-auto">

            {/* Compte actif */}
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                </div>
              </div>
            </div>

            {/* Actions produit */}
            <div className="py-1">
              <button
                onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">{t('header.user.dashboard')}</span>
              </button>

              <button
                onClick={() => { setMenuOpen(false); navigate(profileLink); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">{t('header.user.profile')}</span>
              </button>

              {isCandidate && (
                <button
                  onClick={() => { setMenuOpen(false); navigate('/alertes'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700">{t('header.user.createAlert')}</span>
                </button>
              )}

              <button
                onClick={() => { setMenuOpen(false); navigate('/parametres'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">{t('header.user.settings')}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => { setMenuOpen(false); navigate('/admin'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-slate-700">{t('header.user.admin')}</span>
                </button>
              )}
            </div>

            {/* Mon compte Actoos */}
            <div className="border-t border-slate-100 py-1">
              <a
                href={ACCOUNT_URL}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">
                  {t('header.user.menu.actoosAccount', { defaultValue: 'Mon compte Actoos' })}
                </span>
              </a>
            </div>

            {/* Déconnexion */}
            <div className="border-t border-slate-100 py-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">{t('header.user.logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;