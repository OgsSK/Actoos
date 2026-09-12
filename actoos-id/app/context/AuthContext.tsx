'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  createAuthClientSSR,
  createAuthCore,
  buildBaseProfile,
  enrichProfile,
  isCandidate as checkIsCandidate,
  isCompany as checkIsCompany,
  isAdmin as checkIsAdmin,
} from '@actoos/auth-client';
import type { AuthUser, Profile } from '@actoos/auth-client';

// ============ Configuration ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:8001'
    : 'https://actoos-jobs-api.onrender.com');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[AuthContext] Missing NEXT_PUBLIC_SUPABASE_* environment variables');
}

// ============ Client unique (créé une seule fois) ============
const client = createAuthClientSSR({
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  appName: 'actoos-id',
  apiUrl: API_URL,
  cookieDomain: process.env.NODE_ENV === 'production' ? '.actoos.com' : undefined,
});

const authCore = createAuthCore(client);

// ============ Types ============
interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;

  // Rôles
  isCandidate: boolean;
  isCompany: boolean;
  isAdmin: boolean;

  // Actions
  signUp: (params: {
    email: string;
    password: string;
    role?: 'candidate' | 'company' | 'admin';
    firstName: string;
    lastName: string;
    language?: string;
  }) => Promise<any>;
  signIn: (params: { email: string; password: string }) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: Record<string, any>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ============ Context ============
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isCandidate: false,
  isCompany: false,
  isAdmin: false,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

// ============ Provider ============
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Gestion de la session
  const handleSession = useCallback(async (authUser: AuthUser | null) => {
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

    try {
      const enriched = await enrichProfile(client, authUser, baseProfile);
      setProfile(enriched);
    } catch (err) {
      console.warn('[AuthContext] enrichProfile failed:', err);
    }
  }, []);

  // Écouter les changements d'auth
  useEffect(() => {
    let mounted = true;

    // 1. Session initiale
    client.supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          const authUser = (session?.user as AuthUser | undefined) ?? null;
          handleSession(authUser);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // 2. Écouter les events
    const {
      data: { subscription },
    } = client.supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        const authUser = (session?.user as AuthUser | undefined) ?? null;
        handleSession(authUser);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  // ============ Actions ============
  const signUp: AuthContextType['signUp'] = async (params) => {
    return await authCore.signUp({
      email: params.email,
      password: params.password,
      role: params.role || 'candidate',
      firstName: params.firstName,
      lastName: params.lastName,
      language: params.language,
    });
  };

  const signIn: AuthContextType['signIn'] = async (params) => {
    return await authCore.signIn(params);
  };

  const signInWithGoogle = async () => {
    await authCore.signInWithGoogle();
  };

  const signOut = async () => {
    await authCore.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await authCore.resetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    await authCore.updatePassword(newPassword);
  };

  const updateProfile = async (updates: Record<string, any>) => {
    if (!user) throw new Error('Not authenticated');
    await authCore.updateProfile(user.id, updates);
    const enriched = await enrichProfile(client, user, profile);
    setProfile(enriched);
  };

  const refreshProfile = async () => {
    if (!user) return;

    await client.supabase.auth.refreshSession();
    const {
      data: { session },
    } = await client.supabase.auth.getSession();
    const currentUser = (session?.user as AuthUser | undefined) ?? null;

    if (currentUser) {
      const baseProfile = buildBaseProfile(currentUser);
      const enriched = await enrichProfile(client, currentUser, baseProfile);
      setProfile(enriched);
      setUser(currentUser);
    }
  };

  // ============ API publique ============
  const value: AuthContextType = {
    user,
    profile,
    loading,
    isCandidate: checkIsCandidate(profile),
    isCompany: checkIsCompany(profile),
    isAdmin: checkIsAdmin(profile),
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
}

// ============ Hook ============
export function useAuth() {
  return useContext(AuthContext);
}