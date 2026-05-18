import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import db from '../lib/offlineDb';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { technicianApi, interventionsApi } from '../lib/supabaseApi';

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

  // Sync pending actions with server using Supabase directly
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    const actions = await db.getPendingActions();
    if (actions.length === 0) return;
    
    setIsSyncing(true);
    console.log(`[Offline] Syncing ${actions.length} pending actions via Supabase...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const action of actions) {
      // Skip if too many retries
      if (action.retryCount >= 5) {
        console.log(`[Offline] Skipping action ${action.id} - too many retries`);
        continue;
      }
      
      try {
        let result;
        const { type, data } = action;
        
        switch (type) {
          case ACTION_TYPES.START_INTERVENTION:
            result = await technicianApi.startIntervention(data.interventionId);
            break;
            
          case ACTION_TYPES.COMPLETE_INTERVENTION:
            result = await technicianApi.completeIntervention(data.interventionId, {
              notes_technicien: data.notes,
              rapport: data.notes
            });
            break;
            
          case ACTION_TYPES.UPDATE_NOTES:
            result = await technicianApi.updateNotes(data.interventionId, data.notes);
            break;
            
          case ACTION_TYPES.UPDATE_CHECKLIST:
            result = await interventionsApi.update(data.interventionId, {
              checklist_completed: data.responses
            });
            break;
            
          case ACTION_TYPES.CLAIM_INTERVENTION:
            result = await technicianApi.claimIntervention(data.interventionId, data.technicienId);
            break;
            
          default:
            console.warn(`[Offline] Unknown action type: ${type}`);
            continue;
        }
        
        if (result) {
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
            const updatedIntervention = result;
            
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
      
      console.log(`[Offline] Syncing ${totalPending} offline items via Supabase...`);
      
      let syncedClients = 0;
      let syncedDevis = 0;
      let syncedInterventions = 0;
      
      // Sync clients directly to Supabase
      for (const client of pendingClients) {
        try {
          const { data: newClient, error } = await supabase
            .from('clients')
            .insert({
              nom: client.nom,
              email: client.email,
              telephone: client.telephone,
              adresse: client.adresse,
              ville: client.ville,
              code_postal: client.code_postal,
              entreprise_id: client.entreprise_id,
              created_at: client.created_at || new Date().toISOString()
            })
            .select()
            .single();
          
          if (!error && newClient) {
            await db.markClientSynced(client.tempId, newClient.id);
            syncedClients++;
          }
        } catch (err) {
          console.error('[Offline] Error syncing client:', err);
        }
      }
      
      // Sync devis directly to Supabase
      for (const d of pendingDevis) {
        try {
          const signature = await db.getSignature(d.tempId);
          const { count } = await supabase
            .from('devis')
            .select('id', { count: 'exact', head: true })
            .eq('entreprise_id', d.entreprise_id);
          
          const numero_devis = `D-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
          
          const { data: newDevis, error } = await supabase
            .from('devis')
            .insert({
              client_id: d.client_id,
              entreprise_id: d.entreprise_id,
              numero_devis,
              total_ht: d.total_ht,
              total_tva: d.total_tva,
              total_ttc: d.total_ttc,
              conditions: d.conditions,
              statut: signature ? 'signe' : 'brouillon',
              signature_client: signature?.signature_data,
              nom_signataire: signature?.signatory_name,
              date_signature: signature ? new Date().toISOString() : null,
              token_client: crypto.randomUUID(),
              created_at: d.created_at || new Date().toISOString()
            })
            .select()
            .single();
          
          if (!error && newDevis) {
            // Create devis_lignes
            if (d.lignes?.length > 0) {
              await supabase.from('devis_lignes').insert(
                d.lignes.map(l => ({
                  devis_id: newDevis.id,
                  description: l.description,
                  quantite: l.quantite,
                  prix_unitaire: l.prix_unitaire,
                  tva: l.tva
                }))
              );
            }
            await db.markDevisSynced(d.tempId, newDevis.id, numero_devis);
            syncedDevis++;
          }
        } catch (err) {
          console.error('[Offline] Error syncing devis:', err);
        }
      }
      
      // Sync interventions directly to Supabase
      for (const i of pendingInterventions) {
        try {
          const { data: newIntervention, error } = await supabase
            .from('interventions')
            .insert({
              client_id: i.client_id,
              entreprise_id: i.entreprise_id,
              titre: i.titre,
              description: i.description,
              date_prevue: i.date_prevue,
              duree_estimee: i.duree_estimee,
              adresse: i.adresse,
              ville: i.ville,
              code_postal: i.code_postal,
              priorite: i.priorite,
              categorie_id: i.categorie_id,
              statut: 'planifie',
              created_at: i.created_at || new Date().toISOString()
            })
            .select()
            .single();
          
          if (!error && newIntervention) {
            await db.offlineInterventions.update(i.tempId, { synced: true, serverId: newIntervention.id });
            syncedInterventions++;
          }
        } catch (err) {
          console.error('[Offline] Error syncing intervention:', err);
        }
      }
      
      // Clean up synced offline data
      await db.clearSyncedOfflineData();
      
      const totalSynced = syncedClients + syncedDevis + syncedInterventions;
      if (totalSynced > 0) {
        toast.success(`${totalSynced} élément(s) hors ligne synchronisé(s)`);
      }
      
      console.log('[Offline] Offline data sync complete:', { syncedClients, syncedDevis, syncedInterventions });
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

  // Sync interventions with LWW conflict resolution using Supabase
  const syncInterventionsLWW = useCallback(async () => {
    if (!isOnline || isSyncing) return null;
    
    setIsSyncing(true);
    
    try {
      // Get locally modified interventions
      const allInterventions = await db.getInterventions({});
      const modifiedInterventions = allInterventions.filter(i => i._locallyModified);
      
      if (modifiedInterventions.length === 0) {
        console.log('[Offline] No local modifications to sync');
        setIsSyncing(false);
        return { synced: 0, conflicts: 0, errors: 0 };
      }
      
      console.log(`[Offline] Syncing ${modifiedInterventions.length} modified interventions via Supabase...`);
      
      let syncedCount = 0;
      let conflictCount = 0;
      let errorCount = 0;
      
      for (const intervention of modifiedInterventions) {
        try {
          // Get server version
          const { data: serverData, error: fetchError } = await supabase
            .from('interventions')
            .select('*')
            .eq('id', intervention.id)
            .single();
          
          if (fetchError) {
            errorCount++;
            continue;
          }
          
          // LWW: Compare timestamps
          const localTime = new Date(intervention._modifiedAt || intervention._cachedAt);
          const serverTime = new Date(serverData.updated_at);
          
          if (localTime > serverTime) {
            // Local wins - push changes
            const updates = {
              notes_technicien: intervention.notes_technicien,
              statut: intervention.statut,
              checklist_completed: intervention.checklist_responses
            };
            
            const { error: updateError } = await supabase
              .from('interventions')
              .update({ ...updates, updated_at: new Date().toISOString() })
              .eq('id', intervention.id);
            
            if (!updateError) {
              await db.interventions.put({
                ...intervention,
                _locallyModified: false,
                _cachedAt: new Date().toISOString()
              });
              syncedCount++;
            } else {
              errorCount++;
            }
          } else {
            // Server wins - update local
            await db.interventions.put({
              ...serverData,
              _locallyModified: false,
              _cachedAt: new Date().toISOString()
            });
            
            await db.logSyncEvent({
              type: 'conflict',
              entityId: intervention.id,
              action: 'sync_lww',
              result: 'lww_resolved',
              conflictResolved: true,
              serverVersion: serverData.updated_at,
              localVersion: intervention._modifiedAt,
              details: 'Conflit résolu: version serveur plus récente'
            });
            
            conflictCount++;
          }
        } catch (err) {
          console.error(`[Offline] Error syncing intervention ${intervention.id}:`, err);
          errorCount++;
        }
      }
      
      // Save sync time
      await db.setLastSyncTime('interventions_last_sync');
      setLastSyncTime(new Date());
      
      if (syncedCount > 0) {
        toast.success(`${syncedCount} intervention(s) synchronisée(s)`);
      }
      if (conflictCount > 0) {
        toast.info(`${conflictCount} conflit(s) résolu(s) (version serveur)`);
      }
      
      return { synced: syncedCount, conflicts: conflictCount, errors: errorCount };
    } catch (error) {
      console.error('[Offline] LWW sync error:', error);
      return { synced: 0, conflicts: 0, errors: 1 };
    } finally {
      setIsSyncing(false);
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
