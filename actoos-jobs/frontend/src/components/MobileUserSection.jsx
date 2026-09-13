import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Check, UserPlus } from 'lucide-react';
import {
  MAX_LINKED_ACCOUNTS,
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
} from '@actoos/auth-client';
import { supabase } from '../lib/supabase';

const ACTOOS_ID_BASE = process.env.NODE_ENV === 'production'
  ? 'https://id.actoos.com'
  : 'http://localhost:3001';

const LOGIN_URL = `${ACTOOS_ID_BASE}/login`;

const MobileUserSection = ({ user, profile, onSwitchDone, onCloseMenu }) => {
  const { t } = useTranslation();
  const [currentAccount, setCurrentAccount] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [switching, setSwitching] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) {
        setCurrentAccount(null);
        setLinkedAccounts([]);
        return;
      }

      const account = buildLinkedAccount(session.user, session);
      setCurrentAccount(account);
      setActiveAccountId(account.userId);

      saveTokens(account.userId, {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      });

      await ensureSelfLink(supabase, account);

      // Si on vient d'ajouter un compte → lier UNIQUEMENT au compte source
      const pendingLinkId = getPendingLink();
      if (pendingLinkId && pendingLinkId !== account.userId) {
        await linkAccount(supabase, pendingLinkId, account.userId);
        clearPendingLink();
      }

      const accounts = await getLinkedAccounts(supabase, account.userId);
      const withCurrent = upsertAccountInList(accounts, account);
      setLinkedAccounts(sortAccountsByUsage(withCurrent));
    } catch (err) {
      console.error('[MobileUserSection] refresh error:', err);
    }
  }, []);

  useEffect(() => {
    refreshState();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshState();
    });
    return () => subscription.unsubscribe();
  }, [refreshState]);

  const handleSwitch = async (userId) => {
    if (switching || userId === currentAccount?.userId) return;
    setSwitching(true);

    try {
      const tokens = getTokens(userId);

      if (tokens?.accessToken && tokens?.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        if (!error) {
          setActiveAccountId(userId);
          if (onCloseMenu) onCloseMenu();
          window.location.reload();
          return;
        }
        console.warn('[MobileUserSection] Token switch failed:', error.message);
        removeTokens(userId);
      }

      const account = linkedAccounts.find(a => a.userId === userId);
      setPendingLink(userId);
      const redirect = typeof window !== 'undefined' ? window.location.href : 'https://jobs.actoos.com/';
      window.location.href = `${LOGIN_URL}?email=${encodeURIComponent(account?.email || '')}&redirect=${encodeURIComponent(redirect)}`;
    } catch (err) {
      console.error('[MobileUserSection] switch failed:', err);
      alert(t('header.user.menu.switchError', { defaultValue: 'Impossible de basculer sur ce compte' }));
      setSwitching(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!currentAccount) return;
    const wasActive = userId === currentAccount.userId;

    await unlinkAccount(supabase, currentAccount.userId, userId);
    removeTokens(userId);

    const remaining = linkedAccounts.filter(a => a.userId !== userId);
    await saveLinkedAccounts(remaining, supabase, currentAccount.userId);
    setLinkedAccounts(remaining);

    if (wasActive) {
      if (remaining.length > 0) {
        await handleSwitch(remaining[0].userId);
      } else {
        await supabase.auth.signOut();
        clearAll();
        window.location.href = '/';
      }
    }
  };

  const handleAddAccount = () => {
    if (!currentAccount) return;
    if (linkedAccounts.length >= MAX_LINKED_ACCOUNTS) {
      alert(`Vous avez atteint la limite de ${MAX_LINKED_ACCOUNTS} comptes. Retirez-en un avant d'en ajouter un autre.`);
      return;
    }
    setPendingLink(currentAccount.userId);
    const redirect = typeof window !== 'undefined' ? window.location.href : 'https://jobs.actoos.com/';
    window.location.href = `${LOGIN_URL}?addAccount=1&redirect=${encodeURIComponent(redirect)}`;
  };

  if (!user || !currentAccount) return null;

  const getInitials = (acc) => {
    const fn = acc?.firstName || acc?.email?.split('@')[0] || '';
    const ln = acc?.lastName || '';
    const init = (fn.charAt(0) + ln.charAt(0)).toUpperCase();
    return init || fn.slice(0, 2).toUpperCase() || '?';
  };

  const currentInitials = getInitials(currentAccount);
  const otherAccounts = linkedAccounts.filter(a => a.userId !== currentAccount.userId);
  const canAddMore = linkedAccounts.length < MAX_LINKED_ACCOUNTS;

  return (
    <div className="pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-base font-semibold shrink-0">
          {currentInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {currentAccount.firstName} {currentAccount.lastName}
            </p>
            <Check size={14} className="text-emerald-600 shrink-0" />
          </div>
          <p className="text-xs text-slate-500 truncate">{currentAccount.email}</p>
        </div>
      </div>

      {otherAccounts.length > 0 && (
        <div className="space-y-2 mb-3">
          {otherAccounts.map(acc => {
            const oi = getInitials(acc);
            return (
              <div
                key={acc.userId}
                className="flex items-center gap-3 p-2 rounded-xl bg-slate-50"
              >
                <button
                  onClick={() => handleSwitch(acc.userId)}
                  disabled={switching}
                  className="flex items-center gap-3 flex-1 text-left disabled:opacity-50 min-w-0"
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
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  aria-label="Remove account"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {canAddMore ? (
        <button
          onClick={handleAddAccount}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <UserPlus size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-600">
            {t('header.user.menu.addAccount', { defaultValue: 'Ajouter un compte' })}
          </span>
        </button>
      ) : (
        <div className="w-full p-3 rounded-xl border-2 border-dashed border-slate-100 text-center text-xs text-slate-400 italic">
          {t('header.user.menu.limitReached', {
            defaultValue: `Limite de ${MAX_LINKED_ACCOUNTS} comptes atteinte. Retirez-en un pour en ajouter un autre.`,
            max: MAX_LINKED_ACCOUNTS,
          })}
        </div>
      )}
    </div>
  );
};

export default MobileUserSection;