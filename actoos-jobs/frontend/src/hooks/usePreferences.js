// usePreferences.js – inchangé, déjà fonctionnel
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const DEFAULTS = { language: 'fr', country: 'ML', currency: 'XOF' };

export const usePreferences = () => {
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

  useEffect(() => {
    if (user && profile?.preferences) {
      const merged = { ...DEFAULTS, ...profile.preferences };
      setPrefs(merged);
      localStorage.setItem('actoos_preferences', JSON.stringify(merged));
    }
  }, [user, profile]);

  const updatePrefs = useCallback(async (key, value) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('actoos_preferences', JSON.stringify(updated));
      if (user) {
        supabase.from('users').update({ preferences: updated }).eq('id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Erreur sauvegarde préférences:', error);
          });
      }
      return updated;
    });
  }, [user]);

  return { prefs, updatePrefs };
};