/**
 * ACTOOS ONE - Refund Service
 * 
 * Gère les remboursements pour commandes annulées.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Types de remboursement
 */
export const REFUND_REASONS = {
  CUSTOMER_REQUEST: 'customer_request',
  RESTAURANT_CLOSED: 'restaurant_closed',
  ITEMS_UNAVAILABLE: 'items_unavailable',
  DRIVER_UNAVAILABLE: 'driver_unavailable',
  LONG_WAIT_TIME: 'long_wait_time',
  ORDER_ERROR: 'order_error',
  DUPLICATE_ORDER: 'duplicate_order',
  OTHER: 'other',
};

export const REFUND_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSED: 'processed',
  REJECTED: 'rejected',
};

/**
 * Calcule le montant du remboursement selon le statut de la commande
 */
export function calculateRefundAmount(order) {
  const orderTotal = parseFloat(order.total_amount || order.total || 0);
  const deliveryFee = parseFloat(order.delivery_fee || 0);
  
  // Règles de remboursement selon le statut
  switch (order.status) {
    case 'pending':
    case 'confirmed':
      // Remboursement total si pas encore préparé
      return {
        refundAmount: orderTotal,
        refundDeliveryFee: true,
        refundPercentage: 100,
        reason: 'Commande annulée avant préparation',
      };
    
    case 'preparing':
      // Remboursement partiel (70%) si en préparation
      return {
        refundAmount: Math.round(orderTotal * 0.7),
        refundDeliveryFee: true,
        refundPercentage: 70,
        reason: 'Commande annulée pendant la préparation',
      };
    
    case 'ready':
      // Pas de remboursement sur les articles, mais livraison remboursée
      return {
        refundAmount: deliveryFee,
        refundDeliveryFee: true,
        refundPercentage: 0,
        reason: 'Commande prête - livraison remboursée uniquement',
      };
    
    case 'picked_up':
    case 'on_the_way':
    case 'delivering':
      // Pas de remboursement si en livraison
      return {
        refundAmount: 0,
        refundDeliveryFee: false,
        refundPercentage: 0,
        reason: 'Commande en cours de livraison - pas de remboursement',
      };
    
    default:
      return {
        refundAmount: 0,
        refundDeliveryFee: false,
        refundPercentage: 0,
        reason: 'Statut non éligible au remboursement',
      };
  }
}

/**
 * Créer une demande de remboursement
 */
export async function createRefundRequest(orderId, reason, requestedBy) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, users(id, email, name)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // 2. Calculer le montant du remboursement
    const refundCalc = calculateRefundAmount(order);

    if (refundCalc.refundAmount <= 0) {
      return { 
        data: null, 
        error: { message: refundCalc.reason } 
      };
    }

    // 3. Créer la demande de remboursement
    const { data: refund, error: refundError } = await supabase
      .from('refund_requests')
      .insert({
        order_id: orderId,
        user_id: order.user_id,
        amount: refundCalc.refundAmount,
        reason: reason || refundCalc.reason,
        status: REFUND_STATUS.PENDING,
        requested_by: requestedBy,
        refund_percentage: refundCalc.refundPercentage,
      })
      .select()
      .single();

    if (refundError) {
      // Si la table n'existe pas, créer un mock
      console.log('Table refund_requests non disponible, simulation locale');
      return {
        data: {
          id: `refund-${Date.now()}`,
          order_id: orderId,
          user_id: order.user_id,
          amount: refundCalc.refundAmount,
          reason: reason || refundCalc.reason,
          status: REFUND_STATUS.PENDING,
          created_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    console.log('✅ Demande de remboursement créée:', refund.id);
    return { data: refund, error: null };
  } catch (error) {
    console.error('Erreur createRefundRequest:', error);
    return { data: null, error };
  }
}

/**
 * Traiter un remboursement (admin)
 */
export async function processRefund(refundId, adminId, action = 'approve') {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer la demande de remboursement
    const { data: refund, error: refundError } = await supabase
      .from('refund_requests')
      .select('*, orders(*)')
      .eq('id', refundId)
      .single();

    if (refundError) throw refundError;

    if (action === 'reject') {
      // Rejeter le remboursement
      const { data, error } = await supabase
        .from('refund_requests')
        .update({
          status: REFUND_STATUS.REJECTED,
          processed_by: adminId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', refundId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    }

    // 2. Trouver le wallet du client
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', refund.user_id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') throw walletError;

    // Si pas de wallet, en créer un
    let userWallet = wallet;
    if (!userWallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ owner_id: refund.user_id, balance: 0 })
        .select()
        .single();
      
      if (createError) throw createError;
      userWallet = newWallet;
    }

    // 3. Créditer le wallet
    const newBalance = parseFloat(userWallet.balance) + refund.amount;
    
    await supabase
      .from('wallets')
      .update({ 
        balance: newBalance, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userWallet.id);

    // 4. Créer la transaction de remboursement
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: userWallet.id,
        type: 'refund',
        amount: refund.amount,
        balance_after: newBalance,
        reference_id: refund.order_id,
        description: `Remboursement commande #${refund.order_id?.slice(-4) || 'N/A'}`,
      });

    // 5. Mettre à jour le statut du remboursement
    const { data, error } = await supabase
      .from('refund_requests')
      .update({
        status: REFUND_STATUS.PROCESSED,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Remboursement ${refundId} traité: +${refund.amount} FCFA`);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur processRefund:', error);
    return { data: null, error };
  }
}

/**
 * Annuler une commande avec remboursement automatique
 */
export async function cancelOrderWithRefund(orderId, reason, userId, autoRefund = true) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Vérifier si annulation possible
    const nonCancellableStatuses = ['delivered', 'cancelled', 'picked_up', 'on_the_way', 'delivering'];
    if (nonCancellableStatuses.includes(order.status)) {
      return { 
        data: null, 
        error: { message: `Impossible d'annuler une commande avec statut: ${order.status}` } 
      };
    }

    // 2. Calculer le remboursement
    const refundCalc = calculateRefundAmount(order);

    // 3. Annuler la commande - only update columns that exist in the schema
    const { data: cancelledOrder, error: cancelError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (cancelError) throw cancelError;

    // 4. Créer la demande de remboursement si montant > 0 et paiement wallet
    if (autoRefund && refundCalc.refundAmount > 0 && order.payment_method === 'wallet') {
      await createRefundRequest(orderId, reason, userId);
    }

    console.log(`✅ Commande ${orderId} annulée. Remboursement: ${refundCalc.refundAmount} FCFA`);
    return { 
      data: {
        order: cancelledOrder,
        refund: refundCalc,
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erreur cancelOrderWithRefund:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les demandes de remboursement (admin)
 */
export async function getRefundRequests(status = null) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    let query = supabase
      .from('refund_requests')
      .select('*, orders(*), users(id, email, name)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.log('Table refund_requests non disponible');
      return { data: [], error: null };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erreur getRefundRequests:', error);
    return { data: [], error };
  }
}

export default {
  calculateRefundAmount,
  createRefundRequest,
  processRefund,
  cancelOrderWithRefund,
  getRefundRequests,
  REFUND_REASONS,
  REFUND_STATUS,
};
