import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const DEFAULTS = { language: 'fr', currency: 'XOF' };

const PreferencesContext = createContext();

export const usePreferencesContext = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferencesContext must be used within PreferencesProvider');
  return context;
};

export const PreferencesProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [prefs, setPrefs] = useState(() => {
    const stored = localStorage.getItem('actoos_preferences');
    if (stored) {
      try {
        return { ...DEFAULTS, ...JSON.parse(stored) };
      } catch {
        return DEFAULTS;
      }
    }
    return DEFAULTS;
  });

  // Au montage, si l'utilisateur est connecté et qu'il n'a jamais fait de choix explicite,
  // on fusionne avec son profil.
  useEffect(() => {
    if (user && profile?.preferences && !localStorage.getItem('actoos_explicit_prefs')) {
      const merged = { ...DEFAULTS, ...profile.preferences };
      setPrefs(merged);
      localStorage.setItem('actoos_preferences', JSON.stringify(merged));
    }
  }, [user, profile]);

  const updatePrefs = useCallback(async (key, value) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('actoos_preferences', JSON.stringify(updated));
      localStorage.setItem('actoos_explicit_prefs', 'true');
      // Sauvegarde asynchrone dans Supabase (sans attendre)
      if (user) {
        supabase.from('users').update({ preferences: updated }).eq('id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Erreur sauvegarde préférences:', error);
          });
      }
      return updated;
    });
  }, [user]);

  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs }}>
      {children}
    </PreferencesContext.Provider>
  );
};