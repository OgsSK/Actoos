/**
 * ACTOOS ONE - Financial Service
 * 
 * Service central pour toutes les opérations financières:
 * - Settlement au Handshake (répartition des fonds)
 * - Calcul des commissions
 * - Gestion des retraits
 * - Recharge wallet
 * 
 * PRODUCTION MODE - Connecté à Supabase
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  calculateCommission, 
  calculateDeliveryFee, 
  calculateWithdrawal,
  WALLET_CONFIG,
  COMMISSION_CONFIG 
} from '../config/businessConfig';

// Types de wallet
export const WALLET_TYPES = {
  CLIENT: 'client',
  PARTNER_EARNINGS: 'partner_earnings',
  DRIVER_CAUTION: 'driver_caution',
  ACTOOS_REVENUE: 'actoos_revenue',
};

// Types de transactions
export const TRANSACTION_TYPES = {
  // Client
  TOPUP: 'topup',
  PAYMENT: 'payment',
  REFUND: 'refund',
  
  // Partner
  EARNING: 'earning',
  WITHDRAWAL: 'withdrawal',
  
  // Driver
  COMMISSION: 'commission',
  CAUTION_TOPUP: 'caution_topup',
  CAUTION_DEBIT: 'caution_debit',
  
  // System
  SETTLEMENT: 'settlement',
};

// Statuts de retrait
export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// =============================================================================
// WALLET OPERATIONS
// =============================================================================

/**
 * Récupérer ou créer un wallet pour un utilisateur
 */
