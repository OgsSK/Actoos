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
  const [activeCompanyId, setActiveCompanyId] = useState(() => {
    return localStorage.getItem('actoosActiveCompanyId') || null;
  });

  // Persister l'ID actif dans localStorage
  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem('actoosActiveCompanyId', activeCompanyId);
    } else {
      localStorage.removeItem('actoosActiveCompanyId');
    }
  }, [activeCompanyId]);

  const buildBaseProfile = useCallback((authUser) => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email,
      role: authUser.user_metadata?.role || 'candidate',
      first_name: authUser.user_metadata?.first_name || '',
      last_name: authUser.user_metadata?.last_name || '',
      avatar_url: null,
      candidate_profile: null,
      subscription_plan: 'free',
      hasCompanies: false,
    };
  }, []);

  const enrichProfile = useCallback(async (authUser, currentProfile) => {
    if (!authUser) return currentProfile;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      const roleFromDb = userData?.role;

      if (roleFromDb && roleFromDb !== authUser.user_metadata?.role) {
        await supabase.auth.updateUser({ data: { role: roleFromDb } });
      }

      const { data: candidateData } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      let subscriptionPlan = 'free';
      const { data: companyData } = await supabase
        .from('companies')
        .select('subscription_plan')
        .eq('owner_id', authUser.id)
        .maybeSingle();
      if (companyData) subscriptionPlan = companyData.subscription_plan || 'free';

      // Vérifier si l'utilisateur possède ou est membre d'au moins une entreprise
      const { count: ownedCount } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', authUser.id);

      const { count: memberCount } = await supabase
        .from('company_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id);

      const hasCompanies = (ownedCount || 0) + (memberCount || 0) > 0;

      const merged = {
        ...currentProfile,
        ...(userData || {}),
        role: roleFromDb || currentProfile.role,
        candidate_profile: candidateData || null,
        subscription_plan: subscriptionPlan,
        hasCompanies,
      };
      return merged;
    } catch (err) {
      console.warn('Enrichissement profil échoué:', err);
      return currentProfile;
    }
  }, []);

  const handleSession = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    const baseProfile = buildBaseProfile(authUser);
    setUser(authUser);
    setProfile(baseProfile);   // ← profil de base disponible immédiatement
    setLoading(false);         // ← on libère l’affichage tout de suite
    // L’enrichissement se fait en arrière‑plan, sans bloquer la page
    const enriched = await enrichProfile(authUser, baseProfile);
    setProfile(enriched);
  }, [buildBaseProfile, enrichProfile]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (mounted) handleSession(session?.user ?? null);
      })
      .catch(() => { if (mounted) setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) handleSession(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signUp = async ({ email, password, role = 'candidate', firstName, lastName, language }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { 
        data: { 
          role, 
          first_name: firstName, 
          last_name: lastName,
          language            // ← ajouté
        } 
      },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id, email, role,
        first_name: firstName, last_name: lastName,
      });
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
    setActiveCompanyId(null);
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
    const { error } = await supabase.from('users').update(updates).eq('id', user.id);
    if (error) throw error;
    const enriched = await enrichProfile(user, profile);
    setProfile(enriched);
  };

  const refreshProfile = async () => {
    if (user) {
      await supabase.auth.refreshSession();
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (currentUser) {
        const baseProfile = buildBaseProfile(currentUser);
        const enriched = await enrichProfile(currentUser, baseProfile);
        setProfile(enriched);
        setUser(currentUser);
      }
    }
  };

  const value = {
    user, profile, loading, activeCompanyId, setActiveCompanyId,
    isCandidate: profile?.role === 'candidate' && !profile?.hasCompanies,
    isCompany: profile?.role === 'company' || profile?.hasCompanies,
    isAdmin: profile?.role === 'admin',
    signUp, signIn, signInWithGoogle, signOut,
    resetPassword, updatePassword,
    updateProfile, refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;