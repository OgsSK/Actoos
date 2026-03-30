import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../lib/currency';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [entreprise, setEntreprise] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Update axios headers when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.Authorization;
    }
  }, [token]);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setEntreprise(response.data.entreprise);
    } catch (error) {
      console.error('Auth error:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setEntreprise(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user: userData, entreprise: entData } = response.data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    setEntreprise(entData);
    
    return userData;
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    const { access_token, user: userData, entreprise: entData } = response.data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    setEntreprise(entData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setEntreprise(null);
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

  const value = {
    user,
    entreprise,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTech: user?.role === 'tech',
    login,
    register,
    logout,
    api,
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