export async function getOrCreateWallet(userId, walletType = WALLET_TYPES.CLIENT) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // Chercher le wallet existant
    const { data: existingWallets, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', userId)
      .eq('wallet_type', walletType);

    if (fetchError) throw fetchError;

    if (existingWallets && existingWallets.length > 0) {
      return { data: existingWallets[0], error: null };
    }

    // Créer un nouveau wallet
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        owner_id: userId,
        wallet_type: walletType,
        balance: 0,
        is_frozen: false,
      })
      .select()
      .single();

    if (createError) throw createError;

    console.log(`✅ Nouveau wallet créé: ${walletType} pour user ${userId}`);
    return { data: newWallet, error: null };
  } catch (error) {
    console.error('Erreur getOrCreateWallet:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer le solde d'un wallet
 */
export async function getWalletBalance(userId, walletType = WALLET_TYPES.CLIENT) {
  const { data: wallet, error } = await getOrCreateWallet(userId, walletType);
  if (error) return { balance: 0, error };
  return { balance: parseFloat(wallet?.balance || 0), wallet, error: null };
}

/**
 * Recharger un wallet (TopUp)
 * @param {string} userId - ID utilisateur
 * @param {number} amount - Montant à recharger
 * @param {string} method - 'orange_money' | 'wave' | 'touchpay' | 'moov_money'
 * @param {string} phoneNumber - Numéro de téléphone pour le paiement
 */
export async function topUpWallet(userId, amount, method = 'orange_money', phoneNumber = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  if (amount < WALLET_CONFIG.min_withdrawal) {
    return { data: null, error: { message: `Montant minimum: ${WALLET_CONFIG.min_withdrawal} FCFA` } };
  }

  try {
    // 1. Récupérer ou créer le wallet
    const { data: wallet, error: walletError } = await getOrCreateWallet(userId, WALLET_TYPES.CLIENT);
    if (walletError) throw walletError;

    // 2. Calculer le nouveau solde
    const currentBalance = parseFloat(wallet.balance || 0);
    const newBalance = currentBalance + amount;

    // 3. Mettre à jour le wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    // 4. Créer la transaction
    const { data: transaction, error: txnError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: TRANSACTION_TYPES.TOPUP,
        amount: amount,
        balance_after: newBalance,
        description: `Recharge ${method}`,
        metadata: { 
          method, 
          phone: phoneNumber,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (txnError) throw txnError;

    console.log(`✅ Wallet rechargé: +${amount} FCFA via ${method}`);
    return { 
      data: { 
        wallet: { ...wallet, balance: newBalance }, 
        transaction,
        newBalance,
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erreur topUpWallet:', error);
    return { data: null, error };
  }
}

/**
 * Payer avec le wallet (débit client)
 */
export async function payWithWallet(userId, amount, orderId, description = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer le wallet
    const { data: wallet, error: walletError } = await getOrCreateWallet(userId, WALLET_TYPES.CLIENT);
    if (walletError) throw walletError;

    // 2. Vérifier le solde
    const currentBalance = parseFloat(wallet.balance || 0);
    if (currentBalance < amount) {
      return { 
        data: null, 
        error: { 
          message: 'Solde insuffisant',
          currentBalance,
          required: amount,
          shortfall: amount - currentBalance,
        } 
      };
    }

    // 3. Débiter le wallet
    const newBalance = currentBalance - amount;

    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    // 4. Créer la transaction
    const { data: transaction, error: txnError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: TRANSACTION_TYPES.PAYMENT,
        amount: -amount,
        balance_after: newBalance,
        reference_id: orderId,
        description: description || `Paiement commande`,
      })
      .select()
      .single();

    if (txnError) throw txnError;

    console.log(`✅ Paiement wallet: -${amount} FCFA pour commande ${orderId}`);
    return { 
      data: { 
        wallet: { ...wallet, balance: newBalance }, 
        transaction,
        newBalance,
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erreur payWithWallet:', error);
    return { data: null, error };
  }
}

// =============================================================================
// SETTLEMENT (HANDSHAKE #A42)
// =============================================================================

/**
 * Effectuer le settlement complet d'une commande
 * Appelé quand le livreur entre le code Handshake
 * 
 * @param {string} orderId - ID de la commande
 * @param {string} driverId - ID du livreur
 */
export async function settleOrder(orderId, driverId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer les détails de la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        partners (id, user_id, name, delivery_type, commission_rate)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // 2. Récupérer le driver
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, user_id')
      .eq('id', driverId)
      .single();

    if (driverError) throw driverError;

    // 3. Calculer la répartition financière
    const subtotal = parseFloat(order.subtotal || 0);
    const deliveryFee = parseFloat(order.delivery_fee || 0);
    const paymentMethod = order.payment_method || 'cash';
    
    // Déterminer le type de livraison et la verticale
    const deliveryType = order.delivery_type === 'pickup' ? 'pickup' 
      : (order.partners?.delivery_type === 'self' ? 'self_delivery' : 'actoos_delivery');
    const vertical = order.vertical || 'eats';
    
    // Calculer les commissions
    const commissionResult = calculateCommission({
      subtotal,
      deliveryFee,
      vertical,
      deliveryType,
    });

    const { distribution } = commissionResult;

    // 4. Créditer le wallet du partenaire (partner_earnings)
    if (distribution.partner > 0 && order.partners?.user_id) {
      const { data: partnerWallet, error: pwError } = await getOrCreateWallet(
        order.partners.user_id, 
        WALLET_TYPES.PARTNER_EARNINGS
      );
      if (pwError) throw pwError;

      const partnerNewBalance = parseFloat(partnerWallet.balance || 0) + distribution.partner;

      await supabase
        .from('wallets')
        .update({ balance: partnerNewBalance, updated_at: new Date().toISOString() })
        .eq('id', partnerWallet.id);

      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: partnerWallet.id,
          type: TRANSACTION_TYPES.EARNING,
          amount: distribution.partner,
          balance_after: partnerNewBalance,
          reference_id: orderId,
          description: `Commande #${order.order_number || orderId.slice(0, 8)}`,
          metadata: { commission_rate: commissionResult.commission.rate },
        });

      console.log(`✅ Partenaire crédité: +${distribution.partner} FCFA`);
    }

    // 5. Gérer le wallet du livreur (driver_caution)
    if (driver?.user_id) {
      const { data: driverWallet, error: dwError } = await getOrCreateWallet(
        driver.user_id, 
        WALLET_TYPES.DRIVER_CAUTION
      );
      if (dwError) throw dwError;

      let driverNewBalance = parseFloat(driverWallet.balance || 0);

      if (paymentMethod === 'cash') {
        // CASH: Le livreur encaisse tout en physique
        // On DÉBITE sa caution de la part restaurant + Actoos
        const debitAmount = distribution.partner + distribution.actoos;
        driverNewBalance -= debitAmount;

        // Transaction de débit caution
        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: driverWallet.id,
            type: TRANSACTION_TYPES.CAUTION_DEBIT,
            amount: -debitAmount,
            balance_after: driverNewBalance,
            reference_id: orderId,
            description: `Prélèvement cash - Commande #${order.order_number || orderId.slice(0, 8)}`,
            metadata: { 
              partner_share: distribution.partner,
              actoos_share: distribution.actoos,
              driver_keeps: deliveryFee,
            },
          });

        console.log(`✅ Caution livreur débitée: -${debitAmount} FCFA (garde ${deliveryFee} FCFA cash)`);
      } else {
        // WALLET: On crédite directement le livreur de sa commission
        if (distribution.driver > 0) {
          driverNewBalance += distribution.driver;

          await supabase
            .from('wallet_transactions')
            .insert({
              wallet_id: driverWallet.id,
              type: TRANSACTION_TYPES.COMMISSION,
              amount: distribution.driver,
              balance_after: driverNewBalance,
              reference_id: orderId,
              description: `Commission livraison - Commande #${order.order_number || orderId.slice(0, 8)}`,
            });

          console.log(`✅ Livreur crédité: +${distribution.driver} FCFA`);
        }
      }

      // Mettre à jour le wallet du livreur
      await supabase
        .from('wallets')
        .update({ balance: driverNewBalance, updated_at: new Date().toISOString() })
        .eq('id', driverWallet.id);

      // Incrémenter les livraisons du driver
      await supabase.rpc('increment_driver_deliveries', { driver_id: driverId });
    }

    // 6. Enregistrer la commission Actoos (pour reporting)
    // Note: En production, créer un wallet system pour Actoos
    console.log(`✅ Commission Actoos: +${distribution.actoos} FCFA`);

    // 7. Mettre à jour la commande comme "settled"
    await supabase
      .from('orders')
      .update({ 
        is_settled: true,
        settled_at: new Date().toISOString(),
        settlement_details: {
          partner_earnings: distribution.partner,
          driver_earnings: distribution.driver,
          actoos_commission: distribution.actoos,
          payment_method: paymentMethod,
        },
      })
      .eq('id', orderId);

    console.log(`✅ Settlement complet pour commande ${orderId}`);

    return {
      data: {
        orderId,
        distribution,
        paymentMethod,
        settled_at: new Date().toISOString(),
      },
      error: null,
    };
  } catch (error) {
    console.error('Erreur settleOrder:', error);
    return { data: null, error };
  }
}

// =============================================================================
// WITHDRAWALS (RETRAITS)
// =============================================================================

/**
 * Créer une demande de retrait
 */
export async function createWithdrawalRequest(userId, walletType, amount, method, phoneOrAccount) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Valider le montant et calculer les frais
    const withdrawalCalc = calculateWithdrawal(amount, method);
    if (!withdrawalCalc.valid) {
      return { data: null, error: { message: withdrawalCalc.error } };
    }

    // 2. Récupérer le wallet
    const { data: wallet, error: walletError } = await getOrCreateWallet(userId, walletType);
    if (walletError) throw walletError;

    // 3. Vérifier le solde
    const currentBalance = parseFloat(wallet.balance || 0);
    if (currentBalance < amount) {
      return { 
        data: null, 
        error: { message: `Solde insuffisant. Disponible: ${currentBalance.toLocaleString()} FCFA` } 
      };
    }

    // 4. Geler le montant (débiter immédiatement)
    const newBalance = currentBalance - amount;
    await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    // 5. Créer la demande de retrait
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        wallet_id: wallet.id,
        user_id: userId,
        amount: amount,
        fee: withdrawalCalc.fee,
        net_amount: withdrawalCalc.received,
        method: method,
        destination: phoneOrAccount,
        status: WITHDRAWAL_STATUS.PENDING,
      })
      .select()
      .single();

    if (withdrawalError) throw withdrawalError;

    // 6. Créer la transaction de retrait
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: TRANSACTION_TYPES.WITHDRAWAL,
        amount: -amount,
        balance_after: newBalance,
        reference_id: withdrawal.id,
        description: `Retrait ${method} vers ${phoneOrAccount}`,
        metadata: { 
          fee: withdrawalCalc.fee,
          net_amount: withdrawalCalc.received,
        },
      });

    console.log(`✅ Demande de retrait créée: ${amount} FCFA via ${method}`);

    return {
      data: {
        withdrawal,
        calculation: withdrawalCalc,
        newBalance,
      },
      error: null,
    };
  } catch (error) {
    console.error('Erreur createWithdrawalRequest:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les demandes de retrait d'un utilisateur
 */
export async function getUserWithdrawals(userId, options = {}) {
  const { limit = 20, status = null } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    let query = supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Erreur getUserWithdrawals:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer toutes les demandes de retrait (Admin)
 */
export async function getAllWithdrawals(options = {}) {
  const { limit = 50, status = null } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        users (name, phone, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Erreur getAllWithdrawals:', error);
    return { data: [], error };
  }
}

/**
 * Approuver un retrait (Admin)
 */
export async function approveWithdrawal(withdrawalId, adminId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: WITHDRAWAL_STATUS.COMPLETED,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId)
      .eq('status', WITHDRAWAL_STATUS.PENDING)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Retrait ${withdrawalId} approuvé`);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur approveWithdrawal:', error);
    return { data: null, error };
  }
}

/**
 * Rejeter un retrait et rembourser (Admin)
 */
export async function rejectWithdrawal(withdrawalId, adminId, reason) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer le retrait
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, wallets (id, balance)')
      .eq('id', withdrawalId)
      .eq('status', WITHDRAWAL_STATUS.PENDING)
      .single();

    if (fetchError) throw fetchError;

    // 2. Rembourser le wallet
    const newBalance = parseFloat(withdrawal.wallets.balance) + withdrawal.amount;
    await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', withdrawal.wallet_id);

    // 3. Créer transaction de remboursement
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: withdrawal.wallet_id,
        type: 'refund',
        amount: withdrawal.amount,
        balance_after: newBalance,
        reference_id: withdrawalId,
        description: `Remboursement retrait rejeté: ${reason}`,
      });

    // 4. Mettre à jour le statut
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: WITHDRAWAL_STATUS.CANCELLED,
        rejection_reason: reason,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Retrait ${withdrawalId} rejeté et remboursé`);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur rejectWithdrawal:', error);
    return { data: null, error };
  }
}

