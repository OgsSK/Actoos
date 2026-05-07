/**
 * ACTOOS ONE - Wallet Service
 * 
 * Service pour les opérations wallet et transactions.
 * Supporte mode Supabase et mode mocké.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

const useMockData = !isSupabaseConfigured();

/**
 * Récupérer le wallet d'un utilisateur
 */
export async function getWallet(userId) {
  if (useMockData) {
    // Retourner un wallet mocké depuis localStorage ou par défaut
    const stored = localStorage.getItem(`actoos_wallet_${userId}`);
    if (stored) {
      return { data: JSON.parse(stored), error: null };
    }
    
    const defaultWallet = {
      id: `wallet-${userId}`,
      owner_id: userId,
      wallet_type: 'personal',
      balance: 15000,
      daily_spend_limit: null,
      is_frozen: false,
      created_at: new Date().toISOString(),
    };
    
    localStorage.setItem(`actoos_wallet_${userId}`, JSON.stringify(defaultWallet));
    return { data: defaultWallet, error: null };
  }

  try {
    // Chercher le wallet existant
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', userId)
      .eq('wallet_type', 'personal')
      .single();

    if (error && error.code === 'PGRST116') {
      // Wallet n'existe pas, le créer
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          owner_id: userId,
          wallet_type: 'personal',
          balance: 0,
        })
        .select()
        .single();

      if (createError) throw createError;
      return { data: newWallet, error: null };
    }

    if (error) throw error;
    return { data: wallet, error: null };
  } catch (error) {
    console.error('Erreur getWallet:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les transactions d'un wallet
 */
export async function getTransactions(walletId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  if (useMockData) {
    const stored = localStorage.getItem(`actoos_transactions_${walletId}`);
    const transactions = stored ? JSON.parse(stored) : [];
    return { 
      data: transactions.slice(offset, offset + limit), 
      error: null,
      count: transactions.length,
    };
  }

  try {
    const { data, error, count } = await supabase
      .from('ledger_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, error: null, count };
  } catch (error) {
    console.error('Erreur getTransactions:', error);
    return { data: [], error, count: 0 };
  }
}

/**
 * Créditer un wallet (TopUp)
 */
export async function creditWallet(walletId, amount, transactionType, metadata = {}) {
  if (useMockData) {
    const walletKey = Object.keys(localStorage).find(k => k.startsWith('actoos_wallet_'));
    if (!walletKey) {
      return { data: null, error: { message: 'Wallet non trouvé' } };
    }

    const wallet = JSON.parse(localStorage.getItem(walletKey));
    const newBalance = wallet.balance + amount;

    const transaction = {
      id: `txn-${Date.now()}`,
      wallet_id: wallet.id,
      transaction_type: transactionType,
      amount: amount,
      balance_before: wallet.balance,
      balance_after: newBalance,
      metadata,
      created_at: new Date().toISOString(),
    };

    wallet.balance = newBalance;
    wallet.updated_at = new Date().toISOString();
    localStorage.setItem(walletKey, JSON.stringify(wallet));

    const transactionsKey = `actoos_transactions_${wallet.id}`;
    const transactions = JSON.parse(localStorage.getItem(transactionsKey) || '[]');
    transactions.unshift(transaction);
    localStorage.setItem(transactionsKey, JSON.stringify(transactions));

    return { data: { wallet, transaction }, error: null };
  }

  try {
    // Récupérer le wallet actuel
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single();

    if (fetchError) throw fetchError;

    const newBalance = parseFloat(wallet.balance) + amount;

    // Mettre à jour le wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    if (updateError) throw updateError;

    // Créer la transaction
    const { data: transaction, error: txnError } = await supabase
      .from('ledger_transactions')
      .insert({
        wallet_id: walletId,
        transaction_type: transactionType,
        amount: amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        metadata,
      })
      .select()
      .single();

    if (txnError) throw txnError;

    return { 
      data: { 
        wallet: { ...wallet, balance: newBalance }, 
        transaction 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erreur creditWallet:', error);
    return { data: null, error };
  }
}

/**
 * Débiter un wallet (Paiement)
 */
export async function debitWallet(walletId, amount, transactionType, metadata = {}) {
  if (useMockData) {
    const walletKey = Object.keys(localStorage).find(k => k.startsWith('actoos_wallet_'));
    if (!walletKey) {
      return { data: null, error: { message: 'Wallet non trouvé' } };
    }

    const wallet = JSON.parse(localStorage.getItem(walletKey));
    
    if (wallet.balance < amount) {
      return { data: null, error: { message: 'Solde insuffisant' } };
    }

    const newBalance = wallet.balance - amount;

    const transaction = {
      id: `txn-${Date.now()}`,
      wallet_id: wallet.id,
      transaction_type: transactionType,
      amount: -amount,
      balance_before: wallet.balance,
      balance_after: newBalance,
      metadata,
      created_at: new Date().toISOString(),
    };

    wallet.balance = newBalance;
    wallet.updated_at = new Date().toISOString();
    localStorage.setItem(walletKey, JSON.stringify(wallet));

    const transactionsKey = `actoos_transactions_${wallet.id}`;
    const transactions = JSON.parse(localStorage.getItem(transactionsKey) || '[]');
    transactions.unshift(transaction);
    localStorage.setItem(transactionsKey, JSON.stringify(transactions));

    return { data: { wallet, transaction }, error: null };
  }

  try {
    // Récupérer le wallet actuel
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('balance, is_frozen')
      .eq('id', walletId)
      .single();

    if (fetchError) throw fetchError;

    if (wallet.is_frozen) {
      return { data: null, error: { message: 'Wallet gelé' } };
    }

    if (parseFloat(wallet.balance) < amount) {
      return { data: null, error: { message: 'Solde insuffisant' } };
    }

    const newBalance = parseFloat(wallet.balance) - amount;

    // Mettre à jour le wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    if (updateError) throw updateError;

    // Créer la transaction
    const { data: transaction, error: txnError } = await supabase
      .from('ledger_transactions')
      .insert({
        wallet_id: walletId,
        transaction_type: transactionType,
        amount: -amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        metadata,
      })
      .select()
      .single();

    if (txnError) throw txnError;

    return { 
      data: { 
        wallet: { ...wallet, balance: newBalance }, 
        transaction 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erreur debitWallet:', error);
    return { data: null, error };
  }
}

/**
 * Transfert P2P entre wallets
 */
export async function transferP2P(fromWalletId, toPhone, amount, description = '') {
  if (useMockData) {
    // Simuler le transfert
    const result = await debitWallet(fromWalletId, amount, 'transfer_out', {
      recipient_phone: toPhone,
      description,
    });

    if (result.error) return result;

    return {
      data: {
        ...result.data,
        recipient_phone: toPhone,
        status: 'completed',
      },
      error: null,
    };
  }

  try {
    // Chercher le destinataire par téléphone
    const cleanPhone = toPhone.replace(/\s/g, '').replace('+223', '');
    
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .single();

    let recipientWalletId = null;
    let isPending = false;

    if (recipientError || !recipient) {
      // Destinataire non inscrit - transfert en attente
      isPending = true;
    } else {
      // Récupérer le wallet du destinataire
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('owner_id', recipient.id)
        .eq('wallet_type', 'personal')
        .single();

      if (recipientWallet) {
        recipientWalletId = recipientWallet.id;
      } else {
        isPending = true;
      }
    }

    // Débiter l'expéditeur
    const debitResult = await debitWallet(fromWalletId, amount, 'transfer_out', {
      recipient_phone: toPhone,
      description,
      is_pending: isPending,
    });

    if (debitResult.error) return debitResult;

    // Si destinataire trouvé, créditer son wallet
    if (!isPending && recipientWalletId) {
      await creditWallet(recipientWalletId, amount, 'transfer_in', {
        sender_wallet_id: fromWalletId,
        description,
      });
    }

    return {
      data: {
        ...debitResult.data,
        recipient_phone: toPhone,
        is_pending: isPending,
        status: isPending ? 'pending_registration' : 'completed',
      },
      error: null,
    };
  } catch (error) {
    console.error('Erreur transferP2P:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les sous-wallets
 */
export async function getSubWallets(parentWalletId) {
  if (useMockData) {
    const stored = localStorage.getItem(`actoos_subwallets_${parentWalletId}`);
    return { data: stored ? JSON.parse(stored) : [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('parent_wallet_id', parentWalletId);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur getSubWallets:', error);
    return { data: [], error };
  }
}

/**
 * Créer un sous-wallet
 */
export async function createSubWallet(parentWalletId, ownerId, config) {
  const {
    name,
    linkedPhone,
    dailySpendLimit,
    allowedTimeStart,
    allowedTimeEnd,
    allowedCategories,
  } = config;

  if (useMockData) {
    const subWallet = {
      id: `subwallet-${Date.now()}`,
      parent_wallet_id: parentWalletId,
      owner_id: ownerId,
      wallet_type: 'sub_wallet',
      wallet_name: name,
      linked_phone: linkedPhone,
      balance: 0,
      daily_spend_limit: dailySpendLimit,
      allowed_time_start: allowedTimeStart,
      allowed_time_end: allowedTimeEnd,
      allowed_categories: allowedCategories,
      is_frozen: false,
      created_at: new Date().toISOString(),
    };

    const subWallets = JSON.parse(localStorage.getItem(`actoos_subwallets_${parentWalletId}`) || '[]');
    subWallets.push(subWallet);
    localStorage.setItem(`actoos_subwallets_${parentWalletId}`, JSON.stringify(subWallets));

    return { data: subWallet, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        parent_wallet_id: parentWalletId,
        owner_id: ownerId,
        wallet_type: 'sub_wallet',
        balance: 0,
        daily_spend_limit: dailySpendLimit,
        // Note: Les champs allowed_time_* et allowed_categories 
        // nécessitent une extension du schéma DB
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur createSubWallet:', error);
    return { data: null, error };
  }
}

export default {
  getWallet,
  getTransactions,
  creditWallet,
  debitWallet,
  transferP2P,
  getSubWallets,
  createSubWallet,
};
