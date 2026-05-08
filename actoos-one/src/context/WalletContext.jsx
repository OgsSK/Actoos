/**
 * ACTOOS ONE - Wallet Context
 * 
 * Gestion du wallet utilisateur avec Supabase.
 * PRODUCTION MODE - Toutes les données sont dans Supabase.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

// Types de transactions (match SQL schema)
export const TRANSACTION_TYPES = {
  TOPUP: 'topup',
  PAYMENT: 'payment',
  REFUND: 'refund',
  EARNING: 'earning',
  WITHDRAWAL: 'withdrawal',
  COMMISSION: 'commission',
  CAUTION_TOPUP: 'caution_topup',
  CAUTION_DEBIT: 'caution_debit',
  SETTLEMENT: 'settlement',
  TRANSFER: 'transfer',
  // Legacy support
  TRANSFER_OUT: 'transfer',
  TRANSFER_IN: 'transfer',
  TRANSFER_PENDING: 'transfer',
  CORPORATE_TOPUP: 'topup',
};

// Statuts de transaction
export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  PENDING_REGISTRATION: 'pending_registration',
  FAILED: 'failed',
};

// Types de wallet
export const WALLET_TYPES = {
  CLIENT: 'client',
  PARTNER_EARNINGS: 'partner_earnings',
  DRIVER_CAUTION: 'driver_caution',
  ACTOOS_REVENUE: 'actoos_revenue',
  // Legacy support
  PERSONAL: 'client',
  CORPORATE: 'client',
  EMPLOYEE: 'client',
  SUB_WALLET: 'client',
};

export function WalletProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subWallets, setSubWallets] = useState([]); // Pour compatibilité UI
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger le wallet de l'utilisateur connecté
  const loadWallet = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setWallet(null);
      return;
    }

    setIsLoading(true);
    try {
      // Utiliser la fonction Supabase pour get_or_create
      const { data: walletData, error: walletError } = await supabase
        .rpc('get_or_create_wallet', {
          p_owner_id: user.id,
          p_wallet_type: 'client'
        });

      if (walletError) {
        // Si la fonction n'existe pas, fallback sur query directe
        console.log('RPC non disponible, fallback sur query directe');
        
        // Chercher le wallet existant (sans wallet_type si colonne n'existe pas)
        let { data: existingWallet, error: fetchError } = await supabase
          .from('wallets')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // Erreur de colonne manquante - essayer sans wallet_type
          if (fetchError.code === '42703') {
            console.log('Colonne wallet_type manquante, tentative sans filtre type');
            const { data: simpleWallet, error: simpleError } = await supabase
              .from('wallets')
              .select('id, owner_id, balance, is_frozen, created_at, updated_at')
              .eq('owner_id', user.id)
              .maybeSingle();
            
            if (!simpleError && simpleWallet) {
              existingWallet = { ...simpleWallet, wallet_type: 'client' };
            } else if (!simpleError && !simpleWallet) {
              // Créer le wallet sans wallet_type
              const { data: newWallet, error: createError } = await supabase
                .from('wallets')
                .insert({ owner_id: user.id, balance: 0 })
                .select('id, owner_id, balance, is_frozen, created_at, updated_at')
                .single();
              
              if (!createError) {
                existingWallet = { ...newWallet, wallet_type: 'client' };
              }
            }
          } else {
            throw fetchError;
          }
        } else if (!existingWallet) {
          // Wallet n'existe pas, le créer
          try {
            const { data: newWallet, error: createError } = await supabase
              .from('wallets')
              .insert({
                owner_id: user.id,
                wallet_type: 'client',
                balance: 0,
              })
              .select()
              .single();

            if (createError) {
              // Peut-être que wallet_type n'existe pas, essayer sans
              if (createError.code === '42703') {
                const { data: simpleWallet, error: simpleError } = await supabase
                  .from('wallets')
                  .insert({ owner_id: user.id, balance: 0 })
                  .select()
                  .single();
                
                if (!simpleError) {
                  existingWallet = { ...simpleWallet, wallet_type: 'client' };
                } else {
                  throw simpleError;
                }
              } else {
                throw createError;
              }
            } else {
              existingWallet = newWallet;
            }
          } catch (err) {
            throw err;
          }
        }

        setWallet(existingWallet);
        console.log('✅ Wallet chargé:', existingWallet);
      } else {
        setWallet(walletData);
        console.log('✅ Wallet chargé via RPC:', walletData);
      }
    } catch (err) {
      console.error('Erreur chargement wallet:', err);
      setError(err.message);
      // Fallback: wallet vide local pour éviter crash UI
      setWallet({
        id: 'local-fallback',
        owner_id: user.id,
        wallet_type: 'client',
        balance: 0,
        is_frozen: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Charger les transactions
  const loadTransactions = useCallback(async () => {
    if (!wallet?.id || wallet.id === 'local-fallback' || !isSupabaseConfigured()) {
      setTransactions([]);
      return;
    }

    try {
      const { data, error: txnError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txnError) throw txnError;

      // Mapper pour compatibilité avec l'UI existante
      const mappedTransactions = (data || []).map(txn => ({
        id: txn.id,
        wallet_id: txn.wallet_id,
        transaction_type: txn.type,
        amount: parseFloat(txn.amount),
        balance_before: parseFloat(txn.balance_after) - parseFloat(txn.amount),
        balance_after: parseFloat(txn.balance_after),
        description: txn.description || `Transaction ${txn.type}`,
        reference: txn.reference_id,
        status: TRANSACTION_STATUS.COMPLETED,
        created_at: txn.created_at,
      }));

      setTransactions(mappedTransactions);
      console.log('✅ Transactions chargées:', mappedTransactions.length);
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
      setTransactions([]);
    }
  }, [wallet?.id]);

  // Charger wallet quand l'utilisateur change
  useEffect(() => {
    if (isAuthenticated && user) {
      loadWallet();
    } else {
      setWallet(null);
      setTransactions([]);
    }
  }, [isAuthenticated, user, loadWallet]);

  // Charger transactions quand le wallet change
  useEffect(() => {
    if (wallet?.id) {
      loadTransactions();
    }
  }, [wallet?.id, loadTransactions]);

  // ==========================================
  // ACTIONS WALLET
  // ==========================================

  // Recharger le wallet (TopUp)
  const topUp = useCallback(async (amount, paymentMethod = 'touchpay') => {
    if (!wallet?.id || wallet.id === 'local-fallback') {
      throw new Error('Wallet non disponible');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Utiliser la fonction Supabase pour mise à jour atomique
      const { data: txn, error: txnError } = await supabase
        .rpc('update_wallet_balance', {
          p_wallet_id: wallet.id,
          p_amount: amount,
          p_type: 'topup',
          p_description: `Recharge ${paymentMethod === 'touchpay' ? 'TouchPay' : paymentMethod}`,
          p_metadata: { method: paymentMethod }
        });

      if (txnError) {
        // Fallback si RPC non disponible
        console.log('RPC non disponible, fallback manuel');
        
        const newBalance = parseFloat(wallet.balance) + amount;
        
        // Mettre à jour le wallet
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', wallet.id);

        if (updateError) throw updateError;

        // Créer la transaction
        const { data: newTxn, error: insertError } = await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'topup',
            amount: amount,
            balance_after: newBalance,
            description: `Recharge ${paymentMethod === 'touchpay' ? 'TouchPay' : paymentMethod}`,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Mettre à jour state local
        setWallet(prev => ({ ...prev, balance: newBalance }));
        await loadTransactions();

        return {
          id: newTxn.id,
          wallet_id: wallet.id,
          transaction_type: TRANSACTION_TYPES.TOPUP,
          amount: amount,
          balance_after: newBalance,
          status: TRANSACTION_STATUS.COMPLETED,
          created_at: newTxn.created_at,
        };
      }

      // Recharger les données
      await loadWallet();
      await loadTransactions();

      console.log('✅ TopUp réussi:', amount, 'FCFA');
      return txn;
    } catch (err) {
      console.error('Erreur topUp:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, loadWallet, loadTransactions]);

  // Payer une commande
  const pay = useCallback(async (amount, orderId, description, category = 'restaurant') => {
    if (!wallet?.id || wallet.id === 'local-fallback') {
      throw new Error('Wallet non disponible');
    }

    if (parseFloat(wallet.balance) < amount) {
      throw new Error('Solde insuffisant');
    }

    setIsLoading(true);
    setError(null);

    try {
      const newBalance = parseFloat(wallet.balance) - amount;

      // Mettre à jour le wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      if (updateError) throw updateError;

      // Créer la transaction
      const { data: newTxn, error: insertError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'payment',
          amount: -amount,
          balance_after: newBalance,
          description: description || `Commande ${orderId}`,
          reference_id: orderId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Mettre à jour state local
      setWallet(prev => ({ ...prev, balance: newBalance }));
      await loadTransactions();

      console.log('✅ Paiement réussi:', amount, 'FCFA');
      return {
        id: newTxn.id,
        wallet_id: wallet.id,
        transaction_type: TRANSACTION_TYPES.PAYMENT,
        amount: -amount,
        balance_after: newBalance,
        status: TRANSACTION_STATUS.COMPLETED,
        created_at: newTxn.created_at,
      };
    } catch (err) {
      console.error('Erreur paiement:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, loadTransactions]);

  // Transfert P2P
  const transfer = useCallback(async (recipientPhone, amount, description) => {
    if (!wallet?.id || wallet.id === 'local-fallback') {
      throw new Error('Wallet non disponible');
    }

    if (parseFloat(wallet.balance) < amount) {
      throw new Error('Solde insuffisant');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Chercher le destinataire par téléphone
      const cleanPhone = recipientPhone.replace(/\s/g, '');
      const { data: recipient } = await supabase
        .from('users')
        .select('id, name, phone')
        .eq('phone', cleanPhone)
        .single();

      const newBalance = parseFloat(wallet.balance) - amount;

      // Débiter l'expéditeur
      await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      // Créer transaction sortante
      const { data: outTxn } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'transfer',
          amount: -amount,
          balance_after: newBalance,
          description: recipient 
            ? `Envoi à ${recipient.name || cleanPhone}` 
            : `Envoi à ${cleanPhone} (en attente)`,
          metadata: { recipient_phone: cleanPhone }
        })
        .select()
        .single();

      // Si le destinataire existe, créditer son wallet
      if (recipient) {
        // Chercher ou créer son wallet
        let { data: recipientWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('owner_id', recipient.id)
          .eq('wallet_type', 'client')
          .single();

        if (!recipientWallet) {
          const { data: newWallet } = await supabase
            .from('wallets')
            .insert({ owner_id: recipient.id, wallet_type: 'client', balance: 0 })
            .select()
            .single();
          recipientWallet = newWallet;
        }

        if (recipientWallet) {
          const recipientNewBalance = parseFloat(recipientWallet.balance) + amount;
          
          await supabase
            .from('wallets')
            .update({ balance: recipientNewBalance, updated_at: new Date().toISOString() })
            .eq('id', recipientWallet.id);

          await supabase
            .from('wallet_transactions')
            .insert({
              wallet_id: recipientWallet.id,
              type: 'transfer',
              amount: amount,
              balance_after: recipientNewBalance,
              description: `Reçu de ${user?.email || 'Utilisateur'}`,
            });
        }
      }

      // Mettre à jour state local
      setWallet(prev => ({ ...prev, balance: newBalance }));
      await loadTransactions();

      console.log('✅ Transfert réussi:', amount, 'FCFA vers', cleanPhone);
      
      return {
        success: true,
        transaction_id: outTxn?.id,
        amount: amount,
        receiver_phone: cleanPhone,
        receiver_name: recipient?.name || null,
        new_balance: newBalance,
        status: recipient ? 'completed' : 'pending_registration',
        is_pending_registration: !recipient,
      };
    } catch (err) {
      console.error('Erreur transfert:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, user, loadTransactions]);

  // Vérifier si un numéro est inscrit
  const checkRecipient = useCallback(async (phone) => {
    const cleanPhone = phone.replace(/\s/g, '');
    
    try {
      const { data: recipient } = await supabase
        .from('users')
        .select('id, name, phone')
        .eq('phone', cleanPhone)
        .single();

      return {
        isRegistered: !!recipient,
        user: recipient || null,
      };
    } catch {
      return { isRegistered: false, user: null };
    }
  }, []);

  // Supprimer une transaction de l'historique (côté UI uniquement)
  const deleteTransaction = useCallback((transactionId) => {
    setTransactions(prev => prev.filter(txn => txn.id !== transactionId));
  }, []);

  // ==========================================
  // HELPERS
  // ==========================================

  const balance = wallet?.balance ? parseFloat(wallet.balance) : 0;
  
  const hasEnoughBalance = useCallback((amount) => {
    return balance >= amount;
  }, [balance]);

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

  // Pour compatibilité avec ancienne UI (corporate limits)
  const checkCorporateLimit = useCallback((amount) => {
    return { allowed: true }; // Pas de limite corporate pour l'instant
  }, []);

  const checkSmartRules = useCallback(() => {
    return { allowed: true, errors: [] };
  }, []);

  // Sous-wallets (stub pour compatibilité UI)
  const createSubWallet = useCallback(async () => {
    return { id: 'sub-' + Date.now(), wallet_name: 'Nouveau', balance: 0 };
  }, []);
  
  const topUpSubWallet = useCallback(async () => ({ success: true }), []);
  const deleteSubWallet = useCallback(async () => ({ success: true }), []);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = {
    // Wallet principal
    balance,
    wallet,
    walletType: wallet?.wallet_type || 'client',
    dailySpendLimit: null, // Pas de limite pour l'instant
    companyName: null,
    
    // Sous-wallets (compatibilité UI)
    subWallets,
    createSubWallet,
    topUpSubWallet,
    deleteSubWallet,
    checkSmartRules,
    
    // Transactions
    transactions,
    pendingTransfers,
    deleteTransaction,
    
    // Actions
    topUp,
    pay,
    transfer,
    checkRecipient,
    hasEnoughBalance,
    checkCorporateLimit,
    getTodaySpending,
    
    // État
    isLoading,
    error,
    
    // Reload
    refreshWallet: loadWallet,
    refreshTransactions: loadTransactions,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