// =============================================================================
// PARTNER EARNINGS
// =============================================================================

/**
 * Récupérer les gains d'un partenaire
 */
export async function getPartnerEarnings(partnerId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer le partenaire pour avoir son user_id
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('user_id, name')
      .eq('id', partnerId)
      .single();

    if (partnerError) throw partnerError;

    // 2. Récupérer son wallet earnings
    const { data: wallet, error: walletError } = await getOrCreateWallet(
      partner.user_id, 
      WALLET_TYPES.PARTNER_EARNINGS
    );
    if (walletError) throw walletError;

    // 3. Calculer les stats du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTransactions } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('wallet_id', wallet.id)
      .eq('type', TRANSACTION_TYPES.EARNING)
      .gte('created_at', today.toISOString());

    const todayEarnings = (todayTransactions || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const todayOrders = (todayTransactions || []).length;

    // 4. Calculer les stats du mois
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: monthTransactions } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('wallet_id', wallet.id)
      .eq('type', TRANSACTION_TYPES.EARNING)
      .gte('created_at', monthStart.toISOString());

    const monthEarnings = (monthTransactions || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      data: {
        wallet,
        balance: parseFloat(wallet.balance || 0),
        todayEarnings,
        todayOrders,
        monthEarnings,
        partnerName: partner.name,
      },
      error: null,
    };
  } catch (error) {
    console.error('Erreur getPartnerEarnings:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer l'historique des gains d'un partenaire
 */
export async function getPartnerTransactions(partnerId, options = {}) {
  const { limit = 50 } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer le partenaire
    const { data: partner } = await supabase
      .from('partners')
      .select('user_id')
      .eq('id', partnerId)
      .single();

    if (!partner) {
      return { data: [], error: { message: 'Partenaire non trouvé' } };
    }

    // 2. Récupérer son wallet
    const { data: wallet } = await getOrCreateWallet(partner.user_id, WALLET_TYPES.PARTNER_EARNINGS);

    if (!wallet) {
      return { data: [], error: null };
    }

    // 3. Récupérer les transactions
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Erreur getPartnerTransactions:', error);
    return { data: [], error };
  }
}

// =============================================================================
// DRIVER CAUTION
// =============================================================================

/**
 * Recharger la caution d'un livreur
 */
export async function topUpDriverCaution(driverId, amount, method, phoneNumber) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer le driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('id', driverId)
      .single();

    if (!driver) {
      return { data: null, error: { message: 'Livreur non trouvé' } };
    }

    // 2. Récupérer ou créer le wallet caution
    const { data: wallet, error: walletError } = await getOrCreateWallet(
      driver.user_id, 
      WALLET_TYPES.DRIVER_CAUTION
    );
    if (walletError) throw walletError;

    // 3. Créditer le wallet
    const newBalance = parseFloat(wallet.balance || 0) + amount;

    await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    // 4. Créer la transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: TRANSACTION_TYPES.CAUTION_TOPUP,
        amount: amount,
        balance_after: newBalance,
        description: `Recharge caution via ${method}`,
        metadata: { method, phone: phoneNumber },
      });

    console.log(`✅ Caution livreur rechargée: +${amount} FCFA`);

    return {
      data: {
        wallet: { ...wallet, balance: newBalance },
        newBalance,
      },
      error: null,
    };
  } catch (error) {
    console.error('Erreur topUpDriverCaution:', error);
    return { data: null, error };
  }
}

