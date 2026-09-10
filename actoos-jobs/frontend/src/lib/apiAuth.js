// frontend/src/lib/apiAuth.js
import { supabase } from './supabase';

// ⚠️ MÊME base URL que lib/api.js (ton backend)
// En dev → localhost, en prod → Render
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8001' : 'https://actoos-jobs-api.onrender.com');

export const apiFetchAuth = async (path, options = {}) => {
  // 1. Récupérer la session (getSession rafraîchit auto si proche expiration)
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    session = refreshed.session;
  }

  // 2. Forcer un refresh si le token expire dans moins de 60s
  const expiresAt = (session.expires_at || 0) * 1000;
  if (Date.now() >= expiresAt - 60_000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    session = refreshed.session;
  }

  // 3. Headers
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    ...(options.headers || {}),
  };

  // 4. Appel
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // 5. Erreurs
  if (!res.ok) {
    let payload = {};
    try { payload = await res.json(); } catch { /* non-JSON */ }
    throw new Error(payload.message || payload.error || `Erreur ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
};