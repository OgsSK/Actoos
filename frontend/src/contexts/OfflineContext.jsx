import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import db from '../lib/offlineDb';
import { toast } from 'sonner';

const OfflineContext = createContext(null);

// Action types for offline queue
export const ACTION_TYPES = {
  START_INTERVENTION: 'start_intervention',
  COMPLETE_INTERVENTION: 'complete_intervention',
  UPDATE_NOTES: 'update_notes',
  UPDATE_CHECKLIST: 'update_checklist',
  CLAIM_INTERVENTION: 'claim_intervention',
  UPLOAD_PHOTO: 'upload_photo'
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const syncIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // Load pending actions from IndexedDB on mount
  useEffect(() => {
    loadPendingActions();
    loadDbStats();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Network status listeners
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[Offline] Network: Online');
      setIsOnline(true);
      
      // Auto-sync when coming back online
      await syncPendingActions();
      toast.success('Connexion rétablie - Synchronisation en cours...');
    };
    
    const handleOffline = () => {
      console.log('[Offline] Network: Offline');
      setIsOnline(false);
      toast.info('Mode hors ligne activé');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic sync when online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncing && pendingActions.length > 0) {
          syncPendingActions();
        }
      }, 30000); // Every 30 seconds
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, pendingActions.length, isSyncing]);

  // Load pending actions
  const loadPendingActions = async () => {
    try {
      const actions = await db.getPendingActions();
      if (isMountedRef.current) {
        setPendingActions(actions);
      }
    } catch (error) {
      console.error('[Offline] Failed to load pending actions:', error);
    }
  };

  // Load database stats
  const loadDbStats = async () => {
    try {
      const stats = await db.getStats();
      if (isMountedRef.current) {
        setDbStats(stats);
        if (stats?.lastInterventionsSync) {
          setLastSyncTime(stats.lastInterventionsSync);
        }
      }
    } catch (error) {
      console.error('[Offline] Failed to load DB stats:', error);
    }
  };

  // Add a pending action to the queue
  const addPendingAction = useCallback(async (type, data) => {
    const token = localStorage.getItem('token');
    
    const action = {
      type,
      data,
      token,
      timestamp: new Date().toISOString()
    };
    
    const id = await db.addPendingAction(action);
    
    if (id) {
      await loadPendingActions();
      
      // If online, try to sync immediately
      if (isOnline) {
        setTimeout(() => syncPendingActions(), 1000);
      }
      
      return id;
    }
    
    return null;
  }, [isOnline]);

  // Sync pending actions with server
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    const actions = await db.getPendingActions();
    if (actions.length === 0) return;
    
    setIsSyncing(true);
    console.log(`[Offline] Syncing ${actions.length} pending actions...`);
    
    const API_URL = process.env.REACT_APP_BACKEND_URL || '';
    let successCount = 0;
    let failCount = 0;
    
    for (const action of actions) {
      // Skip if too many retries
      if (action.retryCount >= 5) {
        console.log(`[Offline] Skipping action ${action.id} - too many retries`);
        continue;
      }
      
      try {
        const headers = {
          'Authorization': `Bearer ${action.token}`,
          'Content-Type': 'application/json'
        };
        
        let response;
        const { type, data } = action;
        
        switch (type) {
          case ACTION_TYPES.START_INTERVENTION:
            response = await fetch(`${API_URL}/api/interventions/${data.interventionId}/start`, {
              method: 'POST',
              headers
            });
            break;
            
          case ACTION_TYPES.COMPLETE_INTERVENTION:
            const completeParams = new URLSearchParams();
            if (data.notes) completeParams.append('notes_terrain', data.notes);
            
            response = await fetch(`${API_URL}/api/interventions/${data.interventionId}/complete?${completeParams}`, {
              method: 'POST',
              headers
            });
            break;
            
          case ACTION_TYPES.UPDATE_NOTES:
            response = await fetch(`${API_URL}/api/interventions/${data.interventionId}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ notes_terrain: data.notes })
            });
            break;
            
          case ACTION_TYPES.UPDATE_CHECKLIST:
            response = await fetch(`${API_URL}/api/interventions/${data.interventionId}/checklist`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(data.responses)
            });
            break;
            
          case ACTION_TYPES.CLAIM_INTERVENTION:
            response = await fetch(`${API_URL}/api/interventions/${data.interventionId}/claim`, {
              method: 'POST',
              headers
            });
            break;
            
          default:
            console.warn(`[Offline] Unknown action type: ${type}`);
            continue;
        }
        
        if (response && response.ok) {
          await db.markActionSynced(action.id);
          successCount++;
          console.log(`[Offline] Synced action ${action.id}: ${type}`);
          
          // Log successful sync event
          await db.logSyncEvent({
            type: 'sync',
            entityId: data.interventionId,
            action: type,
            result: 'success',
            details: `Action ${type} synchronisée`
          });
          
          // Update local cache with server response
          if (type.includes('intervention')) {
            const updatedIntervention = await response.json();
            
            // Check for LWW conflict (server version is newer)
            const localVersion = await db.getIntervention(data.interventionId);
            if (localVersion && localVersion._localModified && 
                new Date(updatedIntervention.updated_at) > new Date(localVersion._localModified)) {
              // Log LWW conflict resolution
              await db.logSyncEvent({
                type: 'conflict',
                entityId: data.interventionId,
                action: type,
                result: 'lww_resolved',
                conflictResolved: true,
                serverVersion: updatedIntervention.updated_at,
                localVersion: localVersion._localModified,
                details: 'Conflit résolu: version serveur plus récente appliquée (Last-Write-Wins)'
              });
            }
            
            await db.interventions.put(updatedIntervention);
          }
        } else {
          const errorText = response ? await response.text() : 'No response';
          console.error(`[Offline] Failed to sync action ${action.id}:`, errorText);
          await db.markActionFailed(action.id, errorText);
          
          // Log failed sync
          await db.logSyncEvent({
            type: 'sync',
            entityId: data.interventionId,
            action: type,
            result: 'error',
            details: `Échec: ${errorText.substring(0, 100)}`
          });
          
          failCount++;
        }
      } catch (error) {
        console.error(`[Offline] Error syncing action ${action.id}:`, error);
        await db.markActionFailed(action.id, error.message);
        
        // Log error
        await db.logSyncEvent({
          type: 'sync',
          entityId: data?.interventionId,
          action: type,
          result: 'error',
          details: `Erreur: ${error.message}`
        });
        
        failCount++;
      }
    }
    
    // Clean up synced actions
    await db.clearSyncedActions();
    await loadPendingActions();
    await loadDbStats();
    
    setIsSyncing(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} action(s) synchronisée(s)`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} action(s) en échec`);
    }
    
    console.log(`[Offline] Sync complete: ${successCount} success, ${failCount} failed`);
  }, [isOnline, isSyncing]);

  // Cache interventions for offline use
  const cacheInterventions = useCallback(async (interventions) => {
    const success = await db.cacheInterventions(interventions);
    if (success) {
      await loadDbStats();
    }
    return success;
  }, []);

  // Get cached interventions
  const getCachedInterventions = useCallback(async (filters = {}) => {
    return await db.getInterventions(filters);
  }, []);

  // Get a single cached intervention
  const getCachedIntervention = useCallback(async (id) => {
    return await db.getIntervention(id);
  }, []);

  // Update intervention locally (optimistic update)
  const updateInterventionLocally = useCallback(async (id, updates) => {
    return await db.updateInterventionLocally(id, updates);
  }, []);

  // Cache clients
  const cacheClients = useCallback(async (clients) => {
    const success = await db.cacheClients(clients);
    if (success) {
      await loadDbStats();
    }
    return success;
  }, []);

  // Get cached clients
  const getCachedClients = useCallback(async () => {
    return await db.getClients();
  }, []);

  // Cache categories
  const cacheCategories = useCallback(async (categories) => {
    return await db.cacheCategories(categories);
  }, []);

  // Get cached categories
  const getCachedCategories = useCallback(async () => {
    return await db.getCategories();
  }, []);

  // Add photo to upload queue
  const queuePhotoUpload = useCallback(async (interventionId, photoData) => {
    return await db.addPendingPhoto(interventionId, photoData);
  }, []);

  // Get pending photos for an intervention
  const getPendingPhotos = useCallback(async (interventionId) => {
    return await db.getPendingPhotos(interventionId);
  }, []);

  // Get sync history
  const getSyncHistory = useCallback(async (filters = {}) => {
    return await db.getSyncHistory(filters);
  }, []);

  // Get sync statistics
  const getSyncStats = useCallback(async () => {
    return await db.getSyncStats();
  }, []);

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    const success = await db.clearAllData();
    if (success) {
      setPendingActions([]);
      setDbStats(null);
      setLastSyncTime(null);
      toast.success('Données hors ligne effacées');
    }
    return success;
  }, []);

  const value = {
    // Status
    isOnline,
    isSyncing,
    lastSyncTime,
    dbStats,
    
    // Pending actions
    pendingActions,
    pendingCount: pendingActions.length,
    addPendingAction,
    syncPendingActions,
    
    // Interventions cache
    cacheInterventions,
    getCachedInterventions,
    getCachedIntervention,
    updateInterventionLocally,
    
    // Clients cache
    cacheClients,
    getCachedClients,
    
    // Categories cache
    cacheCategories,
    getCachedCategories,
    
    // Photos
    queuePhotoUpload,
    getPendingPhotos,
    
    // Sync history & stats
    getSyncHistory,
    getSyncStats,
    
    // Utilities
    clearOfflineData,
    refreshStats: loadDbStats
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
            console.log('New version available!');
            toast.info('Nouvelle version disponible - Rafraîchissez la page');
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

export default OfflineContext;
