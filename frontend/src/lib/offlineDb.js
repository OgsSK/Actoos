/**
 * Actoos Offline Database using Dexie.js
 * Provides IndexedDB storage for offline-first functionality
 */
import Dexie from 'dexie';

// Database schema version
const DB_VERSION = 3;

class ActoosDatabase extends Dexie {
  constructor() {
    super('ActoosOfflineDB');
    
    this.version(DB_VERSION).stores({
      // Interventions cache with indexes
      interventions: 'id, technicien_id, client_id, statut, date_prevue, entreprise_id, *synced',
      
      // Clients cache
      clients: 'id, entreprise_id, nom',
      
      // Categories cache
      categories: 'id, code',
      
      // Pending actions queue (offline mutations)
      pendingActions: '++id, type, entityId, timestamp, synced',
      
      // Photos waiting to upload
      pendingPhotos: '++id, intervention_id, timestamp, synced',
      
      // Sync metadata
      syncMeta: 'key',
      
      // Sync history log for LWW transparency
      syncHistory: '++id, type, entityId, timestamp, result, conflictResolved'
    });
    
    // Define table types
    this.interventions = this.table('interventions');
    this.clients = this.table('clients');
    this.categories = this.table('categories');
    this.pendingActions = this.table('pendingActions');
    this.pendingPhotos = this.table('pendingPhotos');
    this.syncMeta = this.table('syncMeta');
    this.syncHistory = this.table('syncHistory');
  }
  
  // ==================== INTERVENTIONS ====================
  
