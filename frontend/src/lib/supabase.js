/**
 * Supabase Client Configuration
 * Ultra-fast authentication and database access
 * With iOS PWA persistence fix using IndexedDB
 */
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zmngftlkdimwvkxmduvr.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c';

// ============================================
// iOS PWA PERSISTENT STORAGE FOR SUPABASE
// IndexedDB-based storage that survives app termination
// ============================================
const IDB_NAME = 'actoos-supabase-storage';
const IDB_STORE = 'auth';
const IDB_VERSION = 1;

// In-memory cache for sync operations
let memoryCache = {};
let dbInstance = null;
let dbInitPromise = null;

// Initialize IndexedDB
const initDB = () => {
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      
      request.onerror = () => {
        console.warn('[Supabase Storage] IndexedDB open error');
        resolve(null);
      };
      
      request.onsuccess = () => {
        dbInstance = request.result;
        // Load all data into memory cache on init
        loadAllToCache().then(() => resolve(dbInstance));
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
    } catch (e) {
      console.warn('[Supabase Storage] IndexedDB init error:', e);
      resolve(null);
    }
  });
  
  return dbInitPromise;
};

// Load all IndexedDB data to memory cache
const loadAllToCache = async () => {
  if (!dbInstance) return;
  
  return new Promise((resolve) => {
    try {
      const tx = dbInstance.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          memoryCache[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
};

// Save to IndexedDB (async, fire-and-forget)
const saveToIDB = (key, value) => {
  if (!dbInstance) return;
  
  try {
    const tx = dbInstance.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(value, key);
  } catch (e) {
    console.warn('[Supabase Storage] IDB write error:', e);
  }
};

// Remove from IndexedDB
const removeFromIDB = (key) => {
  if (!dbInstance) return;
  
  try {
    const tx = dbInstance.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(key);
  } catch (e) {
    console.warn('[Supabase Storage] IDB delete error:', e);
  }
};

// Custom storage adapter for Supabase that uses IndexedDB + memory cache
// This survives iOS PWA app termination
const createPersistentStorage = () => {
  // Initialize DB immediately
  initDB();
  
  return {
    getItem: (key) => {
      // Return from memory cache (sync operation)
      // Memory cache is populated from IndexedDB on init
      const value = memoryCache[key];
      if (value !== undefined) {
        return value;
      }
      // Fallback to localStorage
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    
    setItem: (key, value) => {
      // Save to memory cache
      memoryCache[key] = value;
      
      // Save to IndexedDB (async)
      saveToIDB(key, value);
      
      // Also save to localStorage as backup
      try {
        localStorage.setItem(key, value);
      } catch {
        // Ignore localStorage errors (quota, etc.)
      }
    },
    
    removeItem: (key) => {
      // Remove from memory cache
      delete memoryCache[key];
      
      // Remove from IndexedDB
      removeFromIDB(key);
      
      // Remove from localStorage
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    },
  };
};

// Create the persistent storage
const persistentStorage = createPersistentStorage();

// Create Supabase client with iOS-persistent storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: persistentStorage,
    storageKey: 'actoos-auth-token',
    flowType: 'pkce',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'actoos-pro-web',
    },
  },
});

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
