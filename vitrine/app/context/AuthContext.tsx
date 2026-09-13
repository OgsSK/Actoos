'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import {
  createAuthClientSSR,
  getLinkedAccounts,
  ensureSelfLink,
  saveLinkedAccounts,
  linkAccount,
  unlinkAccount,
  saveTokens,
  getTokens,
  removeTokens,
  setActiveAccountId,
  setPendingLink,
  getPendingLink,
  clearPendingLink,
  buildLinkedAccount,
  upsertAccountInList,
  sortAccountsByUsage,
  clearAll,
  type LinkedAccount,
} from '@actoos/auth-client';
import { Plus, Settings, FolderOpen, LogOut, Check, X } from 'lucide-react';

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

// Détecte si on est en mobile (< 768px)
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
  const [currentAccount, setCurrentAccount] = useState<LinkedAccount | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const refreshState = useCallback(async () => {
    try {
      const client = getClient();
      const { data } = await client.supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        setCurrentAccount(null);
        setActiveAccountId(null);
        setLinkedAccounts([]);
        setLoading(false);
        return;
      }

      const account = buildLinkedAccount(session.user, session);
      setCurrentAccount(account);
      setActiveAccountId(account.userId);
      setAvatarError(false);

      // Sauvegarder le token du compte actif
      saveTokens(account.userId, {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      });

      // S'assurer que ce compte est dans sa propre liste
      await ensureSelfLink(client.supabase, account);

      // Si on vient d'ajouter un compte → lier le nouveau à TOUTE la famille
      const pendingLinkId = getPendingLink();
      if (pendingLinkId && pendingLinkId !== account.userId) {
        // Lire tous les membres de la famille existante
        const { getLinkedAccountsFromSupabase } = await import('@actoos/auth-client');
        const family = await getLinkedAccountsFromSupabase(client.supabase, pendingLinkId);

        // Lier le nouveau compte au compte source
        await linkAccount(client.supabase, pendingLinkId, account.userId);

        // Lier le nouveau compte à TOUS les autres membres
        for (const member of family) {
          if (member.userId !== account.userId && member.userId !== pendingLinkId) {
            await linkAccount(client.supabase, member.userId, account.userId);
          }
        }

        clearPendingLink();
      }

      // Toujours recharger depuis Supabase
      const accounts = await getLinkedAccounts(client.supabase, account.userId);
      // Toujours inclure le compte courant en tête de liste (ceinture + bretelles)
      const withCurrent = upsertAccountInList(accounts, account);
      setLinkedAccounts(sortAccountsByUsage(withCurrent));
      console.log('[AuthButton] loaded accounts:', withCurrent.map(a => a.email));
    } catch (err) {
      console.error('[AuthButton] refresh error:', err);
      setCurrentAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Fermeture au clic extérieur (desktop uniquement)
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

  const handleSwitch = async (userId: string) => {
    if (switching || userId === currentAccount?.userId) return;
    setSwitching(true);

    try {
      const tokens = getTokens(userId);

      if (tokens?.accessToken && tokens?.refreshToken) {
        const client = getClient();
        const { error } = await client.supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        if (!error) {
          setActiveAccountId(userId);
          setMenuOpen(false);
          window.location.reload();
          return;
        }
        console.warn('[AuthButton] Token switch failed:', error.message);
        removeTokens(userId);
      }

      const account = linkedAccounts.find(a => a.userId === userId);
      setPendingLink(userId);
      const redirect = typeof window !== 'undefined' ? window.location.href : 'https://actoos.com/';
      window.location.href = `${LOGIN_URL}?email=${encodeURIComponent(account?.email || '')}&redirect=${encodeURIComponent(redirect)}`;
    } catch (err) {
      console.error('[AuthButton] switch failed:', err);
      alert(language === 'fr' ? 'Impossible de basculer sur ce compte.' : 'Failed to switch account.');
      setSwitching(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!currentAccount) return;
    const wasActive = userId === currentAccount.userId;
    const client = getClient();

    await unlinkAccount(client.supabase, currentAccount.userId, userId);
    removeTokens(userId);

    const remaining = linkedAccounts.filter(a => a.userId !== userId);
    await saveLinkedAccounts(remaining, client.supabase, currentAccount.userId);
    setLinkedAccounts(remaining);

    if (wasActive) {
      if (remaining.length > 0) {
        await handleSwitch(remaining[0].userId);
      } else {
        await client.supabase.auth.signOut();
        clearAll();
        window.location.href = '/';
      }
    }
  };

  const handleSignOut = async () => {
    await getClient().supabase.auth.signOut();
    clearAll();
    setMenuOpen(false);
    window.location.href = '/';
  };

  const handleAddAccount = () => {
    if (!currentAccount) return;
    setPendingLink(currentAccount.userId);
    const redirect = typeof window !== 'undefined' ? window.location.href : 'https://actoos.com/';
    window.location.href = `${LOGIN_URL}?addAccount=1&redirect=${encodeURIComponent(redirect)}`;
  };

  const loginHref = `${LOGIN_URL}?redirect=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : 'https://actoos.com/'
  )}`;

  if (loading) {
    return <span className="inline-block w-24 h-9 rounded-full bg-slate-200 animate-pulse" aria-hidden />;
  }

  if (!currentAccount) {
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
    (currentAccount.firstName?.[0] ?? '') + (currentAccount.lastName?.[0] ?? '') ||
    currentAccount.email[0]?.toUpperCase() ||
    '?';

  const otherAccounts = linkedAccounts.filter(a => a.userId !== currentAccount.userId);
  const hasMultiple = linkedAccounts.length > 1;

  // ===== Contenu du menu (partagé desktop + mobile) =====
  const menuContent = (
    <>
      {/* Compte actif */}
      <div className={`px-4 py-3 bg-slate-50 ${isMobile ? '' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {currentAccount.firstName} {currentAccount.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{currentAccount.email}</p>
          </div>
          <Check size={16} className="text-emerald-600 shrink-0" />
        </div>
      </div>

      {/* Autres comptes */}
      {otherAccounts.map(acc => {
        const oi =
          (acc.firstName?.[0] ?? '') + (acc.lastName?.[0] ?? '') ||
          acc.email[0]?.toUpperCase() ||
          '?';
        return (
          <div key={acc.userId} className="border-t border-slate-100 flex items-center">
            <button
              onClick={() => handleSwitch(acc.userId)}
              disabled={switching}
              className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
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
              className="p-3 mr-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
              title={language === 'fr' ? 'Retirer ce compte' : 'Remove this account'}
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* Ajouter un compte */}
      <button
        onClick={handleAddAccount}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left border-t border-slate-100"
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <Plus size={16} className="text-slate-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">
          {language === 'fr' ? 'Ajouter un compte' : 'Add another account'}
        </span>
      </button>

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
            {hasMultiple
              ? (language === 'fr' ? 'Se déconnecter de tous les comptes' : 'Sign out of all accounts')
              : (language === 'fr' ? 'Se déconnecter' : 'Sign out')}
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
        {currentAccount.avatarUrl && !avatarError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAccount.avatarUrl}
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

      {/* === MOBILE : Bottom Sheet (via Portal pour échapper au backdrop-blur de la nav) === */}
      {menuOpen && isMobile && mounted && createPortal(
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            {/* Handle */}
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

            {/* Contenu scrollable */}
            <div className="overflow-y-auto flex-1">
              {menuContent}
            </div>

            {/* Safe area iPhone (encoche en bas) */}
            <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
          </div>
        </>,
        document.body
      )}

      {/* === DESKTOP : Dropdown === */}
      {menuOpen && !isMobile && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden max-h-[85vh] overflow-y-auto">
            {menuContent}
          </div>
        </>
      )}
    </div>
  );
}