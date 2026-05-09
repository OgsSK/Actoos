// Firebase Cloud Messaging Service Worker
// This file must be in the public folder

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaxTqYi944lkf00_XZEkX0tXOcMm_s208",
  authDomain: "actoos-one.firebaseapp.com",
  projectId: "actoos-one",
  storageBucket: "actoos-one.firebasestorage.app",
  messagingSenderId: "539602054798",
  appId: "1:539602054798:web:b81dc1315bfa15d11623df"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'ACTOOS';
  const notificationOptions = {
    body: payload.notification?.body || 'Vous avez une nouvelle notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.tag || 'actoos-notification',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Fermer' }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Default action: open the app
  let urlToOpen = '/';

  // Handle different notification types
  if (data?.type === 'order_update') {
    urlToOpen = `/orders/${data.orderId}`;
  } else if (data?.type === 'new_order') {
    urlToOpen = '/partner/orders';
  } else if (data?.type === 'delivery_assignment') {
    urlToOpen = '/driver/deliveries';
  } else if (data?.url) {
    urlToOpen = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push events directly (for custom handling)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');
  
  if (event.data) {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push data:', data);
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded');
