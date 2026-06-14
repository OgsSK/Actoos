import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // 👈 import ajouté
import { usePreferences } from '../hooks/usePreferences';
import { supabase } from '../lib/supabase';
import { Globe } from 'lucide-react';

const CURRENCIES = {
  XOF: 'FCFA',
  EUR: 'EUR',
  USD: 'USD',
  MAD: 'MAD',
};

const HeaderPreferences = () => {
  const { t } = useTranslation(); // 👈 récupération de t
  const { prefs, updatePrefs } = usePreferences();
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    supabase.from('countries')
      .select('code, name, currency')
      .order('name')
      .then(({ data }) => setCountries(data || []));
  }, []);

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    updatePrefs('country', newCountry);
    const country = countries.find(c => c.code === newCountry);
    if (country?.currency) updatePrefs('currency', country.currency);
  };

  const handleCurrencyChange = (e) => {
    updatePrefs('currency', e.target.value);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Globe className="w-4 h-4 text-slate-400" />
      <select
        value={prefs.country}
        onChange={handleCountryChange}
        className="bg-transparent text-slate-600 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {t(`countries.${c.code}`, c.name)}
          </option>
        ))}
      </select>
      <select
        value={prefs.currency}
        onChange={handleCurrencyChange}
        className="bg-transparent text-slate-600 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.entries(CURRENCIES).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
};

export default HeaderPreferences;