/**
 * Retirer de la caution livreur vers Mobile Money
 */
export async function withdrawDriverCaution(driverId, amount, method, phoneNumber) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer le driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('id', driverId)
      .single();

    if (!driver) {
      return { data: null, error: { message: 'Livreur non trouvé' } };
    }

    // 2. Créer la demande de retrait
    return await createWithdrawalRequest(
      driver.user_id,
      WALLET_TYPES.DRIVER_CAUTION,
      amount,
      method,
      phoneNumber
    );
  } catch (error) {
    console.error('Erreur withdrawDriverCaution:', error);
    return { data: null, error };
  }
}

// =============================================================================
// SYSTEM CONFIG
// =============================================================================

/**
 * Récupérer la configuration système
 */
export async function getSystemConfig() {
  if (!isSupabaseConfigured()) {
    // Retourner la config par défaut
    return {
      data: {
        commission_base_eats: COMMISSION_CONFIG.eats.actoos_delivery,
        commission_self_eats: COMMISSION_CONFIG.eats.self_delivery,
        commission_pickup_eats: COMMISSION_CONFIG.eats.pickup,
        commission_base_health: COMMISSION_CONFIG.health.actoos_delivery,
        commission_self_health: COMMISSION_CONFIG.health.self_delivery,
        delivery_base_fee: 700,
        delivery_per_km: 200,
        sos_premium: 500,
        min_driver_caution: WALLET_CONFIG.min_driver_caution,
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value');

    if (error) throw error;

    // Convertir en objet
    const config = {};
    (data || []).forEach(row => {
      config[row.key] = parseFloat(row.value) || row.value;
    });

    return { data: config, error: null };
  } catch (error) {
    console.error('Erreur getSystemConfig:', error);
    return { data: null, error };
  }
}

export default {
  // Wallet
  getOrCreateWallet,
  getWalletBalance,
  topUpWallet,
  payWithWallet,
  
  // Settlement
  settleOrder,
  
  // Withdrawals
  createWithdrawalRequest,
  getUserWithdrawals,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  
  // Partner
  getPartnerEarnings,
  getPartnerTransactions,
  
  // Driver
  topUpDriverCaution,
  withdrawDriverCaution,
  
  // Config
  getSystemConfig,
  
  // Constants
  WALLET_TYPES,
  TRANSACTION_TYPES,
  WITHDRAWAL_STATUS,
};
