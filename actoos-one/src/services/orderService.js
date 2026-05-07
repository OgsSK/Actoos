/**
 * ACTOOS ONE - Order Service
 * 
 * Service pour la gestion des commandes.
 * PRODUCTION MODE - Toutes les commandes sont enregistrées dans Supabase.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { calculateDeliveryFee } from '../config/businessConfig';

/**
 * Calculer le total d'une commande
 * @param {Array} cartItems - Items du panier
 * @param {number} deliveryFee - Frais de livraison
 * @returns {Object} { subtotal, deliveryFee, total }
 */
export function calculateOrderTotal(cartItems, deliveryFee = 0) {
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.price_at_time || item.price || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}

/**
 * Créer une nouvelle commande
 */
export async function createOrder(orderData) {
  const {
    userId,
    partnerId,
    items, // Array of { menu_item_id, name, quantity, unit_price, special_instructions }
    deliveryType = 'delivery', // 'delivery' | 'pickup'
    paymentMethod = 'cash', // 'wallet' | 'cash' | 'mobile_money'
    deliveryAddress,
    deliveryLatitude,
    deliveryLongitude,
    deliveryInstructions,
    distanceKm = 2,
  } = orderData;

  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  // Calculer les montants
  const subtotal = items.reduce((sum, item) => sum + ((item.unit_price || item.price) * item.quantity), 0);
  
  const deliveryResult = deliveryType === 'pickup' 
    ? { fee: 0 }
    : calculateDeliveryFee({ distanceKm, deliveryType: 'actoos' });
  
  const deliveryFee = deliveryResult.fee;
  const total = subtotal + deliveryFee;

  // Generate delivery_code for handshake
  const deliveryCode = `#${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;

  try {
    // 1. Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: userId || null,
        partner_id: partnerId,
        delivery_code: deliveryCode,
        status: 'pending',
        delivery_type: deliveryType,
        subtotal,
        delivery_fee: deliveryFee,
        service_fee: 0,
        total_amount: total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'wallet' ? 'completed' : 'pending',
        delivery_address: deliveryAddress,
        delivery_latitude: deliveryLatitude,
        delivery_longitude: deliveryLongitude,
        delivery_instructions: deliveryInstructions,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Créer les items de la commande
    const orderItems = items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id || item.id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price || item.price,
      total_price: (item.unit_price || item.price) * item.quantity,
      special_instructions: item.special_instructions || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Erreur création items:', itemsError);
    }

    console.log('✅ Commande créée:', order.id);
    return { data: { ...order, delivery_code: deliveryCode, items: orderItems }, error: null };
  } catch (error) {
    console.error('Erreur createOrder:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer une commande par ID
 */
export async function getOrderById(orderId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (name, image_url)
        ),
        partners (name, image_url)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return { data: order, error: null };
  } catch (error) {
    console.error('Erreur getOrderById:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les commandes d'un utilisateur
 */
export async function getUserOrders(userId, options = {}) {
  const { limit = 20, status = null } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        partners (name, image_url),
        order_items (quantity, unit_price, name)
      `)
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur getUserOrders:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer les commandes d'un partenaire
 */
export async function getPartnerOrders(partnerId, options = {}) {
  const { limit = 50, status = null } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur getPartnerOrders:', error);
    return { data: [], error };
  }
}

/**
 * Mettre à jour le statut d'une commande
 */
export async function updateOrderStatus(orderId, newStatus, actorId = null) {
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['picked_up', 'cancelled'],
    picked_up: ['delivering'],
    delivering: ['delivered'],
  };

  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    // Vérifier la commande actuelle
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    const allowedStatuses = validTransitions[currentOrder.status] || [];
    if (!allowedStatuses.includes(newStatus)) {
      return { 
        data: null, 
        error: { message: `Transition ${currentOrder.status} → ${newStatus} non autorisée` } 
      };
    }

    // Mettre à jour
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Ajouter le timestamp approprié
    const timestampField = `${newStatus}_at`;
    updateData[timestampField] = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Statut commande mis à jour:', orderId, '→', newStatus);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur updateOrderStatus:', error);
    return { data: null, error };
  }
}

/**
 * Annuler une commande
 */
export async function cancelOrder(orderId, reason, userId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Commande annulée:', orderId);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur cancelOrder:', error);
    return { data: null, error };
  }
}

/**
 * Souscrire aux mises à jour d'une commande en temps réel
 */
export function subscribeToOrder(orderId, callback) {
  if (!isSupabaseConfigured()) {
    console.error('Supabase non configuré pour realtime');
    return () => {};
  }

  const channel = supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Récupérer toutes les commandes (Admin)
 */
export async function getAllOrders(options = {}) {
  const { limit = 100, status = null } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        partners (name),
        order_items (*)
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
    console.error('Erreur getAllOrders:', error);
    return { data: [], error };
  }
}

export default {
  createOrder,
  getOrderById,
  getUserOrders,
  getPartnerOrders,
  updateOrderStatus,
  cancelOrder,
  subscribeToOrder,
  getAllOrders,
};
