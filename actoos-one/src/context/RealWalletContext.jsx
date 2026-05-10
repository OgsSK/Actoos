/**
 * ACTOOS ONE - Real Wallet Context
 * 
 * Context pour gérer le wallet client connecté à Supabase.
 * Remplace le mock WalletContext pour la production.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import {
  getOrCreateWallet,
  topUpWallet,
  payWithWallet,
  WALLET_TYPES,
  TRANSACTION_TYPES,
} from '../services/financialService';

const RealWalletContext = createContext(null);

// Re-export types for compatibility
export { TRANSACTION_TYPES, WALLET_TYPES };

export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  FAILED: 'failed',
};

export function RealWalletProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger le wallet quand l'utilisateur se connecte
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadWallet();
      loadTransactions();
      
      // Souscrire aux changements en temps réel
      const channel = subscribeToWalletChanges(user.id);
      return () => {
        if (channel) supabase?.removeChannel(channel);
      };
    } else {
      // Reset si déconnecté
      setWallet(null);
      setBalance(0);
      setTransactions([]);
    }
  }, [isAuthenticated, user?.id]);

  // Charger le wallet depuis Supabase
  const loadWallet = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) return;

    setIsLoading(true);
    try {
      const { data, error } = await getOrCreateWallet(user.id, WALLET_TYPES.CLIENT);
      
      if (error) throw error;
      
      setWallet(data);
      setBalance(parseFloat(data?.balance || 0));
      setError(null);
    } catch (err) {
      console.error('Erreur chargement wallet:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Charger les transactions
  const loadTransactions = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) return;

    try {
      // D'abord récupérer le wallet pour avoir son ID
      const { data: walletData } = await getOrCreateWallet(user.id, WALLET_TYPES.CLIENT);
      if (!walletData) return;

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transformer pour compatibilité avec l'ancien format
      const formattedTransactions = (data || []).map(txn => ({
        id: txn.id,
        wallet_id: txn.wallet_id,
        transaction_type: txn.type,
        amount: parseFloat(txn.amount),
        balance_after: parseFloat(txn.balance_after),
        description: txn.description,
        reference: txn.reference_id,
        status: TRANSACTION_STATUS.COMPLETED,
        created_at: txn.created_at,
      }));

      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
    }
  }, [user?.id]);

  // Souscrire aux changements du wallet en temps réel
  const subscribeToWalletChanges = useCallback((userId) => {
    if (!isSupabaseConfigured()) return null;

    const channel = supabase
      .channel(`wallet-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setWallet(payload.new);
            setBalance(parseFloat(payload.new.balance || 0));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
        },
        (payload) => {
          // Nouvelle transaction, recharger la liste
          loadTransactions();
        }
      )
      .subscribe();

    return channel;
  }, [loadTransactions]);

  // Recharger le wallet (TopUp)
  const topUp = useCallback(async (amount, paymentMethod = 'touchpay', phoneNumber = null) => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await topUpWallet(
        user.id, 
        amount, 
        paymentMethod, 
        phoneNumber
      );

      if (error) throw error;

      // Mettre à jour le state local
      setWallet(data.wallet);
      setBalance(data.newBalance);
      
      // Recharger les transactions
      await loadTransactions();

      return data.transaction;
    } catch (err) {
      console.error('Erreur topUp:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadTransactions]);

  // Payer avec le wallet
  const pay = useCallback(async (amount, orderId, description, category = 'restaurant') => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    if (balance < amount) {
      throw new Error('Solde insuffisant');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await payWithWallet(
        user.id,
        amount,
        orderId,
        description
      );

      if (error) throw error;

      // Mettre à jour le state local
      setWallet(data.wallet);
      setBalance(data.newBalance);
      
      // Recharger les transactions
      await loadTransactions();

      return data.transaction;
    } catch (err) {
      console.error('Erreur paiement:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, balance, loadTransactions]);

  // Vérifier si le solde est suffisant
  const hasEnoughBalance = useCallback((amount) => {
    return balance >= amount;
  }, [balance]);

  // Pour compatibilité avec l'ancien code
  const checkCorporateLimit = useCallback(() => {
    return { allowed: true };
  }, []);

  const getTodaySpending = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return transactions
      .filter(txn => {
        const txnDate = new Date(txn.created_at);
        return txn.transaction_type === TRANSACTION_TYPES.PAYMENT && txnDate >= today;
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  }, [transactions]);

  // Supprimer une transaction de l'historique (visuel uniquement)
  const deleteTransaction = useCallback((transactionId) => {
    setTransactions(prev => prev.filter(txn => txn.id !== transactionId));
  }, []);

  // Refresh manuel
  const refresh = useCallback(async () => {
    await Promise.all([loadWallet(), loadTransactions()]);
  }, [loadWallet, loadTransactions]);

  const value = {
    // Wallet
    wallet,
    balance,
    walletType: wallet?.wallet_type || WALLET_TYPES.CLIENT,
    
    // Transactions
    transactions,
    deleteTransaction,
    pendingTransfers: [], // Pour compatibilité
    
    // Actions
    topUp,
    pay,
    hasEnoughBalance,
    checkCorporateLimit,
    getTodaySpending,
    refresh,
    
    // Pour compatibilité
    dailySpendLimit: null,
    companyName: null,
    subWallets: [],
    createSubWallet: async () => {},
    topUpSubWallet: async () => {},
    deleteSubWallet: async () => {},
    checkSmartRules: () => ({ allowed: true, errors: [] }),
    transfer: async () => {},
    checkRecipient: () => ({ isRegistered: false }),
    
    // État
    isLoading,
    error,
  };

  return (
    <RealWalletContext.Provider value={value}>
      {children}
    </RealWalletContext.Provider>
  );
}

export function useRealWallet() {
  const context = useContext(RealWalletContext);
  if (!context) {
    throw new Error('useRealWallet must be used within a RealWalletProvider');
  }
  return context;
}

// Alias pour compatibilité avec l'ancien code
export const WalletProvider = RealWalletProvider;
export const useWallet = useRealWallet;

export default RealWalletContext;
