'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  createAuthCore,
  buildBaseProfile,
  enrichProfile,
  isCandidate as checkIsCandidate,
  isCompany as checkIsCompany,
  isAdmin as checkIsAdmin,
} from '@actoos/auth-client';
import type { AuthUser, Profile } from '@actoos/auth-client';
import { authClient } from '@/lib/supabase';

// Client unique importé de lib/supabase.ts (appName: 'teach')
const client = authClient;
const authCore = createAuthCore(client);

// ⏱ Safety net : si getSession ne répond pas en 6s, on force loading=false
const AUTH_TIMEOUT_MS = 6000;

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isCandidate: boolean;
  isCompany: boolean;
  isAdmin: boolean;
  signUp: (params: {
    email: string;
    password: string;
    role?: 'candidate' | 'company' | 'admin';
    firstName: string;
    lastName: string;
    language?: string;
    extraMetadata?: Record<string, any>;
  }) => Promise<any>;
  signIn: (params: { email: string; password: string }) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updateProfile: (updates: Record<string, any>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

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
  updateEmail: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const loadingResolvedRef = useRef(false);

  const setLoadingOnce = useCallback((value: boolean) => {
    if (!mountedRef.current) return;
    if (!value) loadingResolvedRef.current = true;
    setLoading(value);
  }, []);

  const handleSession = useCallback(
    async (authUser: AuthUser | null) => {
      if (!mountedRef.current) return;

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setLoadingOnce(false);
        return;
      }

      const baseProfile = buildBaseProfile(authUser);
      setUser(authUser);
      setProfile(baseProfile);
      setLoadingOnce(false);

      try {
        const enriched = await enrichProfile(client, authUser, baseProfile);
        if (mountedRef.current) setProfile(enriched);
      } catch (err) {
        console.warn('[AuthContext] enrichProfile failed:', err);
      }
    },
    [setLoadingOnce]
  );

  useEffect(() => {
    mountedRef.current = true;
    let initialSessionResolved = false;

    const timeoutId = setTimeout(() => {
      if (!loadingResolvedRef.current && mountedRef.current) {
        console.warn(
          '[AuthContext] getSession timed out — forcing loading=false'
        );
        setLoadingOnce(false);
      }
    }, AUTH_TIMEOUT_MS);

    client.supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mountedRef.current) return;
        initialSessionResolved = true;
        const authUser = (session?.user as AuthUser | undefined) ?? null;
        console.log(
          '[AuthContext] getSession resolved:',
          authUser?.email ?? 'no user'
        );
        handleSession(authUser);
      })
      .catch((err) => {
        console.error('[AuthContext] getSession error:', err);
        if (mountedRef.current) {
          initialSessionResolved = true;
          setLoadingOnce(false);
        }
      });

    const {
      data: { subscription },
    } = client.supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      console.log(
        '[AuthContext] onAuthStateChange:',
        event,
        session?.user?.email ?? 'no user'
      );

      if (event === 'INITIAL_SESSION') {
        if (!initialSessionResolved && session?.user) {
          initialSessionResolved = true;
          handleSession(session.user as AuthUser);
        }
        return;
      }

      const authUser = (session?.user as AuthUser | undefined) ?? null;
      handleSession(authUser);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [handleSession, setLoadingOnce]);

  const signUp: AuthContextType['signUp'] = async (params) => {
    return await authCore.signUp({
      email: params.email,
      password: params.password,
      role: params.role || 'candidate',
      firstName: params.firstName,
      lastName: params.lastName,
      language: params.language,
      extraMetadata: params.extraMetadata,
    });
  };

  const signIn: AuthContextType['signIn'] = async (params) => {
    return await authCore.signIn(params);
  };

  const signInWithGoogle = async () => {
    await authCore.signInWithGoogle();
  };

  const signOut = async () => {
    try {
      await authCore.signOut();
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    await authCore.resetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    await authCore.updatePassword(newPassword);
  };

  const updateEmail = async (newEmail: string) => {
    await authCore.updateEmail(newEmail);
  };

  const updateProfile = async (updates: Record<string, any>) => {
    if (!user) throw new Error('Not authenticated');
    await authCore.updateProfile(user.id, updates);
    const enriched = await enrichProfile(client, user, profile);
    setProfile(enriched);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
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
    } catch (err) {
      console.error('[AuthContext] refreshProfile failed:', err);
    }
  };

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
    updateEmail,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}