import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const CountryCurrencySelector = () => {
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePreferencesContext();
  const [countries, setCountries] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('countries')
        .select('code, name, currency')
        .order('name');
      setCountries(data || []);
      const currencies = [...new Set(data?.map(c => c.currency).filter(Boolean))];
      setAvailableCurrencies(currencies);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleCountryChange = (e) => {
    const newCountry = e.target.value === '' ? null : e.target.value;
    updatePrefs('country', newCountry);
    if (newCountry) {
      const country = countries.find(c => c.code === newCountry);
      if (country?.currency) updatePrefs('currency', country.currency);
    }
  };

  const handleCurrencyChange = (e) => {
    updatePrefs('currency', e.target.value);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">
        🌍 {t('settings.countryCurrency', 'Pays et devise')}
      </h3>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t('settings.country', 'Pays')}
        </label>
        <select
          value={prefs.country || ''}
          onChange={handleCountryChange}
          className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('settings.allCountries', 'Tous les pays')}</option>
          {countries.map(c => (
            <option key={c.code} value={c.code}>
              {t(`countries.${c.code}`, c.name)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t('settings.currency', 'Devise')}
        </label>
        <select
          value={prefs.currency || 'XOF'}
          onChange={handleCurrencyChange}
          className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableCurrencies.map(code => (
            <option key={code} value={code}>
              {t(`currencies.${code}`, code)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CountryCurrencySelector;