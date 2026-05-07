/**
 * ACTOOS ONE - Wallet Service
 * 
 * Service pour les opérations wallet et transactions.
 * PRODUCTION MODE - Toutes les données sont dans Supabase.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Récupérer le wallet d'un utilisateur
 */
export async function getWallet(userId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // Chercher le wallet existant
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Wallet n'existe pas, le créer
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          owner_id: userId,
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

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' }, count: 0 };
  }

  try {
    const { data, error, count } = await supabase
      .from('wallet_transactions')
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
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
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
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        type: transactionType,
        amount: amount,
        balance_after: newBalance,
        description: metadata.description || null,
        reference_id: metadata.reference_id || null,
      })
      .select()
      .single();

    if (txnError) throw txnError;

    console.log('✅ Wallet crédité:', amount, 'FCFA');
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
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
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
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        type: transactionType,
        amount: -amount,
        balance_after: newBalance,
        description: metadata.description || null,
        reference_id: metadata.reference_id || null,
      })
      .select()
      .single();

    if (txnError) throw txnError;

    console.log('✅ Wallet débité:', amount, 'FCFA');
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

export default {
  getWallet,
  getTransactions,
  creditWallet,
  debitWallet,
};
