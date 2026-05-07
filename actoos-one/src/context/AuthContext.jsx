/**
 * ACTOOS ONE - Auth Context
 * 
 * Gestion de l'authentification utilisateur avec Supabase Auth.
 * Utilise Email/Password pour le MVP (sans Twilio SMS).
 * 
 * PRODUCTION MODE - Toutes les données sont réelles dans Supabase.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext(null);

// Statuts d'authentification
export const AUTH_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  AWAITING_SIGNUP: 'awaiting_signup', // Pour l'écran d'inscription
};

// Rôles utilisateur
export const USER_ROLES = {
  CLIENT: 'client',
  PARTNER: 'partner',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(AUTH_STATUS.LOADING);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Charger le profil utilisateur depuis la table users
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    try {
      // Chercher le profil existant par email ou ID
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erreur chargement profil:', fetchError);
        return null;
      }

      if (existingProfile) {
        setProfile(existingProfile);
        return existingProfile;
      }

      // Le profil devrait déjà exister après signUp, mais créer si besoin
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || null,
          phone: authUser.user_metadata?.phone || null,
          role: 'client',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erreur création profil:', insertError);
        return null;
      }

      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.error('Erreur loadProfile:', err);
      return null;
    }
  }, []);

  // Initialisation - vérifier la session Supabase existante
  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured()) {
        console.error('Supabase non configuré - vérifiez .env');
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
        return;
      }

      try {
        // Vérifier la session existante
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user);
          setStatus(AUTH_STATUS.AUTHENTICATED);
        } else {
          setStatus(AUTH_STATUS.UNAUTHENTICATED);
        }

        // Écouter les changements d'auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth event:', event);
            if (event === 'SIGNED_IN' && session?.user) {
              setUser(session.user);
              await loadProfile(session.user);
              setStatus(AUTH_STATUS.AUTHENTICATED);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setProfile(null);
              setStatus(AUTH_STATUS.UNAUTHENTICATED);
            }
          }
        );

        return () => subscription?.unsubscribe();
      } catch (err) {
        console.error('Erreur initAuth:', err);
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
      }
    };

    initAuth();
  }, [loadProfile]);

  /**
   * Inscription avec Email/Password
   * Crée un compte Supabase Auth + un profil dans la table users
   */
  const signUp = useCallback(async (email, password, userData = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Créer le compte dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name || null,
            phone: userData.phone || null,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 2. Créer le profil dans la table users
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          name: userData.name || null,
          phone: userData.phone || null,
          role: userData.role || 'client',
        })
        .select()
        .single();

      if (profileError) {
        console.error('Erreur création profil:', profileError);
        // Le compte auth existe, continuer quand même
      }

      setUser(authData.user);
      setProfile(userProfile || { id: authData.user.id, email, role: 'client' });
      setStatus(AUTH_STATUS.AUTHENTICATED);
      setIsLoading(false);

      return { success: true, user: authData.user, profile: userProfile };
    } catch (err) {
      console.error('Erreur signUp:', err);
      setError(err.message || 'Erreur lors de l\'inscription');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Connexion avec Email/Password
   */
  const signIn = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // Le profil sera chargé via onAuthStateChange
      setIsLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      console.error('Erreur signIn:', err);
      setError(err.message || 'Email ou mot de passe incorrect');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, []);

  // Mettre à jour le profil utilisateur
  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      return { success: false, error: 'Non connecté' };
    }

    setIsLoading(true);

    try {
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(data);
      setIsLoading(false);
      return { success: true, profile: data };
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, [user]);

  // Déconnexion
  const signOut = useCallback(async () => {
    setIsLoading(true);

    try {
      await supabase.auth.signOut();
      
      // Nettoyer aussi les anciennes données mockées si présentes
      localStorage.removeItem('actoos_mock_user');
      localStorage.removeItem('actoos_admin_session');

      setUser(null);
      setProfile(null);
      setStatus(AUTH_STATUS.UNAUTHENTICATED);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      setIsLoading(false);
    }
  }, []);

  // Effacer les erreurs
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // État
    user,
    profile,
    status,
    isAuthenticated: status === AUTH_STATUS.AUTHENTICATED,
    isLoading,
    error,
    
    // Actions
    signUp,
    signIn,
    signOut,
    updateProfile,
    clearError,
    
    // Helpers
    isClient: profile?.role === USER_ROLES.CLIENT || !profile?.role,
    isPartner: profile?.role === USER_ROLES.PARTNER,
    isDriver: profile?.role === USER_ROLES.DRIVER,
    isAdmin: profile?.role === USER_ROLES.ADMIN,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
