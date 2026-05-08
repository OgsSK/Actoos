/**
 * ACTOOS ONE - Firebase Configuration
 * 
 * Configuration pour Firebase Cloud Messaging (Push Notifications)
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAaxTqYi944lkf00_XZEkX0tXOcMm_s208",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "actoos-one.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "actoos-one",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "actoos-one.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "539602054798",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:539602054798:web:b81dc1315bfa15d11623df"
};

// VAPID Key for Web Push
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || "BIsaWSER5PoWYo2OERM4qWpTiei9-nMDT1UfGebzuZZAkD1MWq_6aPr4G8cntk5c2RgEYpaFX5btAB7cQChu7eY";

// Initialize Firebase
let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  
  // Only initialize messaging in browser environment with service worker support
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn('Firebase initialization error:', error);
}

/**
 * Request permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null if permission denied
 */
export async function requestNotificationPermission() {
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return null;
  }

  try {
    // Check if permission already granted
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (token) {
      console.log('FCM Token:', token);
      // Save token to localStorage for later use
      localStorage.setItem('actoos_fcm_token', token);
      return token;
    } else {
      console.log('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 * @param {Function} callback - Function to call when message received
 * @returns {Function} Unsubscribe function
 */
export function onForegroundMessage(callback) {
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}

/**
 * Get stored FCM token
 * @returns {string|null} Stored FCM token
 */
export function getStoredFCMToken() {
  return localStorage.getItem('actoos_fcm_token');
}

/**
 * Check if push notifications are supported
 * @returns {boolean}
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check current notification permission status
 * @returns {string} 'granted', 'denied', or 'default'
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export { app, messaging, VAPID_KEY };
export default { requestNotificationPermission, onForegroundMessage, isPushSupported };
