/**
 * ACTOOS ONE - Supabase Client
 * 
 * Client Supabase configuré pour l'application PWA.
 * Variables d'environnement requises:
 * - REACT_APP_SUPABASE_URL
 * - REACT_APP_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validation des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[ACTOOS] Variables Supabase manquantes. Mode mockédactivé.',
    '\nConfigurez REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY dans .env'
  );
}

// Options du client Supabase
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'actoos-auth-token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

// Créer le client (peut être null si les variables sont manquantes)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, options)
  : null;

// Helper pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!supabase;
};

// Helper pour obtenir l'utilisateur actuel
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper pour obtenir la session actuelle
export const getCurrentSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export default supabase;
