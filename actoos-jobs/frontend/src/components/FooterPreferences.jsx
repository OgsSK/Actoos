import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // 👈 Ajout de useTranslation
import { usePreferences } from '../hooks/usePreferences';
import { supabase } from '../lib/supabase';
import { Globe } from 'lucide-react';

const CURRENCIES = {
  XOF: 'FCFA (XOF)',
  EUR: 'Euro (EUR)',
  USD: 'US Dollar (USD)',
  MAD: 'Dirham marocain (MAD)'
};

const FooterPreferences = () => {
  const { t } = useTranslation(); // 👈 Récupération de la fonction t
  const { prefs, updatePrefs } = usePreferences();
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    supabase.from('countries').select('code, name').order('name').then(({ data }) => setCountries(data || []));
  }, []);

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    updatePrefs('country', newCountry);
    supabase.from('countries').select('currency').eq('code', newCountry).single().then(({ data }) => {
      if (data?.currency) updatePrefs('currency', data.currency);
    });
    // Pas de rechargement
  };

  const handleCurrencyChange = (e) => {
    updatePrefs('currency', e.target.value);
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      <Globe className="w-4 h-4 text-slate-400" />
      <select value={prefs.country} onChange={handleCountryChange} className="bg-transparent text-slate-300 border border-slate-600 rounded px-2 py-1">
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {t(`countries.${c.code}`, c.name)}
          </option>
        ))}
      </select>
      <select value={prefs.currency} onChange={handleCurrencyChange} className="bg-transparent text-slate-300 border border-slate-600 rounded px-2 py-1">
        {Object.entries(CURRENCIES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
    </div>
  );
};

export default FooterPreferences;