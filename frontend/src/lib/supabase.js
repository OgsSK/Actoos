/**
 * Supabase Client Configuration
 * Ultra-fast authentication and database access
 */
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zmngftlkdimwvkxmduvr.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c';

// Create Supabase client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'actoos-auth',
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
