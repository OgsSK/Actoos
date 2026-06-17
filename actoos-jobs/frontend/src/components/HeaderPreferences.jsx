import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { supabase } from '../lib/supabase';
import { Globe } from 'lucide-react';
import { cn } from '../lib/utils';

const HeaderPreferences = ({ isMobile = false, isTransparent = false }) => {
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePreferencesContext();
  const [countries, setCountries] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  useEffect(() => {
    supabase
      .from('countries')
      .select('code, name, currency')
      .order('name')
      .then(({ data }) => {
        setCountries(data || []);
        const currencies = [...new Set(data?.map(c => c.currency).filter(Boolean))];
        setAvailableCurrencies(currencies);
      });
  }, []);

  const handleCountryChange = (e) => {
    const newValue = e.target.value === '' ? null : e.target.value;
    updatePrefs('country', newValue);
    if (newValue) {
      const country = countries.find(c => c.code === newValue);
      if (country?.currency) {
        updatePrefs('currency', country.currency);
      }
    }
  };

  const handleCurrencyChange = (e) => {
    updatePrefs('currency', e.target.value);
  };

  const containerClasses = cn(
    'flex items-center gap-1 text-sm',
    isMobile ? 'gap-0.5 text-xs' : 'gap-2'
  );

  const selectClasses = cn(
    'bg-transparent text-slate-600 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all',
    isMobile
      ? 'px-1.5 py-0.5 text-xs border-slate-300 max-w-[90px] truncate'
      : 'px-2 py-1'
  );

  const iconClasses = cn('text-slate-400', isMobile ? 'w-3.5 h-3.5 hidden' : 'w-4 h-4');

  return (
    <div className={containerClasses}>
      <Globe className={iconClasses} />
      <select
        value={prefs.country || ''}
        onChange={handleCountryChange}
        className={selectClasses}
        aria-label={t('select_country')}
      >
        <option value="">
          {isMobile ? t('common.allCountriesShort', 'Tous') : t('common.allCountries', 'Tous les pays')}
        </option>
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {isMobile ? c.code : t(`countries.${c.code}`, c.name)}
          </option>
        ))}
      </select>
      <select
        value={prefs.currency || 'XOF'}
        onChange={handleCurrencyChange}
        className={selectClasses}
        aria-label={t('select_currency')}
      >
        {availableCurrencies.map(code => (
          <option key={code} value={code}>
            {isMobile ? code : t(`currencies.${code}`, code)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default HeaderPreferences;