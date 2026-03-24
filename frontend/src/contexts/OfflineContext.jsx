import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OfflineContext = createContext(null);

// IndexedDB database name and version
const DB_NAME = 'FieldCommandOffline';
const DB_VERSION = 1;

// Open IndexedDB
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for pending actions
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
      }
      
      // Store for cached interventions
      if (!db.objectStoreNames.contains('cachedInterventions')) {
        db.createObjectStore('cachedInterventions', { keyPath: 'id' });
      }
      
      // Store for cached clients
      if (!db.objectStoreNames.contains('cachedClients')) {
        db.createObjectStore('cachedClients', { keyPath: 'id' });
      }
    };
  });
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [db, setDb] = useState(null);

  // Initialize IndexedDB
  useEffect(() => {
    openDatabase()
      .then(database => {
        setDb(database);
        loadPendingActions(database);
      })
      .catch(error => console.error('Failed to open IndexedDB:', error));
  }, []);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sync-pending-actions');
        });
      } else {
        // Fallback: manual sync
        syncPendingActions();
      }
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          loadPendingActions(db);
        }
      });
    }
  }, [db]);

  // Load pending actions from IndexedDB
  const loadPendingActions = async (database) => {
    if (!database) return;
    
    try {
      const transaction = database.transaction('pendingActions', 'readonly');
      const store = transaction.objectStore('pendingActions');
      const request = store.getAll();
      
      request.onsuccess = () => {
        setPendingActions(request.result || []);
      };
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  };

  // Add a pending action
  const addPendingAction = useCallback(async (action) => {
    if (!db) return;
    
    const token = localStorage.getItem('token');
    const actionWithToken = { ...action, token, timestamp: new Date().toISOString() };
    
    try {
      const transaction = db.transaction('pendingActions', 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      await new Promise((resolve, reject) => {
        const request = store.add(actionWithToken);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      loadPendingActions(db);
    } catch (error) {
      console.error('Failed to add pending action:', error);
    }
  }, [db]);

  // Remove a pending action
  const removePendingAction = useCallback(async (id) => {
    if (!db) return;
    
    try {
      const transaction = db.transaction('pendingActions', 'readwrite');
      const store = transaction.objectStore('pendingActions');
      store.delete(id);
      loadPendingActions(db);
    } catch (error) {
      console.error('Failed to remove pending action:', error);
    }
  }, [db]);

  // Sync pending actions manually
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    const API_URL = process.env.REACT_APP_BACKEND_URL || '';
    
    for (const action of pendingActions) {
      try {
        let response;
        
        if (action.type === 'start') {
          response = await fetch(`${API_URL}/api/interventions/${action.interventionId}/start`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${action.token}`,
              'Content-Type': 'application/json'
            }
          });
        } else if (action.type === 'complete') {
          const params = new URLSearchParams();
          if (action.notes) params.append('notes_terrain', action.notes);
          
          response = await fetch(`${API_URL}/api/interventions/${action.interventionId}/complete?${params}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${action.token}`,
              'Content-Type': 'application/json'
            }
          });
        } else if (action.type === 'update_notes') {
          response = await fetch(`${API_URL}/api/interventions/${action.interventionId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${action.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes_terrain: action.notes })
          });
        }
        
        if (response && response.ok) {
          await removePendingAction(action.id);
        }
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
      }
    }
    
    setIsSyncing(false);
    loadPendingActions(db);
  }, [isOnline, pendingActions, isSyncing, db, removePendingAction]);

  // Cache interventions for offline use
  const cacheInterventions = useCallback(async (interventions) => {
    if (!db) return;
    
    try {
      const transaction = db.transaction('cachedInterventions', 'readwrite');
      const store = transaction.objectStore('cachedInterventions');
      
      // Clear existing cache
      store.clear();
      
      // Add new interventions
      for (const intervention of interventions) {
        store.add(intervention);
      }
    } catch (error) {
      console.error('Failed to cache interventions:', error);
    }
  }, [db]);

  // Get cached interventions
  const getCachedInterventions = useCallback(async () => {
    if (!db) return [];
    
    try {
      const transaction = db.transaction('cachedInterventions', 'readonly');
      const store = transaction.objectStore('cachedInterventions');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get cached interventions:', error);
      return [];
    }
  }, [db]);

  // Cache clients for offline use
  const cacheClients = useCallback(async (clients) => {
    if (!db) return;
    
    try {
      const transaction = db.transaction('cachedClients', 'readwrite');
      const store = transaction.objectStore('cachedClients');
      
      store.clear();
      
      for (const client of clients) {
        store.add(client);
      }
    } catch (error) {
      console.error('Failed to cache clients:', error);
    }
  }, [db]);

  // Get cached clients
  const getCachedClients = useCallback(async () => {
    if (!db) return [];
    
    try {
      const transaction = db.transaction('cachedClients', 'readonly');
      const store = transaction.objectStore('cachedClients');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get cached clients:', error);
      return [];
    }
  }, [db]);

  const value = {
    isOnline,
    pendingActions,
    pendingCount: pendingActions.length,
    isSyncing,
    addPendingAction,
    removePendingAction,
    syncPendingActions,
    cacheInterventions,
    getCachedInterventions,
    cacheClients,
    getCachedClients
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

// Service Worker Registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', registration.scope);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New version available!');
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};
