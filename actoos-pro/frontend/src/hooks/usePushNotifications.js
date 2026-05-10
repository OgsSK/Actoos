import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// VAPID public key from backend
const VAPID_PUBLIC_KEY = 'BDEosOMy7hCZHnWBDqZu4tXgkG20SA8TPnpRVFKa9mDCjUBJeoNM9BZHTAbQWHjCtlnOHnLOZba7KiaBDH913mk';

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check subscription status on mount
  useEffect(() => {
    if (!isSupported || !isAuthenticated) {
      setLoading(false);
      return;
    }

    checkSubscription();
  }, [isSupported, isAuthenticated]);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking push subscription:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user?.id) {
      setError('Push notifications not supported or user not logged in');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        setError('Permission de notification refusée');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Convert subscription to JSON
      const subscriptionJson = subscription.toJSON();

      // Save subscription to Supabase
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'endpoint'
        });

      if (dbError) {
        console.error('Error saving subscription:', dbError);
        // Try alternative: save in user metadata
        const { error: updateError } = await supabase
          .from('users')
          .update({
            push_subscription: subscriptionJson
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error('Failed to save subscription');
        }
      }

      setIsSubscribed(true);
      return true;

    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err.message || 'Erreur lors de l\'activation des notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Remove from Supabase
        if (user?.id) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);

          // Also clear from user metadata
          await supabase
            .from('users')
            .update({ push_subscription: null })
            .eq('id', user.id);
        }

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      return true;

    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendTestNotification = useCallback(async () => {
    if (!isSubscribed) {
      setError('Vous devez d\'abord activer les notifications');
      return false;
    }

    try {
      // Show a local notification for testing
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Test ACTOOS PRO', {
        body: 'Les notifications push fonctionnent correctement !',
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        data: { url: '/dashboard' }
      });

      return true;

    } catch (err) {
      console.error('Error sending test notification:', err);
      setError(err.message);
      return false;
    }
  }, [isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkSubscription
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default usePushNotifications;
