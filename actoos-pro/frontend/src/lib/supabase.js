/**
 * Supabase Client Configuration
 * Ultra-fast authentication and database access
 * With iOS PWA persistence fix using IndexedDB + localStorage hybrid
 */
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zmngftlkdimwvkxmduvr.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c';

// ============================================
// iOS PWA PERSISTENT STORAGE V2
// Synchronous-first approach with IndexedDB backup
// ============================================

const STORAGE_PREFIX = 'actoos-sb-';
const IDB_NAME = 'actoos-pwa-persist';
const IDB_STORE = 'session';
const IDB_VERSION = 2;

// Initialize memory cache from localStorage IMMEDIATELY (synchronous)
// This ensures Supabase has data on first load
const memoryCache = {};

// Pre-load from localStorage synchronously at module load
try {
  const keys = ['actoos-auth-token', 'actoos-auth-token-code-verifier'];
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      memoryCache[key] = value;
    }
  });
  console.log('[PWA Storage] Pre-loaded from localStorage:', Object.keys(memoryCache).length, 'items');
} catch (e) {
  console.warn('[PWA Storage] localStorage pre-load failed:', e);
}

// IndexedDB instance
let idbInstance = null;

// Initialize IndexedDB and sync to memory cache
const initIndexedDB = async () => {
  if (idbInstance) return idbInstance;
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      
      request.onerror = () => {
        console.warn('[PWA Storage] IndexedDB error');
        resolve(null);
      };
      
      request.onsuccess = async () => {
        idbInstance = request.result;
        console.log('[PWA Storage] IndexedDB opened');
        
        // Load all data from IndexedDB to memory cache
        try {
          const tx = idbInstance.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const getAllRequest = store.getAll();
          const getAllKeysRequest = store.getAllKeys();
          
          await new Promise((res) => {
            getAllRequest.onsuccess = () => {
              getAllKeysRequest.onsuccess = () => {
                const values = getAllRequest.result;
                const keys = getAllKeysRequest.result;
                keys.forEach((key, i) => {
                  if (values[i] && !memoryCache[key]) {
                    memoryCache[key] = values[i];
                    // Also restore to localStorage
                    try {
                      localStorage.setItem(key, values[i]);
                    } catch {}
                  }
                });
                console.log('[PWA Storage] Synced from IndexedDB:', keys.length, 'items');
                res();
              };
            };
          });
        } catch (e) {
          console.warn('[PWA Storage] IndexedDB sync error:', e);
        }
        
        resolve(idbInstance);
      };
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE);
        }
      };
    } catch (e) {
      console.warn('[PWA Storage] IndexedDB init error:', e);
      resolve(null);
    }
  });
};

// Start IndexedDB initialization immediately
initIndexedDB();

// Save to IndexedDB (async, fire-and-forget)
const saveToIDB = async (key, value) => {
  try {
    const database = idbInstance || await initIndexedDB();
    if (!database) return;
    
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(value, key);
  } catch (e) {
    console.warn('[PWA Storage] IDB write error:', e);
  }
};

// Remove from IndexedDB
const removeFromIDB = async (key) => {
  try {
    const database = idbInstance || await initIndexedDB();
    if (!database) return;
    
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(key);
  } catch (e) {
    console.warn('[PWA Storage] IDB delete error:', e);
  }
};

// Custom storage for Supabase
// Uses memory cache (pre-loaded from localStorage) + async IndexedDB backup
const persistentStorage = {
  getItem: (key) => {
    // 1. Check memory cache first (fastest, pre-populated from localStorage)
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }
    
    // 2. Try localStorage directly
    try {
      const value = localStorage.getItem(key);
      if (value) {
        memoryCache[key] = value;
        return value;
      }
    } catch {}
    
    return null;
  },
  
  setItem: (key, value) => {
    // Update memory cache
    memoryCache[key] = value;
    
    // Save to localStorage (sync)
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[PWA Storage] localStorage write failed:', e);
    }
    
    // Save to IndexedDB (async backup)
    saveToIDB(key, value);
  },
  
  removeItem: (key) => {
    // Remove from memory cache
    delete memoryCache[key];
    
    // Remove from localStorage
    try {
      localStorage.removeItem(key);
    } catch {}
    
    // Remove from IndexedDB
    removeFromIDB(key);
  },
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: persistentStorage,
    storageKey: 'actoos-auth-token',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'actoos-pro-pwa',
    },
  },
});

