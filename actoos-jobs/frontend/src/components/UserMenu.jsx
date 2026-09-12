import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Settings, LogOut, Check, User as UserIcon, Shield, Bell,
  Building2, LayoutDashboard, ChevronDown,
} from 'lucide-react';
import { Badge } from './ui/badge';
import {
  getLinkedAccounts,
  setActiveAccountId,
  buildLinkedAccount,
  upsertLinkedAccount,
  removeLinkedAccount,
  clearAllLinkedAccounts,
  sortAccountsByUsage,
} from '@actoos/auth-client';
import { supabase } from '../lib/supabase';

const ACTOOS_ID_BASE = process.env.NODE_ENV === 'production'
  ? 'https://id.actoos.com'
  : 'http://localhost:3001';

const LOGIN_URL = `${ACTOOS_ID_BASE}/login`;
const ACCOUNT_URL = `${ACTOOS_ID_BASE}/account`;

const UserMenu = ({
  user,
  profile,
  isAdmin,
  isCandidate,
  isCompany,
  activeCompanyId,
  activeCompanyName,
  activeCompanyPlan,
  activeCompanyCycle,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentAccount, setCurrentAccount] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef(null);

  const refreshState = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        const account = buildLinkedAccount(session.user, session);
        upsertLinkedAccount(account);
        setActiveAccountId(account.userId);
        setCurrentAccount(account);
      } else {
        setCurrentAccount(null);
        setActiveAccountId(null);
      }

      setLinkedAccounts(sortAccountsByUsage(getLinkedAccounts()));
    } catch (err) {
      console.error('[UserMenu] refresh error:', err);
    }
  }, []);

  useEffect(() => {
    refreshState();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshState();
    });
    return () => subscription.unsubscribe();
  }, [refreshState]);

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

  const handleSwitch = async (userId) => {
    if (switching || userId === currentAccount?.userId) return;
    setSwitching(true);
    try {
      const account = getLinkedAccounts().find(a => a.userId === userId);
      if (!account) throw new Error('Account not found');

      const { error } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });
      if (error) throw error;

      upsertLinkedAccount({ ...account, lastUsedAt: Date.now() });
      setActiveAccountId(userId);
      setMenuOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('[UserMenu] switch failed:', err);
      alert(t('header.user.menu.switchError'));
      setSwitching(false);
    }
  };

  const handleRemove = async (userId) => {
    const wasActive = userId === currentAccount?.userId;
    const remaining = removeLinkedAccount(userId);
    const sorted = sortAccountsByUsage(remaining);
    setLinkedAccounts(sorted);

    if (wasActive) {
      if (sorted.length > 0) {
        await handleSwitch(sorted[0].userId);
      } else {
        await supabase.auth.signOut();
        clearAllLinkedAccounts();
        window.location.href = '/';
      }
    }
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      await supabase.auth.signOut();
      clearAllLinkedAccounts();
      window.location.href = '/';
    }
  };

  const handleAddAccount = () => {
    const redirect = typeof window !== 'undefined' ? window.location.href : 'https://jobs.actoos.com/';
    window.location.href = `${LOGIN_URL}?addAccount=1&redirect=${encodeURIComponent(redirect)}`;
  };

  const firstName = profile?.first_name || user?.user_metadata?.first_name || '';
  const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
  const displayEmail = user?.email || '';

  const initials = (() => {
    const fn = firstName || displayEmail.split('@')[0] || '';
    const ln = lastName || '';
    const init = (fn.charAt(0) + ln.charAt(0)).toUpperCase();
    return init || fn.slice(0, 2).toUpperCase() || '?';
  })();

  const otherAccounts = linkedAccounts.filter(a => a.userId !== currentAccount?.userId);
  const hasMultiple = linkedAccounts.length > 1;
  const profileLink = isCompany ? '/dashboard/entreprise/profil' : '/profil';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors"
        aria-label={t('header.user.menu.title')}
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[340px] sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/60 z-20 overflow-hidden max-h-[85vh] overflow-y-auto">

            {/* Compte actif */}
            <div className="px-3 py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                </div>
                <Check size={14} className="text-emerald-600 shrink-0" />
              </div>
            </div>

            {/* Entreprise active */}
            {isCompany && activeCompanyId && (
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {activeCompanyName || t('header.user.company', 'Entreprise')}
                  </span>
                </div>
                {activeCompanyPlan && (
                  <div className="ml-5.5">
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-xs font-medium">
                      {t(`pricing.plans.${activeCompanyPlan}.name`, { defaultValue: activeCompanyPlan })}
                      {activeCompanyCycle && (
                        <span className="ml-1 opacity-75">
                          · {activeCompanyCycle === 'monthly' ? t('pricing.toggle.monthly') : t('pricing.toggle.annual')}
                        </span>
                      )}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Autres comptes */}
            {otherAccounts.map(acc => {
              const oi = (acc.firstName?.[0] ?? '') + (acc.lastName?.[0] ?? '') || acc.email[0]?.toUpperCase() || '?';
              return (
                <div key={acc.userId} className="border-b border-slate-100 flex items-center">
                  <button
                    onClick={() => handleSwitch(acc.userId)}
                    disabled={switching}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {oi}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {acc.firstName} {acc.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{acc.email}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleRemove(acc.userId)}
                    className="p-2.5 mr-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                    title={t('header.user.menu.removeAccount')}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Ajouter un compte */}
            <button
              onClick={handleAddAccount}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Plus size={14} className="text-slate-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {t('header.user.menu.addAccount')}
              </span>
            </button>

            {/* Actions */}
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
                  {t('header.user.menu.actoosAccount')}
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
                <span className="text-sm text-red-600">
                  {hasMultiple ? t('header.user.menu.signOutAll') : t('header.user.logout')}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;