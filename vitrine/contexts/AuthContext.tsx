'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabaseAuth } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message };
  };

  const signOut = async () => {
    await supabaseAuth.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://actoos.com/reset-password',
    });
    return { error: error?.message };
  };

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabaseAuth.auth.updateUser({ email: newEmail });
    return { error: error?.message };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabaseAuth.auth.updateUser({ password: newPassword });
    return { error: error?.message };
  };

  const deleteAccount = async () => {
    try {
      const { data: { session } } = await supabaseAuth.auth.getSession();
      if (!session) {
        return { error: "Aucune session active" };
      }

      const res = await fetch(
        "https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/delete-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        return { error: data.error || "Erreur lors de la suppression du compte" };
      }

      await supabaseAuth.auth.signOut();
      return {};
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateEmail,
        updatePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}