// Export function to manually restore session from IndexedDB
// Call this on app start before checking auth
export const restoreSessionFromIDB = async () => {
  try {
    const database = await initIndexedDB();
    if (!database) return false;
    
    const tx = database.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    
    return new Promise((resolve) => {
      const request = store.get('actoos-auth-token');
      request.onsuccess = () => {
        const value = request.result;
        if (value && !localStorage.getItem('actoos-auth-token')) {
          console.log('[PWA Storage] Restoring session from IndexedDB...');
          try {
            localStorage.setItem('actoos-auth-token', value);
            memoryCache['actoos-auth-token'] = value;
          } catch {}
          resolve(true);
        }
        resolve(false);
      };
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
};

// Helper functions for common operations
export const auth = supabase.auth;

// Sign in with email/password
export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Sign up with email/password
export const signUpWithEmail = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { data, error };
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Get current session
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Database helpers using PostgREST (ultra-fast)
export const db = {
  // Users
  users: {
    getById: async (id) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },
    getByEmail: async (email) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
  },
  
  // Entreprises
  entreprises: {
    getById: async (id) => {
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },
  },
  
  // Clients
  clients: {
    list: async (entrepriseId) => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .order('created_at', { ascending: false });
      return { data, error };
    },
    getById: async (id) => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },
    create: async (client) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      return { error };
    },
  },
  
  // Interventions
  interventions: {
    list: async (entrepriseId, filters = {}) => {
      let query = supabase
        .from('interventions')
        .select(`
          *,
          client:clients!interventions_client_id_fkey(id, nom, prenom, telephone, adresse, ville),
          technicien:users!interventions_technicien_id_fkey(id, nom, prenom, telephone)
        `)
        .eq('entreprise_id', entrepriseId);
      
      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }
      if (filters.technicien_id) {
        query = query.eq('technicien_id', filters.technicien_id);
      }
      
      const { data, error } = await query.order('date_prevue', { ascending: false });
      return { data, error };
    },
    getById: async (id) => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          client:clients!interventions_client_id_fkey(*),
          technicien:users!interventions_technicien_id_fkey(id, nom, prenom, telephone, email)
        `)
        .eq('id', id)
        .single();
      return { data, error };
    },
    create: async (intervention) => {
      const { data, error } = await supabase
        .from('interventions')
        .insert(intervention)
        .select()
        .single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('interventions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('interventions')
        .delete()
        .eq('id', id);
      return { error };
    },
  },
  
  // Techniciens
  techniciens: {
    list: async (entrepriseId) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .in('role', ['technicien'])
        .order('nom');
      return { data, error };
    },
  },
  
  // Categories
  categories: {
    list: async (entrepriseId) => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .order('nom');
      return { data, error };
    },
  },
  
  // Dashboard stats (single optimized query)
  dashboard: {
    getStats: async (entrepriseId) => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        ent_id: entrepriseId
      });
      return { data, error };
    },
  },
};

// Realtime subscriptions
export const realtime = {
  subscribeToInterventions: (entrepriseId, callback) => {
    return supabase
      .channel(`interventions:${entrepriseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions',
          filter: `entreprise_id=eq.${entrepriseId}`,
        },
        callback
      )
      .subscribe();
  },
  
  unsubscribe: (channel) => {
    supabase.removeChannel(channel);
  },
};

export default supabase;
