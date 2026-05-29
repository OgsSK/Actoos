import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

  // Profil de base depuis les métadonnées (toujours disponible, 0 délai)
  const buildBaseProfile = useCallback((authUser) => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email,
      role: authUser.user_metadata?.role || 'candidate',
      first_name: authUser.user_metadata?.first_name || '',
      last_name: authUser.user_metadata?.last_name || '',
      avatar_url: null,            // sera enrichi plus tard
      candidate_profile: null,
    };
  }, []);

  // Enrichit le profil avec les données de la base (appelé en arrière‑plan)
  const enrichProfile = useCallback(async (authUser) => {
    if (!authUser) return;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const { data: candidateData } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // Fusionner avec les métadonnées de base (les métadonnées priment pour les noms)
      const merged = {
        ...buildBaseProfile(authUser),
        ...(userData || {}),
        candidate_profile: candidateData || null,
      };
      setProfile(merged);
    } catch (err) {
      console.warn('Enrichissement profil échoué, on garde les métadonnées:', err);
    }
  }, [buildBaseProfile]);

  useEffect(() => {
    let mounted = true;

    // Initialisation rapide
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setProfile(buildBaseProfile(currentUser));
        setLoading(false);                     // ✅ fin du chargement immédiat
        if (currentUser) enrichProfile(currentUser);   // enrichissement silencieux
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setProfile(buildBaseProfile(currentUser));
        setLoading(false);
        if (currentUser) enrichProfile(currentUser);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [buildBaseProfile, enrichProfile]);

  const signUp = async ({ email, password, role = 'candidate', firstName, lastName }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, first_name: firstName, last_name: lastName },
    },
  });
  if (error) throw error;

  if (data.user) {
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: email,
        role: role,
        first_name: firstName,
        last_name: lastName,
      });
    if (insertError) {
      console.error('Erreur insertion users:', insertError);
    }
  }

  return data;
};
  const signIn = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const updateProfile = async (updates) => {
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);
  if (error) throw error;
  await enrichProfile(user);
};

  const value = {
    user, profile, loading,
    isCandidate: profile?.role === 'candidate',
    isCompany: profile?.role === 'company',
    isAdmin: profile?.role === 'admin',
    signUp, signIn, signInWithGoogle, signOut,
    resetPassword, updatePassword,
    updateProfile,
    refreshProfile: () => user && enrichProfile(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
