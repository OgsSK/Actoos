/**
 * ACTOOS ONE - Order Service
 * 
 * Service pour la gestion des commandes.
 * Supporte mode Supabase et mode mocké.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { calculateDeliveryFee, calculateCommission } from '../config/businessConfig';

const useMockData = !isSupabaseConfigured();

// Stockage local pour les commandes mockées
const MOCK_ORDERS_KEY = 'actoos_mock_orders';

function getMockOrders() {
  const stored = localStorage.getItem(MOCK_ORDERS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveMockOrders(orders) {
  localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
}

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
    items, // Array of { item_id, quantity, price_at_time, special_instructions }
    deliveryType = 'delivery', // 'delivery' | 'pickup'
    paymentMethod = 'wallet', // 'wallet' | 'cash' | 'mobile_money'
    deliveryAddress,
    deliveryLatitude,
    deliveryLongitude,
    deliveryInstructions,
    distanceKm = 2,
    isScheduled = false,
    scheduledFor = null,
    vertical = 'eats',
  } = orderData;

  // Calculer les montants
  const subtotal = items.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
  
  const deliveryResult = deliveryType === 'pickup' 
    ? { fee: 0 }
    : calculateDeliveryFee({ distanceKm, deliveryType: 'actoos' });
  
  const deliveryFee = deliveryResult.fee;
  const total = subtotal + deliveryFee;

  // Générer un code de livraison (4 chiffres)
  const deliveryCode = String(Math.floor(1000 + Math.random() * 9000));

  if (useMockData) {
    const mockOrder = {
      id: `order-${Date.now()}`,
      client_id: userId || 'guest',
      partner_id: partnerId,
      driver_id: null,
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
      delivery_code: deliveryCode,
      is_scheduled: isScheduled,
      scheduled_for: scheduledFor,
      items: items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orders = getMockOrders();
    orders.unshift(mockOrder);
    saveMockOrders(orders);

    return { data: mockOrder, error: null };
  }

  try {
    // Créer la commande dans Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: userId,
        partner_id: partnerId,
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
        delivery_code: deliveryCode,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Créer les items de la commande
    const orderItems = items.map(item => ({
      order_id: order.id,
      item_id: item.item_id,
      quantity: item.quantity,
      price_at_time: item.price_at_time,
      special_instructions: item.special_instructions,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Erreur création items:', itemsError);
    }

    // Logger l'événement
    await logOrderEvent(order.id, 'created', userId, 'client');

    return { data: { ...order, items }, error: null };
  } catch (error) {
    console.error('Erreur createOrder:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer une commande par ID
 */
export async function getOrderById(orderId) {
  if (useMockData) {
    const orders = getMockOrders();
    const order = orders.find(o => o.id === orderId);
    return { data: order || null, error: order ? null : { message: 'Commande non trouvée' } };
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
        partners (name, image_url),
        drivers (users (name))
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

  if (useMockData) {
    let orders = getMockOrders().filter(o => o.client_id === userId || o.client_id === 'guest');
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    return { data: orders.slice(0, limit), error: null };
  }

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        partners (name, image_url),
        order_items (quantity, price_at_time, menu_items (name))
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
 * Mettre à jour le statut d'une commande
 */
export async function updateOrderStatus(orderId, newStatus, actorId = null, actorType = 'system') {
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['picked_up', 'cancelled'],
    picked_up: ['delivering'],
    delivering: ['delivered'],
  };

  if (useMockData) {
    const orders = getMockOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      return { data: null, error: { message: 'Commande non trouvée' } };
    }

    const order = orders[orderIndex];
    const allowedStatuses = validTransitions[order.status] || [];
    
    if (!allowedStatuses.includes(newStatus)) {
      return { 
        data: null, 
        error: { message: `Transition ${order.status} → ${newStatus} non autorisée` } 
      };
    }

    orders[orderIndex] = {
      ...order,
      status: newStatus,
      [`${newStatus}_at`]: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    saveMockOrders(orders);
    return { data: orders[orderIndex], error: null };
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

    if (newStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Logger l'événement
    await logOrderEvent(orderId, `status_${newStatus}`, actorId, actorType);

    return { data, error: null };
  } catch (error) {
    console.error('Erreur updateOrderStatus:', error);
    return { data: null, error };
  }
}

/**
 * Annuler une commande
 */
export async function cancelOrder(orderId, reason, userId, userType = 'client') {
  if (useMockData) {
    const orders = getMockOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      return { data: null, error: { message: 'Commande non trouvée' } };
    }

    const order = orders[orderIndex];
    const cancellableStatuses = ['pending', 'confirmed', 'preparing'];
    
    if (!cancellableStatuses.includes(order.status)) {
      return { 
        data: null, 
        error: { message: 'Cette commande ne peut plus être annulée' } 
      };
    }

    orders[orderIndex] = {
      ...order,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    };
    
    saveMockOrders(orders);
    return { data: orders[orderIndex], error: null };
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

    await logOrderEvent(orderId, 'cancelled', userId, userType, { reason });

    return { data, error: null };
  } catch (error) {
    console.error('Erreur cancelOrder:', error);
    return { data: null, error };
  }
}

/**
 * Logger un événement de commande
 */
async function logOrderEvent(orderId, eventType, actorId, actorType, metadata = {}) {
  if (useMockData) return; // Pas de logs en mode mocké

  try {
    await supabase.from('order_logs').insert({
      order_id: orderId,
      event_type: eventType,
      actor_id: actorId,
      actor_type: actorType,
      metadata,
    });
  } catch (error) {
    console.error('Erreur logOrderEvent:', error);
  }
}

/**
 * Souscrire aux mises à jour d'une commande en temps réel
 */
export function subscribeToOrder(orderId, callback) {
  if (useMockData) {
    // En mode mocké, simuler des mises à jour périodiques
    const interval = setInterval(() => {
      const orders = getMockOrders();
      const order = orders.find(o => o.id === orderId);
      if (order) {
        callback(order);
      }
    }, 5000);

    return () => clearInterval(interval);
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

export default {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  subscribeToOrder,
};
