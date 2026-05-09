import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../lib/currency';
import { supabase } from '../lib/supabase';
import supabaseApi from '../lib/supabaseApi';

// Legacy API for endpoints not yet migrated (will be removed)
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Supabase Edge Function URL for ultra-fast login
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://zmngftlkdimwvkxmduvr.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c';

const AuthContext = createContext(null);

// Helper: Check if JWT token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return false; // No expiration = valid
    return Date.now() >= exp * 1000;
  } catch {
    return true; // Invalid token format
  }
};

// Helper: Get time until token expires (in milliseconds)
const getTokenExpiryTime = (token) => {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return Infinity; // No expiration
    return (exp * 1000) - Date.now();
  } catch {
    return 0;
  }
};

// Constants for token refresh
const TOKEN_REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // Refresh 7 days before expiry
const TOKEN_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

// SIMPLIFIED: No more dual sessions. One session at a time.
// Helper: Safe localStorage operations
const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      console.warn('localStorage unavailable, session will not persist');
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }
};

// Function to update PWA theme based on user role (simplified - single icon)
const updatePWAForRole = (role) => {
  const isTech = role === 'technicien' || role === 'tech';
  
  // Get DOM elements
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  
  if (isTech) {
    // Technician
    if (themeColor) themeColor.content = '#10B981'; // Emerald
    if (appleTitle) appleTitle.content = 'ACTOOS PRO';
    document.title = 'ACTOOS PRO - Technicien';
  } else {
    // Admin  
    if (themeColor) themeColor.content = '#10B981'; // Emerald
    if (appleTitle) appleTitle.content = 'ACTOOS PRO';
    document.title = 'ACTOOS PRO - Admin';
  }
};

