/**
 * ACTOOS ONE - Push Notification Service
 * 
 * Gestion complète des notifications push.
 */

import { 
  initializeFirebase, 
  requestNotificationPermission, 
  onMessageListener,
  saveFCMToken,
  showLocalNotification,
  isFirebaseConfigured
} from './firebaseConfig';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { createOrderNotification } from './notificationService';

let fcmToken = null;
let messageListenerActive = false;

/**
 * Initialiser les notifications push
 */
export async function initializePushNotifications(userId) {
  // Vérifier si les notifications sont supportées
  if (!('Notification' in window)) {
    console.warn('Notifications non supportées');
    return { success: false, reason: 'not_supported' };
  }

  // Vérifier si Firebase est configuré
  if (!isFirebaseConfigured()) {
    console.warn('Firebase non configuré - utilisation des notifications locales');
    return { success: false, reason: 'firebase_not_configured' };
  }

  try {
    // Initialiser Firebase
    await initializeFirebase();

    // Demander la permission et obtenir le token
    const result = await requestNotificationPermission();

    if (result.success && result.token) {
      fcmToken = result.token;

      // Sauvegarder le token dans Supabase
      if (userId && isSupabaseConfigured()) {
        await saveFCMToken(supabase, userId, fcmToken);
      }

      // Démarrer l'écoute des messages
      startMessageListener();

      return { success: true, token: fcmToken };
    }

    return result;
  } catch (error) {
    console.error('Erreur initialisation push:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Démarrer l'écoute des messages entrants
 */
function startMessageListener() {
  if (messageListenerActive) return;

  onMessageListener()
    .then((payload) => {
      handleIncomingNotification(payload);
      // Relancer l'écoute
      startMessageListener();
    })
    .catch((err) => {
      console.error('Erreur écoute message:', err);
    });

  messageListenerActive = true;
}

/**
 * Gérer une notification entrante
 */
function handleIncomingNotification(payload) {
  console.log('Notification reçue:', payload);

  const { notification, data } = payload;

  // Afficher la notification si l'app est au premier plan
  if (notification) {
    showLocalNotification(notification.title, notification.body, {
      tag: data?.orderId || 'actoos',
      data: data
    });
  }

  // Émettre un événement custom pour que l'app puisse réagir
  window.dispatchEvent(new CustomEvent('actoos-notification', {
    detail: payload
  }));
}

/**
 * Envoyer une notification à un utilisateur (via Supabase Edge Function ou API)
 * Note: Ceci nécessite une fonction serveur pour envoyer via FCM
 */
export async function sendPushNotification(userId, notification) {
  if (!isSupabaseConfigured()) {
    // Fallback: créer une notification en base
    return createOrderNotification(
      userId, 
      notification.data?.orderId, 
      notification.data?.status,
      notification.data
    );
  }

  try {
    // Appeler une Edge Function Supabase pour envoyer la notification
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        title: notification.title,
        body: notification.body,
        data: notification.data
      }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur envoi notification:', error);
    
    // Fallback: notification locale si l'utilisateur est le destinataire actuel
    showLocalNotification(notification.title, notification.body);
    
    return { success: false, error };
  }
}

/**
 * Demander la permission de notification (UI helper)
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    return { granted: false, reason: 'not_supported' };
  }

  if (Notification.permission === 'granted') {
    return { granted: true };
  }

  if (Notification.permission === 'denied') {
    return { granted: false, reason: 'denied' };
  }

  const permission = await Notification.requestPermission();
  return { 
    granted: permission === 'granted',
    permission 
  };
}

/**
 * Vérifier le statut des notifications
 */
export function getNotificationStatus() {
  if (!('Notification' in window)) {
    return { supported: false };
  }

  return {
    supported: true,
    permission: Notification.permission,
    fcmToken: fcmToken,
    firebaseConfigured: isFirebaseConfigured()
  };
}

/**
 * Notifications prédéfinies pour les statuts de commande
 */
export const ORDER_NOTIFICATIONS = {
  confirmed: {
    title: '✅ Commande confirmée !',
    body: (orderNumber, restaurantName) => 
      `${restaurantName} a confirmé votre commande #${orderNumber}`
  },
  preparing: {
    title: '👨‍🍳 En préparation',
    body: (orderNumber, restaurantName) => 
      `${restaurantName} prépare votre commande`
  },
  ready: {
    title: '📦 Commande prête !',
    body: (orderNumber) => 
      `Votre commande #${orderNumber} est prête, un livreur arrive`
  },
  picked_up: {
    title: '🏍️ Livreur en route !',
    body: (orderNumber, driverName) => 
      `${driverName || 'Votre livreur'} a récupéré votre commande`
  },
  arriving: {
    title: '📍 Arrivée imminente',
    body: (orderNumber) => 
      `Votre livreur arrive dans moins de 2 minutes`
  },
  delivered: {
    title: '🎉 Commande livrée !',
    body: (orderNumber) => 
      `Votre commande #${orderNumber} a été livrée. Bon appétit !`
  },
  cancelled: {
    title: '❌ Commande annulée',
    body: (orderNumber, reason) => 
      reason ? `Commande #${orderNumber} annulée: ${reason}` : `Commande #${orderNumber} annulée`
  }
};

/**
 * Envoyer une notification de statut de commande
 */
export function notifyOrderStatus(status, details = {}) {
  const template = ORDER_NOTIFICATIONS[status];
  if (!template) return;

  const { orderNumber = '0000', restaurantName = 'Restaurant', driverName, reason } = details;

  let body;
  switch (status) {
    case 'confirmed':
    case 'preparing':
      body = template.body(orderNumber, restaurantName);
      break;
    case 'picked_up':
      body = template.body(orderNumber, driverName);
      break;
    case 'cancelled':
      body = template.body(orderNumber, reason);
      break;
    default:
      body = template.body(orderNumber);
  }

  showLocalNotification(template.title, body, {
    tag: `order-${orderNumber}`,
    data: { status, orderNumber, ...details }
  });
}

export default {
  initializePushNotifications,
  sendPushNotification,
  requestPermission,
  getNotificationStatus,
  notifyOrderStatus,
  ORDER_NOTIFICATIONS
};
