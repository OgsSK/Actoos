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
            // Send geo data directly if available
            response = await fetch(`${API_URL}/api/interventions/${data.interventionId}/start`, {
              method: 'POST',
              headers,
              body: data.geo ? JSON.stringify(data.geo) : null
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
    
    // Also sync offline devis, clients, and interventions
    await syncOfflineData();
  }, [isOnline, isSyncing]);

  // Sync offline-created data (devis, clients, interventions)
  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      // Get pending offline items
      const [pendingDevis, pendingClients, pendingInterventions] = await Promise.all([
        db.getPendingOfflineDevis(),
        db.offlineClients.where('synced').equals(false).toArray(),
        db.offlineInterventions.where('synced').equals(false).toArray()
      ]);
      
      const totalPending = pendingDevis.length + pendingClients.length + pendingInterventions.length;
      if (totalPending === 0) return;
      
      console.log(`[Offline] Syncing ${totalPending} offline items...`);
      
      // Get API URL
      const apiUrl = process.env.REACT_APP_BACKEND_URL || '';
      
      // Prepare batch sync data
      const batchData = {
        clients: pendingClients.map(c => ({
          temp_id: c.tempId,
          nom: c.nom,
          email: c.email,
          telephone: c.telephone,
          adresse: c.adresse,
          ville: c.ville,
          code_postal: c.code_postal,
          created_at: c.created_at
        })),
        devis: await Promise.all(pendingDevis.map(async d => {
          const signature = await db.getSignature(d.tempId);
          return {
            temp_id: d.tempId,
            client_id: d.client_id,
            client_name: d.client_name,
            lignes: d.lignes,
            total_ht: d.total_ht,
            total_tva: d.total_tva,
            total_ttc: d.total_ttc,
            devise: d.devise,
            validite_jours: d.validite_jours,
            conditions: d.conditions,
            notes_internes: d.notes_internes,
            created_at: d.created_at,
            signature: signature ? {
              signature_data: signature.signature_data,
              signatory_name: signature.signatory_name,
              created_at: signature.created_at
            } : null
          };
        })),
        interventions: pendingInterventions.map(i => ({
          temp_id: i.tempId,
          client_id: i.client_id,
          titre: i.titre,
          description: i.description,
          date_prevue: i.date_prevue,
          duree_estimee: i.duree_estimee,
          adresse: i.adresse,
          ville: i.ville,
          code_postal: i.code_postal,
          priorite: i.priorite,
          categorie_id: i.categorie_id,
          created_at: i.created_at
        }))
      };
      
      // Send batch sync request
      const response = await fetch(`${apiUrl}/api/offline/sync/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(batchData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Mark items as synced based on response
        for (const clientResult of result.details.clients) {
          if (clientResult.status === 'synced' || clientResult.status === 'already_synced') {
            await db.markClientSynced(clientResult.temp_id, clientResult.client_id);
          }
        }
        
        for (const devisResult of result.details.devis) {
          if (devisResult.status === 'synced' || devisResult.status === 'already_synced') {
            await db.markDevisSynced(devisResult.temp_id, devisResult.devis_id, devisResult.numero);
          }
        }
        
        // Clean up synced offline data
        await db.clearSyncedOfflineData();
        
        const syncedCount = result.synced.clients + result.synced.devis + result.synced.interventions;
        if (syncedCount > 0) {
          toast.success(`${syncedCount} élément(s) hors ligne synchronisé(s)`);
        }
        
        console.log('[Offline] Offline data sync complete:', result);
      } else {
        const errorText = await response.text();
        console.error('[Offline] Failed to sync offline data:', errorText);
      }
    } catch (error) {
      console.error('[Offline] Error syncing offline data:', error);
    }
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

  // Sync interventions with LWW conflict resolution
  const syncInterventionsLWW = useCallback(async () => {
    if (!isOnline || isSyncing) return null;
    
    setIsSyncing(true);
    const API_URL = process.env.REACT_APP_BACKEND_URL || '';
    const token = localStorage.getItem('token');
    
    try {
      // Get locally modified interventions
      const allInterventions = await db.getInterventions({});
      const modifiedInterventions = allInterventions.filter(i => i._locallyModified);
      
      if (modifiedInterventions.length === 0) {
        console.log('[Offline] No local modifications to sync');
        setIsSyncing(false);
        return { synced: 0, conflicts: 0, errors: 0 };
      }
      
      // Prepare changes for sync
      const changes = modifiedInterventions.map(intervention => ({
        intervention_id: intervention.id,
        updates: {
          notes_terrain: intervention.notes_terrain,
          statut: intervention.statut,
          checklist_responses: intervention.checklist_responses
        },
        local_updated_at: intervention._modifiedAt || intervention._cachedAt
      }));
      
      // Get last sync time
      const lastSyncTime = await db.getLastSyncTime('interventions_last_sync');
      
      console.log(`[Offline] Syncing ${changes.length} modified interventions via LWW...`);
      
      const response = await fetch(`${API_URL}/api/interventions/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changes,
          last_sync: lastSyncTime
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update local cache with synced data
        for (const synced of result.synced) {
          await db.interventions.put({
            ...synced.data,
            _locallyModified: false,
            _cachedAt: new Date().toISOString()
          });
        }
        
        // Handle conflicts - server wins, update local
        for (const conflict of result.conflicts) {
          await db.interventions.put({
            ...conflict.server_data,
            _locallyModified: false,
            _cachedAt: new Date().toISOString()
          });
          
          // Log the conflict
          await db.logSyncEvent({
            type: 'conflict',
            entityId: conflict.intervention_id,
            action: 'sync_lww',
            result: 'lww_resolved',
            conflictResolved: true,
            serverVersion: conflict.server_updated_at,
            localVersion: conflict.local_updated_at,
            details: conflict.message
          });
          
          // Store conflict info for visual indicator
          const conflictInfo = {
            interventionId: conflict.intervention_id,
            resolvedAt: new Date().toISOString(),
            reason: 'server_wins',
            message: 'Vos modifications ont été écrasées par une version plus récente du serveur'
          };
          
          // Store in localStorage for persistent notification
          const recentConflicts = JSON.parse(localStorage.getItem('lww_conflicts') || '[]');
          recentConflicts.unshift(conflictInfo);
          // Keep only last 10 conflicts
          localStorage.setItem('lww_conflicts', JSON.stringify(recentConflicts.slice(0, 10)));
          
          toast.warning(
            <div className="space-y-1">
              <p className="font-medium">Conflit de synchronisation résolu</p>
              <p className="text-sm opacity-90">La version du serveur était plus récente et a été appliquée.</p>
              <p className="text-xs opacity-75">Vérifiez l'historique de sync pour plus de détails.</p>
            </div>,
            { duration: 6000 }
          );
        }
        
        // Apply server updates
        for (const serverUpdate of result.server_updates) {
          const existing = await db.getIntervention(serverUpdate.id);
          if (!existing || !existing._locallyModified) {
            await db.interventions.put({
              ...serverUpdate,
              _cachedAt: new Date().toISOString()
            });
          }
        }
        
        // Update last sync time
        await db.setLastSyncTime('interventions_last_sync', result.timestamp);
        
        console.log('[Offline] LWW Sync complete:', result.summary);
        
        if (result.summary.synced > 0) {
          toast.success(`${result.summary.synced} intervention(s) synchronisée(s)`);
        }
        if (result.summary.conflicts > 0) {
          toast.warning(`${result.summary.conflicts} conflit(s) résolu(s) (version serveur)`);
        }
        
        setIsSyncing(false);
        await loadDbStats();
        
        return result.summary;
      } else {
        console.error('[Offline] LWW Sync failed:', response.status);
        setIsSyncing(false);
        return null;
      }
    } catch (error) {
      console.error('[Offline] LWW Sync error:', error);
      setIsSyncing(false);
      return null;
    }
  }, [isOnline, isSyncing]);

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
    syncInterventionsLWW,
    
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
      
      // Check for updates immediately
      registration.update();
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] New version found, installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New SW installed, tell it to activate immediately
              console.log('[SW] New version installed, activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        });
      });
      
      // Listen for SW taking control and reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading page...');
        window.location.reload();
      });
      
      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SW_UPDATED') {
          console.log('[SW] Update complete, version:', event.data.version);
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

export default OfflineContext;
