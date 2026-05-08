import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Push notifications are disabled - Railway backend removed
// To enable, implement Edge Functions for push subscription management

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
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
    // Push notifications disabled - backend not available
    setError('Les notifications push ne sont pas encore disponibles');
    return false;
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
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
  }, []);

  const sendTestNotification = useCallback(async () => {
    // Test notifications disabled - backend not available
    setError('Fonctionnalité non disponible');
    return false;
  }, []);

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
