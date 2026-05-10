/**
 * ACTOOS ONE - Notification Service
 * 
 * Gestion des notifications utilisateurs.
 * PRODUCTION MODE
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Récupérer les notifications d'un utilisateur
 */
export async function getUserNotifications(userId, options = {}) {
  if (!isSupabaseConfigured() || !userId) {
    return { data: [], error: null };
  }

  const { limit = 20, unreadOnly = false } = options;

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erreur getUserNotifications:', error);
    return { data: [], error };
  }
}

/**
 * Marquer une notification comme lue
 */
export async function markNotificationRead(notificationId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Configuration invalide' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur markNotificationRead:', error);
    return { success: false, error };
  }
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function markAllNotificationsRead(userId) {
  if (!isSupabaseConfigured() || !userId) {
    return { success: false, error: 'Configuration invalide' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur markAllNotificationsRead:', error);
    return { success: false, error };
  }
}

/**
 * Créer une notification
 */
export async function createNotification(notification) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Configuration invalide' };
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur createNotification:', error);
    return { data: null, error };
  }
}

/**
 * Programmer une notification pour plus tard
 */
export async function scheduleNotification(notification) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Configuration invalide' };
  }

  try {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        scheduled_for: notification.scheduledFor,
        is_sent: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur scheduleNotification:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer le nombre de notifications non lues
 */
export async function getUnreadCount(userId) {
  if (!isSupabaseConfigured() || !userId) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Erreur getUnreadCount:', error);
    return 0;
  }
}

/**
 * Supprimer une notification
 */
export async function deleteNotification(notificationId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Configuration invalide' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur deleteNotification:', error);
    return { success: false, error };
  }
}

/**
 * Types de notifications standard
 */
export const NOTIFICATION_TYPES = {
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_PREPARING: 'order_preparing',
  ORDER_READY: 'order_ready',
  ORDER_PICKED_UP: 'order_picked_up',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  PROMO_NEW: 'promo_new',
  WALLET_CREDIT: 'wallet_credit',
  WALLET_DEBIT: 'wallet_debit',
  REFERRAL_BONUS: 'referral_bonus',
  REVIEW_REQUEST: 'review_request',
  SYSTEM: 'system',
};

/**
 * Créer une notification de commande
 */
export async function createOrderNotification(userId, orderId, status, orderDetails = {}) {
  const notifications = {
    confirmed: {
      title: 'Commande confirmée',
      body: `Votre commande #${orderId?.slice(-4)} a été confirmée par ${orderDetails.restaurantName || 'le restaurant'}`,
    },
    preparing: {
      title: 'En préparation',
      body: `${orderDetails.restaurantName || 'Le restaurant'} prépare votre commande`,
    },
    ready: {
      title: 'Commande prête',
      body: 'Votre commande est prête et attend le livreur',
    },
    picked_up: {
      title: 'Livreur en route',
      body: `${orderDetails.driverName || 'Votre livreur'} est en route vers vous`,
    },
    delivered: {
      title: 'Commande livrée',
      body: 'Votre commande a été livrée. Bon appétit !',
    },
    cancelled: {
      title: 'Commande annulée',
      body: `Votre commande #${orderId?.slice(-4)} a été annulée`,
    },
  };

  const notif = notifications[status];
  if (!notif) return;

  return createNotification({
    userId,
    type: `order_${status}`,
    title: notif.title,
    body: notif.body,
    data: { orderId, status, ...orderDetails }
  });
}

export default {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  scheduleNotification,
  getUnreadCount,
  deleteNotification,
  createOrderNotification,
  NOTIFICATION_TYPES
};
