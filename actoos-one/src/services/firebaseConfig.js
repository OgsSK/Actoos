/**
 * ACTOOS ONE - Firebase Configuration
 * 
 * Configuration Firebase pour Push Notifications.
 * Remplacez les valeurs par vos propres clés Firebase.
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Configuration Firebase - À REMPLACER avec vos propres clés
// Obtenez ces valeurs depuis: Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Vérifier si Firebase est configuré
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         firebaseConfig.projectId !== "your-project-id";
};

// Initialize Firebase
let app = null;
let messaging = null;

export const initializeFirebase = async () => {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase non configuré. Les notifications push seront désactivées.');
    return null;
  }

  try {
    // Vérifier si le navigateur supporte les notifications
    const supported = await isSupported();
    if (!supported) {
      console.warn('Ce navigateur ne supporte pas les notifications push.');
      return null;
    }

    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    
    console.log('Firebase initialisé avec succès');
    return messaging;
  } catch (error) {
    console.error('Erreur initialisation Firebase:', error);
    return null;
  }
};

/**
 * Demander la permission et obtenir le token FCM
 */
export const requestNotificationPermission = async () => {
  if (!messaging) {
    await initializeFirebase();
  }

  if (!messaging) {
    return { success: false, error: 'Firebase non disponible' };
  }

  try {
    // Demander la permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: 'Permission refusée',
        permission 
      };
    }

    // Obtenir le token FCM
    // Note: Vous devez avoir un fichier firebase-messaging-sw.js dans public/
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
    });

    if (token) {
      console.log('FCM Token obtenu:', token.substring(0, 20) + '...');
      return { success: true, token };
    } else {
      return { success: false, error: 'Impossible d\'obtenir le token' };
    }
  } catch (error) {
    console.error('Erreur permission notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Écouter les messages entrants (quand l'app est au premier plan)
 */
export const onMessageListener = () => {
  return new Promise((resolve, reject) => {
    if (!messaging) {
      reject(new Error('Firebase non initialisé'));
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('Message reçu:', payload);
      resolve(payload);
    });
  });
};

/**
 * Sauvegarder le token FCM dans Supabase
 */
export const saveFCMToken = async (supabase, userId, token) => {
  if (!userId || !token) return { success: false };

  try {
    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert({
        user_id: userId,
        fcm_token: token,
        device_type: getDeviceType(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,fcm_token'
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur sauvegarde FCM token:', error);
    return { success: false, error };
  }
};

/**
 * Supprimer le token FCM (lors de la déconnexion)
 */
export const removeFCMToken = async (supabase, userId, token) => {
  if (!userId || !token) return;

  try {
    await supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('fcm_token', token);
  } catch (error) {
    console.error('Erreur suppression FCM token:', error);
  }
};

/**
 * Détecter le type d'appareil
 */
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'web';
};

/**
 * Afficher une notification locale (pour les tests ou fallback)
 */
export const showLocalNotification = (title, body, options = {}) => {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: options.tag || 'actoos-notification',
      ...options
    });
  }
};

export { app, messaging };
