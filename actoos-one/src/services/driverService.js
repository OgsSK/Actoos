/**
 * ACTOOS ONE - Driver Service
 * 
 * Service pour la gestion des livreurs et leurs wallets.
 * PRODUCTION MODE - Connecté à Supabase.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Commission livreur sur les frais de livraison
export const DRIVER_COMMISSION_RATE = 1.0; // 100% des frais de livraison

/**
 * Récupérer tous les livreurs (pour Admin)
 */
export async function getAllDrivers() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        users (id, name, phone, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrichir avec le statut de mission en cours
    const driversWithMissions = await Promise.all(
      (data || []).map(async (driver) => {
        // Vérifier si le driver a une mission en cours
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('id, order_number, status')
          .eq('driver_id', driver.id)
          .in('status', ['picked_up', 'delivering'])
          .single();

        return {
          ...driver,
          name: driver.users?.name || 'Livreur',
          phone: driver.users?.phone || '',
          avatar_url: driver.users?.avatar_url,
          current_order_id: currentOrder?.id || null,
          current_order_number: currentOrder?.order_number || null,
        };
      })
    );

    return { data: driversWithMissions, error: null };
  } catch (error) {
    console.error('Erreur getAllDrivers:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer un livreur par ID
 */
export async function getDriverById(driverId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        users (id, name, phone, email, avatar_url)
      `)
      .eq('id', driverId)
      .single();

    if (error) throw error;

    return { 
      data: {
        ...data,
        name: data.users?.name || 'Livreur',
        phone: data.users?.phone || '',
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erreur getDriverById:', error);
    return { data: null, error };
  }
}

/**
 * Mettre à jour le statut en ligne/hors ligne
 */
export async function updateDriverOnlineStatus(driverId, isOnline) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('drivers')
      .update({ 
        is_online: isOnline,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Driver ${driverId} is now ${isOnline ? 'online' : 'offline'}`);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur updateDriverOnlineStatus:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer le wallet d'un livreur
 */
export async function getDriverWallet(userId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // Utiliser maybeSingle() au lieu de single() pour éviter l'erreur si pas de résultat
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', userId);

    if (error) throw error;

    // Prendre le premier wallet si existe
    const wallet = wallets && wallets.length > 0 ? wallets[0] : null;

    // Si pas de wallet, en créer un
    if (!wallet) {
      console.log('📱 Création nouveau wallet pour user:', userId);
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ owner_id: userId, balance: 0 })
        .select()
        .single();

      if (createError) throw createError;
      return { data: newWallet, error: null };
    }

    console.log('📱 Wallet trouvé:', wallet.id, '- Balance:', wallet.balance);
    return { data: wallet, error: null };
  } catch (error) {
    console.error('Erreur getDriverWallet:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les gains du jour pour un livreur
 */
export async function getDriverTodayEarnings(walletId) {
  if (!isSupabaseConfigured()) {
    return { data: { earnings: 0, deliveries: 0 }, error: null };
  }

  try {
    // Début de la journée
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('amount, type')
      .eq('wallet_id', walletId)
      .in('type', ['commission', 'transfer_in'])
      .gte('created_at', today.toISOString());

    if (error) throw error;

    const earnings = (transactions || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const deliveries = (transactions || []).filter(t => t.type === 'commission').length;

    return { data: { earnings, deliveries }, error: null };
  } catch (error) {
    console.error('Erreur getDriverTodayEarnings:', error);
    return { data: { earnings: 0, deliveries: 0 }, error };
  }
}

/**
 * Récupérer l'historique des transactions d'un wallet
 */
export async function getWalletTransactions(walletId, options = {}) {
  const { limit = 20 } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erreur getWalletTransactions:', error);
    return { data: [], error };
  }
}

/**
 * Créditer le wallet d'un livreur après une livraison
 */
export async function creditDriverEarnings(driverId, orderId, amount, description) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // 1. Récupérer le driver et son user_id
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('id', driverId)
      .single();

    if (driverError) throw driverError;

    // 2. Récupérer le wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('owner_id', driver.user_id)
      .single();

    if (walletError) throw walletError;

    // 3. Calculer le nouveau solde
    const newBalance = parseFloat(wallet.balance) + amount;

    // 4. Mettre à jour le wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    // 5. Créer la transaction
    const { data: transaction, error: txnError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'commission',
        amount: amount,
        balance_after: newBalance,
        reference_id: orderId,
        description: description || `Livraison commande`,
      })
      .select()
      .single();

    if (txnError) throw txnError;

    // 6. Incrémenter le compteur de livraisons
    await supabase
      .from('drivers')
      .update({ 
        total_deliveries: (await supabase.from('drivers').select('total_deliveries').eq('id', driverId).single()).data.total_deliveries + 1 
      })
      .eq('id', driverId);

    console.log(`✅ Driver ${driverId} credited ${amount} FCFA for order ${orderId}`);
    return { data: transaction, error: null };
  } catch (error) {
    console.error('Erreur creditDriverEarnings:', error);
    return { data: null, error };
  }
}

/**
 * Accepter une mission (assigner le driver à une commande)
 */
export async function acceptMission(driverId, orderId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // Vérifier que la commande est disponible
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, driver_id')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    if (order.driver_id) {
      return { data: null, error: { message: 'Cette commande a déjà été prise' } };
    }

    if (order.status !== 'ready') {
      return { data: null, error: { message: 'Cette commande n\'est pas prête' } };
    }

    // Assigner le driver
    const { data, error } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        status: 'picked_up',
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Driver ${driverId} accepted mission ${orderId}`);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur acceptMission:', error);
    return { data: null, error };
  }
}

/**
 * Compléter une livraison
 */
export async function completeMission(driverId, orderId, deliveryCode) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // Vérifier le code de livraison
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, delivery_code, delivery_fee, driver_id')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    if (order.driver_id !== driverId) {
      return { data: null, error: { message: 'Cette commande n\'est pas la vôtre' } };
    }

    // Vérifier le code (format: #A42 ou A42 ou 1234)
    const cleanCode = deliveryCode.replace('#', '').toUpperCase();
    const orderCode = (order.delivery_code || '').replace('#', '').toUpperCase();

    if (cleanCode !== orderCode) {
      return { data: null, error: { message: 'Code de livraison incorrect' } };
    }

    // Marquer comme livré
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Créditer le driver (100% des frais de livraison)
    const driverEarnings = order.delivery_fee || 0;
    if (driverEarnings > 0) {
      await creditDriverEarnings(driverId, orderId, driverEarnings, `Livraison ${order.id.slice(0, 8)}`);
    }

    console.log(`✅ Mission ${orderId} completed by driver ${driverId}`);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur completeMission:', error);
    return { data: null, error };
  }
}

export default {
  getAllDrivers,
  getDriverById,
  updateDriverOnlineStatus,
  getDriverWallet,
  getDriverTodayEarnings,
  getWalletTransactions,
  creditDriverEarnings,
  acceptMission,
  completeMission,
  DRIVER_COMMISSION_RATE,
};
