/**
 * ACTOOS ONE - Push Notification Service
 * 
 * Service pour gérer les notifications push (Firebase Cloud Messaging)
 */

import { 
  requestNotificationPermission, 
  onForegroundMessage, 
  isPushSupported,
  getNotificationPermission,
  getStoredFCMToken
} from './firebaseConfig';
import { supabase } from './supabaseClient';

// Storage keys
const STORAGE_KEYS = {
  FCM_TOKEN: 'actoos_fcm_token',
  PUSH_ENABLED: 'actoos_push_enabled',
  LAST_TOKEN_SYNC: 'actoos_last_token_sync',
};

/**
 * Notification types for ACTOOS
 */
export const NOTIFICATION_TYPES = {
  // Client notifications
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_PREPARING: 'order_preparing',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_NEARBY: 'driver_nearby',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  REFUND_PROCESSED: 'refund_processed',
  PROMO_OFFER: 'promo_offer',
  
  // Partner notifications
  NEW_ORDER: 'new_order',
  ORDER_URGENT: 'order_urgent',
  PAYMENT_RECEIVED: 'payment_received',
  REVIEW_RECEIVED: 'review_received',
  
  // Driver notifications
  NEW_DELIVERY: 'new_delivery',
  DELIVERY_CANCELLED: 'delivery_cancelled',
  ARRIVED_RESTAURANT: 'arrived_restaurant',
  PAYMENT_CREDITED: 'payment_credited',
};

/**
 * Register for push notifications
 * @param {string} userId - User ID to associate with the token
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function registerForPushNotifications(userId) {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    // Register service worker first
    await registerServiceWorker();
    
    // Request permission and get token
    const token = await requestNotificationPermission();
    
    if (!token) {
      return { success: false, error: 'Permission denied or token unavailable' };
    }

    // Save token to database
    if (userId) {
      await saveTokenToDatabase(userId, token);
    }

    localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'true');
    
    return { success: true, token };
  } catch (error) {
    console.error('Error registering for push:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Register Firebase service worker
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Firebase SW registered:', registration);
      return registration;
    } catch (error) {
      console.error('Firebase SW registration failed:', error);
      throw error;
    }
  }
}

/**
 * Save FCM token to Supabase
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
async function saveTokenToDatabase(userId, token) {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        fcm_token: token,
        platform: 'web',
        device_info: navigator.userAgent,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform'
      });

    if (error) {
      console.warn('Error saving FCM token:', error);
      // Table might not exist yet - that's OK
    }

    localStorage.setItem(STORAGE_KEYS.LAST_TOKEN_SYNC, Date.now().toString());
  } catch (error) {
    console.warn('Error saving token to database:', error);
  }
}

/**
 * Subscribe to foreground notifications
 * @param {Function} onNotification - Callback when notification received
 * @returns {Function} Unsubscribe function
 */
export function subscribeToNotifications(onNotification) {
  return onForegroundMessage((payload) => {
    console.log('Notification received:', payload);
    
    // Show in-app notification
    const notification = {
      id: Date.now().toString(),
      title: payload.notification?.title || 'ACTOOS',
      body: payload.notification?.body || '',
      type: payload.data?.type || 'general',
      data: payload.data,
      timestamp: new Date(),
      read: false,
    };

    onNotification(notification);

    // Also show browser notification if app is in foreground but user not focused
    if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
      showBrowserNotification(notification);
    }
  });
}

/**
 * Show a browser notification
 * @param {Object} notification - Notification data
 */
function showBrowserNotification(notification) {
  if (Notification.permission !== 'granted') return;

  const browserNotification = new Notification(notification.title, {
    body: notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: notification.type,
    data: notification.data,
  });

  browserNotification.onclick = () => {
    window.focus();
    browserNotification.close();
  };

  // Auto close after 5 seconds
  setTimeout(() => browserNotification.close(), 5000);
}

/**
 * Check if push notifications are enabled
 * @returns {boolean}
 */
export function isPushEnabled() {
  return localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true' 
    && getNotificationPermission() === 'granted';
}

/**
 * Disable push notifications
 * @param {string} userId - User ID
 */
export async function disablePushNotifications(userId) {
  localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, 'false');
  
  if (userId) {
    try {
      await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('platform', 'web');
    } catch (error) {
      console.warn('Error disabling push in database:', error);
    }
  }
}

/**
 * Get notification permission status
 */
export { getNotificationPermission, isPushSupported, getStoredFCMToken };

export default {
  registerForPushNotifications,
  subscribeToNotifications,
  isPushEnabled,
  disablePushNotifications,
  NOTIFICATION_TYPES,
};
