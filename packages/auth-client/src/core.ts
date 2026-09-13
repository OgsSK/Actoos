import type { AuthClient } from './client.js';
import type { SignUpParams, SignInParams } from './types.js';

export function createAuthCore(client: AuthClient) {
  const { supabase } = client;

  const signUp = async ({
  email,
  password,
  role,
  firstName,
  lastName,
  language,
  extraMetadata,
}: SignUpParams) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        first_name: firstName,
        last_name: lastName,
        language,
        ...(extraMetadata || {}),
      },
    },
  });
  if (error) throw error;
  return data;
};
  const signIn = async ({ email, password }: SignInParams) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const redirect =
      redirectTo ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : '');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string, redirectTo?: string) => {
    const redirect =
      redirectTo ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : '');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirect,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const updateEmail = async (newEmail: string) => {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    return data;
  };

  const updateProfile = async (userId: string, updates: Record<string, any>) => {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
  };

  const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  };

    return {
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateEmail,
    updateProfile,
    getSession,
    refreshSession,
  };
}

export type AuthCore = ReturnType<typeof createAuthCore>;