  async cacheInterventions(interventions) {
    try {
      await this.transaction('rw', this.interventions, async () => {
        // Update or insert each intervention
        for (const intervention of interventions) {
          await this.interventions.put({
            ...intervention,
            _cachedAt: new Date().toISOString()
          });
        }
      });
      
      // Update sync timestamp
      await this.syncMeta.put({
        key: 'interventions_last_sync',
        value: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to cache interventions:', error);
      return false;
    }
  }
  
  async getInterventions(filters = {}) {
    try {
      let collection = this.interventions.toCollection();
      
      if (filters.technicien_id) {
        collection = this.interventions.where('technicien_id').equals(filters.technicien_id);
      }
      
      if (filters.statut) {
        const items = await collection.toArray();
        return items.filter(i => i.statut === filters.statut);
      }
      
      return await collection.toArray();
    } catch (error) {
      console.error('[OfflineDB] Failed to get interventions:', error);
      return [];
    }
  }
  
  async getIntervention(id) {
    try {
      return await this.interventions.get(id);
    } catch (error) {
      console.error('[OfflineDB] Failed to get intervention:', error);
      return null;
    }
  }
  
  async updateInterventionLocally(id, updates) {
    try {
      const existing = await this.interventions.get(id);
      if (existing) {
        await this.interventions.put({
          ...existing,
          ...updates,
          _locallyModified: true,
          _modifiedAt: new Date().toISOString()
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[OfflineDB] Failed to update intervention locally:', error);
      return false;
    }
  }
  
  // ==================== CLIENTS ====================
  
  async cacheClients(clients) {
    try {
      await this.transaction('rw', this.clients, async () => {
        for (const client of clients) {
          await this.clients.put({
            ...client,
            _cachedAt: new Date().toISOString()
          });
        }
      });
      
      await this.syncMeta.put({
        key: 'clients_last_sync',
        value: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to cache clients:', error);
      return false;
    }
  }
  
  async getClients() {
    try {
      return await this.clients.toArray();
    } catch (error) {
      console.error('[OfflineDB] Failed to get clients:', error);
      return [];
    }
  }
  
  async getClient(id) {
    try {
      return await this.clients.get(id);
    } catch (error) {
      console.error('[OfflineDB] Failed to get client:', error);
      return null;
    }
  }
  
  // ==================== CATEGORIES ====================
  
  async cacheCategories(categories) {
    try {
      await this.transaction('rw', this.categories, async () => {
        await this.categories.clear();
        for (const category of categories) {
          await this.categories.put(category);
        }
      });
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to cache categories:', error);
      return false;
    }
  }
  
  async getCategories() {
    try {
      return await this.categories.toArray();
    } catch (error) {
      console.error('[OfflineDB] Failed to get categories:', error);
      return [];
    }
  }
  
  // ==================== PENDING ACTIONS ====================
  
  async addPendingAction(action) {
    try {
      const id = await this.pendingActions.add({
        ...action,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0
      });
      console.log('[OfflineDB] Added pending action:', id, action.type);
      return id;
    } catch (error) {
      console.error('[OfflineDB] Failed to add pending action:', error);
      return null;
    }
  }
  
  async getPendingActions() {
    try {
      // Simple filter approach - more reliable than complex .where().or()
      const all = await this.pendingActions.toArray();
      return all.filter(a => !a.synced);
    } catch (error) {
      console.error('[OfflineDB] Failed to get pending actions:', error);
      return [];
    }
  }
  
  async markActionSynced(id) {
    try {
      await this.pendingActions.update(id, {
        synced: true,
        syncedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to mark action synced:', error);
      return false;
    }
  }
  
  async markActionFailed(id, error) {
    try {
      const action = await this.pendingActions.get(id);
      if (action) {
        await this.pendingActions.update(id, {
          retryCount: (action.retryCount || 0) + 1,
          lastError: error,
          lastRetryAt: new Date().toISOString()
        });
      }
      return true;
    } catch (err) {
      console.error('[OfflineDB] Failed to mark action failed:', err);
      return false;
    }
  }
  
  async removePendingAction(id) {
    try {
      await this.pendingActions.delete(id);
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to remove pending action:', error);
      return false;
    }
  }
  
  async clearSyncedActions() {
    try {
      await this.pendingActions
        .where('synced')
        .equals(true)
        .delete();
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to clear synced actions:', error);
      return false;
    }
  }
  
  // ==================== PENDING PHOTOS ====================
  
  async addPendingPhoto(interventionId, photoData) {
    try {
      const id = await this.pendingPhotos.add({
        intervention_id: interventionId,
        photoData, // base64 or blob
        timestamp: new Date().toISOString(),
        synced: false
      });
      console.log('[OfflineDB] Added pending photo:', id);
      return id;
    } catch (error) {
      console.error('[OfflineDB] Failed to add pending photo:', error);
      return null;
    }
  }
  
  async getPendingPhotos(interventionId = null) {
    try {
      let query = this.pendingPhotos.filter(p => !p.synced);
      if (interventionId) {
        query = query.and(p => p.intervention_id === interventionId);
      }
      return await query.toArray();
    } catch (error) {
      console.error('[OfflineDB] Failed to get pending photos:', error);
      return [];
    }
  }
  
  async markPhotoSynced(id, serverUrl) {
    try {
      await this.pendingPhotos.update(id, {
        synced: true,
        serverUrl,
        syncedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to mark photo synced:', error);
      return false;
    }
  }
  
  // ==================== SYNC METADATA ====================
  
  async getLastSyncTime(key) {
    try {
      const meta = await this.syncMeta.get(key);
      return meta?.value || null;
    } catch (error) {
      return null;
    }
  }
  
  async setLastSyncTime(key, time = new Date().toISOString()) {
    try {
      await this.syncMeta.put({ key, value: time });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // ==================== UTILITIES ====================
  
  async getStats() {
    try {
      const [
        interventionsCount,
        clientsCount,
        pendingActionsCount,
        pendingPhotosCount
      ] = await Promise.all([
        this.interventions.count(),
        this.clients.count(),
        this.pendingActions.filter(a => !a.synced).count(),
        this.pendingPhotos.filter(p => !p.synced).count()
      ]);
      
      return {
        interventions: interventionsCount,
        clients: clientsCount,
        pendingActions: pendingActionsCount,
        pendingPhotos: pendingPhotosCount,
        lastInterventionsSync: await this.getLastSyncTime('interventions_last_sync'),
        lastClientsSync: await this.getLastSyncTime('clients_last_sync')
      };
    } catch (error) {
      console.error('[OfflineDB] Failed to get stats:', error);
      return null;
    }
  }
  
  async clearAllData() {
    try {
      await this.transaction('rw', 
        this.interventions, 
        this.clients, 
        this.categories,
        this.pendingActions,
        this.pendingPhotos,
        this.syncMeta,
        async () => {
          await this.interventions.clear();
          await this.clients.clear();
          await this.categories.clear();
          await this.pendingActions.clear();
          await this.pendingPhotos.clear();
          await this.syncMeta.clear();
          await this.syncHistory.clear();
        }
      );
      console.log('[OfflineDB] All data cleared');
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to clear data:', error);
      return false;
    }
  }
  
  // ==================== SYNC HISTORY (LWW Transparency) ====================
  
  /**
   * Log a sync event for transparency
   * @param {Object} event - {type, entityId, action, result, serverVersion, localVersion, conflictResolved, details}
   */
  async logSyncEvent(event) {
    try {
      const logEntry = {
        ...event,
        timestamp: new Date().toISOString()
      };
      await this.syncHistory.add(logEntry);
      
      // Keep only last 200 entries
      const count = await this.syncHistory.count();
      if (count > 200) {
        const oldEntries = await this.syncHistory.orderBy('id').limit(count - 200).toArray();
        await this.syncHistory.bulkDelete(oldEntries.map(e => e.id));
      }
      
      return true;
    } catch (error) {
      console.error('[OfflineDB] Failed to log sync event:', error);
      return false;
    }
  }
  
  /**
   * Get sync history, optionally filtered
   * @param {Object} filters - {limit, entityId, type, onlyConflicts}
   */
  async getSyncHistory(filters = {}) {
    try {
      let collection = this.syncHistory.orderBy('timestamp').reverse();
      let results = await collection.toArray();
      
      if (filters.entityId) {
        results = results.filter(e => e.entityId === filters.entityId);
      }
      if (filters.type) {
        results = results.filter(e => e.type === filters.type);
      }
      if (filters.onlyConflicts) {
        results = results.filter(e => e.conflictResolved);
      }
      
      return results.slice(0, filters.limit || 50);
    } catch (error) {
      console.error('[OfflineDB] Failed to get sync history:', error);
      return [];
    }
  }
  
  /**
   * Get sync statistics
   */
  async getSyncStats() {
    try {
      const allHistory = await this.syncHistory.toArray();
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recent = allHistory.filter(e => e.timestamp > last24h);
      
      return {
        total: allHistory.length,
        last24h: recent.length,
        conflicts: allHistory.filter(e => e.conflictResolved).length,
        conflictsLast24h: recent.filter(e => e.conflictResolved).length,
        successful: allHistory.filter(e => e.result === 'success').length,
        failed: allHistory.filter(e => e.result === 'error').length
      };
    } catch (error) {
      console.error('[OfflineDB] Failed to get sync stats:', error);
      return { total: 0, last24h: 0, conflicts: 0, conflictsLast24h: 0, successful: 0, failed: 0 };
    }
  }
}

// Singleton instance
const db = new ActoosDatabase();

export default db;
export { ActoosDatabase };
