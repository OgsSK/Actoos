// frontend/src/lib/supabase.js
// ⚠️ Ce fichier réexporte le client Supabase du package @actoos/auth-client
// pour garantir qu'il n'y ait qu'UNE SEULE instance dans toute l'app.

import { createAuthClient } from '@actoos/auth-client';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
}

// Créer le client via le package partagé
const client = createAuthClient({
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  appName: 'jobs',
});

// Exporter l'instance supabase (compatible avec l'ancienne API)
export const supabase = client.supabase;
export default client.supabase;