// SIMPLIFIED: No migration needed - single session system
// Clear old prefixed keys ONCE to migrate to simple system
const cleanupOldSystem = () => {
  try {
    // Check if cleanup was already done
    const cleanupDone = localStorage.getItem('cleanup_v3_done');
    if (cleanupDone) return;
    
    // Remove all old prefixed keys (but NOT the current session keys!)
    const keysToRemove = [
      'storage_migration_v2', 'app_variant', 'pwa_role',
      'admin_token', 'admin_user', 'admin_entreprise',
      'tech_token', 'tech_user', 'tech_entreprise'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Mark cleanup as done
    localStorage.setItem('cleanup_v3_done', 'true');
  } catch (e) {
    console.warn('[Auth] Cleanup failed:', e);
  }
};

// Run cleanup once
cleanupOldSystem();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage with safe fallbacks
  const [user, setUser] = useState(() => {
    try {
      const savedUser = safeStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [entreprise, setEntreprise] = useState(() => {
    try {
      const savedEntreprise = safeStorage.getItem('entreprise');
      return savedEntreprise ? JSON.parse(savedEntreprise) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const savedToken = safeStorage.getItem('token');
    // Only use saved token if it's not expired
    if (savedToken && !isTokenExpired(savedToken)) {
      return savedToken;
    }
    // Clear expired token
    if (savedToken) {
      safeStorage.removeItem('token');
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  
  // Track if we've attempted to fetch user data this session
  const fetchAttempted = useRef(false);

  // Create axios instance with memoization to prevent recreating on each render
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return instance;
  }, [token]);

  // Update axios headers when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.Authorization;
    }
  }, [token, api]);

  // Persist user and entreprise to localStorage whenever they change
  useEffect(() => {
    if (user) {
      safeStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    if (entreprise) {
      safeStorage.setItem('entreprise', JSON.stringify(entreprise));
    }
  }, [entreprise]);

  const fetchUser = useCallback(async () => {
    // Skip if no token or token is expired
    if (!token || isTokenExpired(token)) {
      if (token && isTokenExpired(token)) {
        // Token expired - clear auth state
        console.log('Token expired, clearing session');
        safeStorage.removeItem('token');
        safeStorage.removeItem('user');
        safeStorage.removeItem('entreprise');
        setToken(null);
        setUser(null);
        setEntreprise(null);
      }
      setLoading(false);
      return;
    }

    // If we already have user and entreprise from localStorage, 
    // use them immediately and refresh in background
    if (user && entreprise && !fetchAttempted.current) {
      setLoading(false);
      fetchAttempted.current = true;
      // Continue to refresh data in background below
    }

    try {
      // Decode token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub;
      const entrepriseId = payload.ent;
      
      // Fetch user and entreprise from Supabase directly
      const [userResult, entrepriseResult] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('entreprises').select('*').eq('id', entrepriseId).single()
      ]);
      
      if (userResult.data) {
        const userData = {
          ...userResult.data,
          id: String(userResult.data.id),
          entreprise_id: String(userResult.data.entreprise_id)
        };
        setUser(userData);
        safeStorage.setItem('user', JSON.stringify(userData));
      }
      if (entrepriseResult.data) {
        setEntreprise(entrepriseResult.data);
        safeStorage.setItem('entreprise', JSON.stringify(entrepriseResult.data));
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      // IMPORTANT: Don't clear session on network errors!
      // Only clear if it's an actual auth error (401, invalid token, etc.)
      if (error?.response?.status === 401 || error?.message?.includes('invalid') || error?.message?.includes('expired')) {
        console.log('Auth error - clearing session');
        safeStorage.removeItem('token');
        safeStorage.removeItem('user');
        safeStorage.removeItem('entreprise');
        setToken(null);
        setUser(null);
        setEntreprise(null);
      }
      // For network errors, keep the cached user/entreprise - user stays logged in
    } finally {
      setLoading(false);
      fetchAttempted.current = true;
    }
  }, [token, user, entreprise]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Automatic token refresh before expiration
  useEffect(() => {
    if (!token || !user) return;

    const refreshToken = async () => {
      const timeUntilExpiry = getTokenExpiryTime(token);
      
      // If token is about to expire (within threshold), refresh it
      if (timeUntilExpiry > 0 && timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
        console.log('[Auth] Token expiring soon, attempting silent refresh...');
        
        try {
          // Re-authenticate using stored credentials from the current session
          // Since we have the user info, we can request a new token via the refresh endpoint
          const response = await fetch(`${SUPABASE_URL}/functions/v1/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ 
              current_token: token,
              user_id: user.id,
              entreprise_id: user.entreprise_id || entreprise?.id
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              console.log('[Auth] Token refreshed successfully');
              safeStorage.setItem('token', data.token);
              setToken(data.token);
              return;
            }
          }
          
          // Fallback: If refresh endpoint doesn't exist or fails, 
          // the user will need to re-login when token expires
          console.log('[Auth] Token refresh not available, session will expire naturally');
        } catch (error) {
          console.log('[Auth] Token refresh failed:', error.message);
        }
      }
      
      // If token is already expired, clear session
      if (timeUntilExpiry <= 0) {
        console.log('[Auth] Token expired, clearing session');
        safeStorage.removeItem('token');
        safeStorage.removeItem('user');
        safeStorage.removeItem('entreprise');
        setToken(null);
        setUser(null);
        setEntreprise(null);
      }
    };

    // Check immediately
    refreshToken();

    // Set up periodic check
    const interval = setInterval(refreshToken, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [token, user, entreprise]);

  // Update PWA manifest/icons when user role changes or on initial load
  useEffect(() => {
    if (user?.role) {
      updatePWAForRole(user.role);
    } else {
      // No user logged in - check URL to determine which manifest to use
      const path = window.location.pathname;
      if (path.startsWith('/tech')) {
        updatePWAForRole('technicien');
      } else {
        updatePWAForRole('admin');
      }
    }
  }, [user?.role]);

  // Apply tenant's custom primary color as CSS variable
  useEffect(() => {
    if (entreprise?.couleur_primaire) {
      const root = document.documentElement;
      const color = entreprise.couleur_primaire;
      
      // Set the primary color CSS variable
      root.style.setProperty('--tenant-primary', color);
      
      // Calculate HSL values for Tailwind/Shadcn compatibility
      // Convert hex to RGB
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 37, g: 99, b: 235 }; // fallback to blue
      };
      
      // Convert RGB to HSL
      const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
            default: h = 0;
          }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
      };
      
      const rgb = hexToRgb(color);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      
      // Set HSL components for Shadcn/Tailwind primary variable
      root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty('--tenant-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }, [entreprise?.couleur_primaire]);

  const login = async (email, password) => {
    // Use Supabase Edge Function for ultra-fast login
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }
      
      // Check if 2FA is required
      if (data.requires_2fa) {
        return {
          requires_2fa: true,
          method: data.method,
          temp_token: data.temp_token
        };
      }
      
      // The Edge Function returns 'token', not 'access_token'
      const authToken = data.token || data.access_token;
      const userData = data.user;
      const entData = data.entreprise;
      
      if (!authToken || !userData) {
        throw new Error('Réponse invalide du serveur');
      }
      
      // Persist all auth data to localStorage
      safeStorage.setItem('token', authToken);
      safeStorage.setItem('user', JSON.stringify(userData));
      safeStorage.setItem('entreprise', JSON.stringify(entData));
      
      setToken(authToken);
      setUser(userData);
      setEntreprise(entData);
      
      // Update PWA theme based on user role
      updatePWAForRole(userData.role);
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  
  // Complete login after 2FA verification
  const complete2FALogin = (authData) => {
    const { access_token, user: userData, entreprise: entData } = authData;
    
    // Persist all data to localStorage
    safeStorage.setItem('token', access_token);
    safeStorage.setItem('user', JSON.stringify(userData));
    safeStorage.setItem('entreprise', JSON.stringify(entData));
    
    setToken(access_token);
    setUser(userData);
    setEntreprise(entData);
    
    // Update PWA theme based on user role
    updatePWAForRole(userData.role);
    
    return userData;
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    const { access_token, user: userData, entreprise: entData } = response.data;
    
    // Persist all auth data
    safeStorage.setItem('token', access_token);
    safeStorage.setItem('user', JSON.stringify(userData));
    safeStorage.setItem('entreprise', JSON.stringify(entData));
    
    setToken(access_token);
    setUser(userData);
    setEntreprise(entData);
    
    return userData;
  };

  const logout = () => {
    // Clear all auth data from localStorage
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('entreprise');
      
      // Also clear any old prefixed keys that might exist
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_entreprise');
      localStorage.removeItem('tech_token');
      localStorage.removeItem('tech_user');
      localStorage.removeItem('tech_entreprise');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    // Reset state
    fetchAttempted.current = false;
    setToken(null);
    setUser(null);
    setEntreprise(null);
    
    // Force redirect to login page (using replace to prevent back button issues)
    window.location.replace('/login');
  };

  // Currency formatting helpers based on entreprise settings
  const currency = useMemo(() => entreprise?.devise || 'EUR', [entreprise]);
  
  const formatAmount = useCallback((amount) => {
    return formatCurrency(amount, currency);
  }, [currency]);
  
  const formatAmountCompact = useCallback((amount) => {
    return formatCurrencyCompact(amount, currency);
  }, [currency]);
  
  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

  // Plan feature helpers
  const planLimits = useMemo(() => entreprise?.plan_limits || {}, [entreprise]);
  const currentPlan = useMemo(() => entreprise?.plan || 'startup', [entreprise]);
  
  const hasFeature = useCallback((featureName) => {
    return planLimits[featureName] === true;
  }, [planLimits]);
  
  const getLimit = useCallback((limitName) => {
    return planLimits[limitName] ?? 0;
  }, [planLimits]);
  
  // Convenience feature checks
  const canUseMultiSites = useMemo(() => hasFeature('multi_sites'), [hasFeature]);
  const canUseOfflineMode = useMemo(() => hasFeature('offline_mode'), [hasFeature]);
  const canUseGeolocation = useMemo(() => hasFeature('geolocation'), [hasFeature]);
  const canUseAdvancedAnalytics = useMemo(() => hasFeature('advanced_analytics'), [hasFeature]);
  const canUseAutoPdfReports = useMemo(() => hasFeature('auto_pdf_reports'), [hasFeature]);
  const canUseAutoDevisToFacture = useMemo(() => hasFeature('auto_devis_to_facture'), [hasFeature]);
  const canUseTeamValidation = useMemo(() => hasFeature('team_validation'), [hasFeature]);
  const canUseWhiteLabel = useMemo(() => hasFeature('white_label'), [hasFeature]);
  const canUseApiAccess = useMemo(() => hasFeature('api_access'), [hasFeature]);
  const canUseAdvancedBranding = useMemo(() => hasFeature('advanced_branding'), [hasFeature]);

  // Session time remaining helper (for UI indicators)
  const getSessionTimeRemaining = useCallback(() => {
    if (!token) return 0;
    const remaining = getTokenExpiryTime(token);
    return Math.max(0, remaining);
  }, [token]);

  // Check if session is about to expire (within 10 minutes)
  const isSessionExpiringSoon = useMemo(() => {
    if (!token) return false;
    const remaining = getTokenExpiryTime(token);
    return remaining > 0 && remaining <= 10 * 60 * 1000; // 10 minutes
  }, [token]);

  const value = {
    user,
    entreprise,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTech: user?.role === 'tech',
    login,
    complete2FALogin,
    register,
    logout,
    api,
    // Supabase direct API (ultra-fast, no Railway)
    supabaseApi,
    supabase,
    refreshUser: fetchUser,
    // Currency helpers
    currency,
    currencySymbol,
    formatAmount,
    formatAmountCompact,
    // Plan & Feature helpers
    currentPlan,
    planLimits,
    hasFeature,
    getLimit,
    canUseMultiSites,
    canUseOfflineMode,
    canUseGeolocation,
    canUseAdvancedAnalytics,
    canUseAutoPdfReports,
    canUseAutoDevisToFacture,
    canUseTeamValidation,
    canUseWhiteLabel,
    canUseApiAccess,
    canUseAdvancedBranding,
    // Session helpers
    getSessionTimeRemaining,
    isSessionExpiringSoon,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
