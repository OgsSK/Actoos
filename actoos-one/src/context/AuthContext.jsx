/**
 * ACTOOS ONE - Auth Context
 * 
 * Gestion de l'authentification utilisateur avec support:
 * - Supabase Auth (production)
 * - Mode mocké (développement sans Supabase)
 * 
 * L'authentification se fait par numéro de téléphone + OTP.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext(null);

// Statuts d'authentification
export const AUTH_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  OTP_SENT: 'otp_sent',
};

// Rôles utilisateur
export const USER_ROLES = {
  CLIENT: 'client',
  PARTNER: 'partner',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

// Mock users pour développement
const MOCK_USERS = {
  '+22370123456': {
    id: 'user-mock-001',
    phone: '+22370123456',
    name: 'Client Test',
    role: USER_ROLES.CLIENT,
    created_at: new Date().toISOString(),
  },
  '+22370000001': {
    id: 'user-mock-partner',
    phone: '+22370000001',
    name: 'Partner Test',
    role: USER_ROLES.PARTNER,
    partner_id: 'rest-001',
    created_at: new Date().toISOString(),
  },
  '+22370000002': {
    id: 'user-mock-driver',
    phone: '+22370000002',
    name: 'Driver Test',
    role: USER_ROLES.DRIVER,
    driver_id: 'driver-001',
    created_at: new Date().toISOString(),
  },
  '+22370000003': {
    id: 'user-mock-admin',
    phone: '+22370000003',
    name: 'Admin Test',
    role: USER_ROLES.ADMIN,
    created_at: new Date().toISOString(),
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(AUTH_STATUS.LOADING);
  const [pendingPhone, setPendingPhone] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // TOUJOURS utiliser le mode mocké pour l'OTP client jusqu'à ce que Twilio soit configuré
  // Changer cette valeur à false quand Twilio est configuré dans Supabase
  const useMockAuth = true;

  // Charger le profil utilisateur depuis la DB
  const loadProfile = useCallback(async (userId, phone) => {
    if (useMockAuth) {
      // Mode mocké - simuler le profil
      const mockUser = Object.values(MOCK_USERS).find(u => u.id === userId) || {
        id: userId,
        phone: phone,
        name: null,
        role: USER_ROLES.CLIENT,
        created_at: new Date().toISOString(),
      };
      setProfile(mockUser);
      return mockUser;
    }

    try {
      // Chercher le profil existant
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erreur chargement profil:', fetchError);
        return null;
      }

      if (existingProfile) {
        setProfile(existingProfile);
        return existingProfile;
      }

      // Créer un nouveau profil si inexistant
      const countryCode = phone.substring(0, 4); // +223
      const phoneNumber = phone.substring(4);

      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          country_code: countryCode,
          phone: phoneNumber,
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
  }, [useMockAuth]);

  // Initialisation - vérifier la session existante
  useEffect(() => {
    const initAuth = async () => {
      if (useMockAuth) {
        // Mode mocké - vérifier localStorage
        const storedUser = localStorage.getItem('actoos_mock_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setProfile(userData);
          setStatus(AUTH_STATUS.AUTHENTICATED);
        } else {
          setStatus(AUTH_STATUS.UNAUTHENTICATED);
        }
        return;
      }

      // Mode Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id, session.user.phone);
        setStatus(AUTH_STATUS.AUTHENTICATED);
      } else {
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
      }

      // Écouter les changements d'auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            await loadProfile(session.user.id, session.user.phone);
            setStatus(AUTH_STATUS.AUTHENTICATED);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            setStatus(AUTH_STATUS.UNAUTHENTICATED);
          }
        }
      );

      return () => subscription?.unsubscribe();
    };

    initAuth();
  }, [useMockAuth, loadProfile]);

  // Envoyer OTP au numéro de téléphone
  const sendOTP = useCallback(async (phone) => {
    setIsLoading(true);
    setError(null);

    try {
      // Normaliser le numéro
      const normalizedPhone = phone.startsWith('+') ? phone : `+223${phone}`;

      if (useMockAuth) {
        // Mode mocké - simuler l'envoi
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPendingPhone(normalizedPhone);
        setStatus(AUTH_STATUS.OTP_SENT);
        setIsLoading(false);
        return { success: true, phone: normalizedPhone };
      }

      // Mode Supabase
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          channel: 'sms',
        },
      });

      if (otpError) {
        throw otpError;
      }

      setPendingPhone(normalizedPhone);
      setStatus(AUTH_STATUS.OTP_SENT);
      setIsLoading(false);
      return { success: true, phone: normalizedPhone };
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi du code');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, [useMockAuth]);

  // Vérifier le code OTP
  const verifyOTP = useCallback(async (code) => {
    if (!pendingPhone) {
      setError('Aucun numéro en attente de vérification');
      return { success: false, error: 'Aucun numéro en attente' };
    }

    setIsLoading(true);
    setError(null);

    try {
      if (useMockAuth) {
        // Mode mocké - accepter n'importe quel code de 4+ chiffres
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (code.length < 4) {
          throw new Error('Code invalide');
        }

        // Trouver ou créer l'utilisateur mocké
        const mockUser = MOCK_USERS[pendingPhone] || {
          id: `user-${Date.now()}`,
          phone: pendingPhone,
          name: null,
          role: USER_ROLES.CLIENT,
          created_at: new Date().toISOString(),
        };

        localStorage.setItem('actoos_mock_user', JSON.stringify(mockUser));
        setUser(mockUser);
        setProfile(mockUser);
        setStatus(AUTH_STATUS.AUTHENTICATED);
        setPendingPhone(null);
        setIsLoading(false);
        
        return { success: true, user: mockUser };
      }

      // Mode Supabase
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: code,
        type: 'sms',
      });

      if (verifyError) {
        throw verifyError;
      }

      // Le profil sera chargé via onAuthStateChange
      setPendingPhone(null);
      setIsLoading(false);
      
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message || 'Code invalide');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, [pendingPhone, useMockAuth]);

  // Mettre à jour le profil
  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      return { success: false, error: 'Non connecté' };
    }

    setIsLoading(true);

    try {
      if (useMockAuth) {
        // Mode mocké
        const updatedProfile = { ...profile, ...updates };
        localStorage.setItem('actoos_mock_user', JSON.stringify(updatedProfile));
        setProfile(updatedProfile);
        setIsLoading(false);
        return { success: true, profile: updatedProfile };
      }

      // Mode Supabase
      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
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
  }, [user, profile, useMockAuth]);

  // Déconnexion
  const signOut = useCallback(async () => {
    setIsLoading(true);

    try {
      if (useMockAuth) {
        localStorage.removeItem('actoos_mock_user');
      } else {
        await supabase.auth.signOut();
      }

      setUser(null);
      setProfile(null);
      setStatus(AUTH_STATUS.UNAUTHENTICATED);
      setPendingPhone(null);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      setIsLoading(false);
    }
  }, [useMockAuth]);

  // Annuler la vérification OTP en cours
  const cancelOTP = useCallback(() => {
    setPendingPhone(null);
    setStatus(AUTH_STATUS.UNAUTHENTICATED);
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
    pendingPhone,
    
    // Mode
    useMockAuth,
    
    // Actions
    sendOTP,
    verifyOTP,
    signOut,
    cancelOTP,
    updateProfile,
    
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
