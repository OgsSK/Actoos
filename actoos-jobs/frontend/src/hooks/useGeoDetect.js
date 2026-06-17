import { useState, useEffect } from 'react';
import { usePreferencesContext } from '../contexts/PreferencesContext';

export const useGeoDetect = () => {
  const { prefs, updatePrefs } = usePreferencesContext();
  const [detected, setDetected] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const hasChosen = localStorage.getItem('actoos_country_chosen');
    if (hasChosen) return;
    if (prefs.country !== 'ML' || prefs.currency !== 'XOF') return;

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_code && data.country_code !== 'ML') {
          setDetected({
            country: data.country_code,
            currency: data.currency || 'XOF',
          });
          setShowBanner(true);
        }
      })
      .catch(() => {});
  }, []);

  const applyDetected = () => {
    if (detected) {
      updatePrefs('country', detected.country);
      updatePrefs('currency', detected.currency);
      localStorage.setItem('actoos_country_chosen', 'true');
      setShowBanner(false);
      window.location.href = window.location.pathname + '?t=' + Date.now();
    }
  };

  const dismissBanner = () => {
    localStorage.setItem('actoos_country_chosen', 'true');
    setShowBanner(false);
  };

  return { detected, showBanner, applyDetected, dismissBanner };
};