import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createAuthCore,
  buildBaseProfile,
  enrichProfile,
  isCandidate as checkIsCandidate,
  isCompany as checkIsCompany,
  isAdmin as checkIsAdmin,
} from '@actoos/auth-client';

// ✅ IMPORTANT : on importe le client Supabase UNIQUE depuis lib/supabase.js
// Cela garantit qu'il n'y ait qu'UNE SEULE instance dans toute l'app
import { supabase } from '../lib/supabase';

// ============ Configuration du client ============
// Le client est déjà créé dans lib/supabase.js. On l'enveloppe juste
// pour respecter l'API attendue par createAuthCore.
const client = { supabase };

// ============ Initialisation des fonctions d'auth ============
const authCore = createAuthCore(client);

// ============ Context ============
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState(() => {
    return localStorage.getItem('actoosActiveCompanyId') || null;
  });

  // ============ Persistance activeCompanyId ============
  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem('actoosActiveCompanyId', activeCompanyId);
    } else {
      localStorage.removeItem('actoosActiveCompanyId');
    }
  }, [activeCompanyId]);

  // ============ Gestion de la session ============
  const handleSession = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const baseProfile = buildBaseProfile(authUser);
    setUser(authUser);
    setProfile(baseProfile);
    setLoading(false);

    const enriched = await enrichProfile(client, authUser, baseProfile);
    setProfile(enriched);
  }, []);

  // ============ Écouter les changements d'auth ============
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (mounted) handleSession(session?.user ?? null);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) handleSession(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  // ============ Actions ============
  const signUp = async ({
    email,
    password,
    role = 'candidate',
    firstName,
    lastName,
    language,
  }) => {
    return await authCore.signUp({
      email,
      password,
      role,
      firstName,
      lastName,
      language,
    });
  };

  const signIn = async ({ email, password }) => {
    return await authCore.signIn({ email, password });
  };

  const signInWithGoogle = async () => {
    await authCore.signInWithGoogle();
  };

  const signOut = async () => {
    await authCore.signOut();
    setUser(null);
    setProfile(null);
    setActiveCompanyId(null);
  };

  const resetPassword = async (email) => {
    await authCore.resetPassword(email);
  };

  const updatePassword = async (newPassword) => {
    await authCore.updatePassword(newPassword);
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated');
    await authCore.updateProfile(user.id, updates);
    const enriched = await enrichProfile(client, user, profile);
    setProfile(enriched);
  };

  const refreshProfile = async () => {
    if (!user) return;

    await supabase.auth.refreshSession();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUser = session?.user;

    if (currentUser) {
      const baseProfile = buildBaseProfile(currentUser);
      const enriched = await enrichProfile(client, currentUser, baseProfile);
      setProfile(enriched);
      setUser(currentUser);
    }
  };

  // ============ API publique ============
  const value = {
    // État
    user,
    profile,
    loading,
    activeCompanyId,
    setActiveCompanyId,

    // Rôles (calculés par le package)
    isCandidate: checkIsCandidate(profile),
    isCompany: checkIsCompany(profile),
    isAdmin: checkIsAdmin(profile),

    // Actions
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;