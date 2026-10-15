'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  preferred_currency: string;
  preferred_language: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) { setProfile(null); return; }
    try {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle();
      setProfile(data as Profile);
    } catch (err) {
      console.warn('[Auth] loadProfile error:', err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u).finally(() => mountedRef.current && setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (params: { email: string; password: string; firstName: string; lastName: string }) => {
    const { error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: { first_name: params.firstName, last_name: params.lastName },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);