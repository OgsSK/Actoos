// Service Worker for Actoos PWA
const CACHE_NAME = 'actoos-v2';
const API_CACHE_NAME = 'actoos-api-v2';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/tech',
  '/login',
  '/manifest.json',
  '/actoos-favicon.png'
];

// API routes to cache for offline use
const API_ROUTES_TO_CACHE = [
  '/api/interventions/today',
  '/api/clients',
  '/api/users'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(handleStaticRequest(request));
});

// Handle static requests - cache first, network fallback
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    throw error;
  }
}

// Handle API requests - network first, cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses for specific routes
    if (networkResponse.ok) {
      const shouldCache = API_ROUTES_TO_CACHE.some(route => 
        url.pathname.includes(route.replace('/api', ''))
      );
      
      if (shouldCache) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Returning cached response for:', request.url);
      return cachedResponse;
    }
    
    // Return empty response for API failures
    return new Response(JSON.stringify({ 
      error: 'offline', 
      message: 'Vous êtes hors ligne. Les données seront synchronisées à la reconnexion.' 
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Sync pending actions from IndexedDB
async function syncPendingActions() {
  console.log('[SW] Syncing pending actions...');
  
  // Get pending actions from IndexedDB
  const db = await openDatabase();
  const actions = await getAllPendingActions(db);
  
  for (const action of actions) {
    try {
      let response;
      
      if (action.type === 'start') {
        response = await fetch(`/api/interventions/${action.interventionId}/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${action.token}`,
            'Content-Type': 'application/json'
          }
        });
      } else if (action.type === 'complete') {
        const params = new URLSearchParams();
        if (action.notes) params.append('notes_terrain', action.notes);
        
        response = await fetch(`/api/interventions/${action.interventionId}/complete?${params}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${action.token}`,
            'Content-Type': 'application/json'
          }
        });
      } else if (action.type === 'update_notes') {
        response = await fetch(`/api/interventions/${action.interventionId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${action.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notes_terrain: action.notes })
        });
      }
      
      if (response && response.ok) {
        await deletePendingAction(db, action.id);
        console.log('[SW] Action synced successfully:', action.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync action:', action.id, error);
    }
  }
  
  // Notify clients that sync is complete
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

// IndexedDB helpers
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FieldCommandOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cachedInterventions')) {
        db.createObjectStore('cachedInterventions', { keyPath: 'id' });
      }
    };
  });
}

function getAllPendingActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingActions', 'readonly');
    const store = transaction.objectStore('pendingActions');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePendingAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingActions', 'readwrite');
    const store = transaction.objectStore('pendingActions');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==================== PUSH NOTIFICATIONS ====================
// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Actoos',
    body: 'Nouvelle notification',
    icon: '/actoos-favicon.png',
    badge: '/actoos-favicon.png'
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || {},
        tag: payload.tag,
        vibrate: payload.vibrate || [200, 100, 200],
        requireInteraction: payload.requireInteraction || false
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    data.body = event.data ? event.data.text() : data.body;
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: data.vibrate,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    data: data.data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/tech';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

console.log('[SW] Service worker loaded with push support');
