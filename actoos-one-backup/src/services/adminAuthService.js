/**
 * ACTOOS ONE - Admin Auth Service
 * 
 * Authentification admin par email/mot de passe.
 * Séparé de l'auth client (téléphone + OTP).
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Admin credentials définis ici
const ADMIN_CREDENTIALS = {
  email: 'contact@actoos.com',
  password: 'Salifkane&&7',
  id: 'admin-actoos-001',
  name: 'Admin ACTOOS',
  role: 'admin',
};

/**
 * Connexion admin par email/mot de passe
 */
export async function adminLogin(email, password) {
  await new Promise(r => setTimeout(r, 800));
  
  // Vérifier les credentials admin locaux
  if (email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && 
      password === ADMIN_CREDENTIALS.password) {
    const adminUser = {
      id: ADMIN_CREDENTIALS.id,
      email: ADMIN_CREDENTIALS.email,
      name: ADMIN_CREDENTIALS.name,
      role: ADMIN_CREDENTIALS.role,
    };
    localStorage.setItem('actoos_admin_session', JSON.stringify(adminUser));
    return { data: { user: adminUser }, error: null };
  }

  // Si Supabase est configuré, essayer Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .eq('role', 'admin')
          .single();

        if (profile) {
          const adminUser = { 
            ...data.user, 
            name: profile.name,
            role: profile.role,
          };
          localStorage.setItem('actoos_admin_session', JSON.stringify(adminUser));
          return { data: { user: adminUser }, error: null };
        }
        
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Erreur Supabase adminLogin:', error);
    }
  }
  
  return { data: null, error: { message: 'Email ou mot de passe incorrect' } };
}

/**
 * Déconnexion admin
 */
export async function adminLogout() {
  localStorage.removeItem('actoos_admin_session');
  
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erreur adminLogout:', error);
    }
  }
  
  return { error: null };
}

/**
 * Vérifier la session admin
 */
export async function getAdminSession() {
  const stored = localStorage.getItem('actoos_admin_session');
  if (stored) {
    return { data: { user: JSON.parse(stored) }, error: null };
  }
  return { data: null, error: null };
}

const adminAuthService = {
  adminLogin,
  adminLogout,
  getAdminSession,
};

export default adminAuthService;
