import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const DEFAULTS = { language: 'fr', currency: 'XOF' };

export const usePreferences = () => {
  const { user, profile } = useAuth();
  const [prefs, setPrefs] = useState(() => {
    const stored = localStorage.getItem('actoos_preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('🟢 [usePreferences] Init from localStorage:', parsed);
        return { ...DEFAULTS, ...parsed };
      } catch {
        console.warn('🟠 [usePreferences] Failed to parse localStorage, using defaults');
        return DEFAULTS;
      }
    }
    console.log('🟡 [usePreferences] No localStorage, using defaults');
    return DEFAULTS;
  });

  useEffect(() => {
    const hasExplicitChoice = localStorage.getItem('actoos_explicit_prefs') === 'true';
    console.log('🔄 [usePreferences] useEffect triggered. user:', !!user, 'hasExplicitChoice:', hasExplicitChoice, 'profile?.preferences:', profile?.preferences);
    if (user && profile?.preferences && !hasExplicitChoice) {
      const merged = { ...DEFAULTS, ...profile.preferences };
      console.log('🔵 [usePreferences] Merging profile preferences:', merged);
      setPrefs(merged);
      localStorage.setItem('actoos_preferences', JSON.stringify(merged));
      console.log('💾 [usePreferences] Profile merged & saved to localStorage');
    }
  }, [user, profile]);

  const updatePrefs = useCallback(async (key, value) => {
    console.log(`✏️ [usePreferences] updatePrefs called: key=${key}, value=${value}`);
    const updated = { ...prefs, [key]: value };
    console.log('📝 [usePreferences] Updated prefs object:', updated);
    setPrefs(updated);
    localStorage.setItem('actoos_preferences', JSON.stringify(updated));
    localStorage.setItem('actoos_explicit_prefs', 'true');
    console.log('💾 [usePreferences] Saved to localStorage, explicit flag set');

    if (user) {
      console.log('☁️ [usePreferences] Updating Supabase...');
      await supabase.from('users').update({ preferences: updated }).eq('id', user.id);
      console.log('✅ [usePreferences] Supabase updated successfully');
    } else {
      console.log('⚠️ [usePreferences] No user, skipping Supabase update');
    }
  }, [user, prefs]);

  console.log('🔍 [usePreferences] Render - current prefs:', prefs);
  return { prefs, updatePrefs };
};