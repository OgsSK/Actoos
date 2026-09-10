// frontend/src/lib/apiAuth.js
import { supabase } from './supabase';

// ⚠️ MÊME base URL que lib/api.js (ton backend)
// En dev → localhost, en prod → Render
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8001' : 'https://actoos-jobs-api.onrender.com');

// ============================================================
// FETCH AVEC RETRY (résiste au cold start Render + réseau instable)
// ============================================================
const fetchWithRetry = async (url, opts, retries = 2, timeoutMs = 45000) => {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      console.warn(`[apiAuth] Tentative ${i + 1} échouée:`, e.message);
      if (i === retries) throw e;
      // Attendre 1.5s avant le prochain essai (laisse le temps à Render de se réveiller)
      await new Promise(r => setTimeout(r, 1500));
    }
  }
};

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

  // 4. Appel avec retry (résiste au cold start Render)
  const res = await fetchWithRetry(`${API_URL}${path}`, { ...options, headers });

  // 5. Erreurs
  if (!res.ok) {
    let payload = {};
    try { payload = await res.json(); } catch { /* non-JSON */ }
    throw new Error(payload.message || payload.error || `Erreur ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
};