/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

/**
 * ACTOOS ONE - Firebase Messaging Service Worker
 * 
 * Ce fichier gère les notifications push en arrière-plan.
 * Il doit être placé dans le dossier public/.
 */

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuration Firebase - À REMPLACER avec vos propres clés
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Gérer les messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Message reçu en arrière-plan:', payload);

  const notificationTitle = payload.notification?.title || 'ACTOOS ONE';
  const notificationOptions = {
    body: payload.notification?.body || 'Nouvelle notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.orderId || 'actoos-notification',
    data: payload.data,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'Voir'
      },
      {
        action: 'dismiss',
        title: 'Fermer'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Ouvrir l'app sur la bonne page
  let url = '/';
  
  if (data?.orderId) {
    url = `/order/${data.orderId}`;
  } else if (data?.type === 'promo') {
    url = '/promos';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si l'app est déjà ouverte, focus dessus
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NOTIFICATION_CLICK', data });
            return;
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
