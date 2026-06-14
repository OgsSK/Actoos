import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../hooks/usePreferences';
import { supabase } from '../lib/supabase';
import { Globe } from 'lucide-react';
import { cn } from '../lib/utils';

// Labels pour les devises (tu peux enrichir)
const CURRENCY_LABELS = {
  XOF: 'FCFA (XOF)',
  EUR: 'Euro (€)',
  USD: 'US Dollar ($)',
  MAD: 'Dirham marocain (MAD)',
  GBP: 'Livre sterling (£)',
  BRL: 'Réal brésilien (R$)',
  ARS: 'Peso argentin (AR$)',
  NGN: 'Naira nigérian (₦)',
  ZAR: 'Rand sud-africain (R)',
  SAR: 'Riyal saoudien (﷼)',
  AED: 'Dirham des Émirats (د.إ)',
  EGP: 'Livre égyptienne (ج.م)',
  DZD: 'Dinar algérien (د.ج)',
  TND: 'Dinar tunisien (د.ت)',
  CHF: 'Franc suisse (CHF)',
  XAF: 'Franc CFA (XAF)',
  GNF: 'Franc guinéen (FG)',
  CDF: 'Franc congolais (FC)',
  MGA: 'Ariary malgache (Ar)',
};

const HeaderPreferences = ({ isMobile = false, isTransparent = false }) => {
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePreferences();
  const [countries, setCountries] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  useEffect(() => {
    supabase.from('countries')
      .select('code, name, currency')
      .order('name')
      .then(({ data }) => {
        setCountries(data || []);
        const currencies = [...new Set(data?.map(c => c.currency).filter(Boolean))];
        setAvailableCurrencies(currencies);
      });
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

  // Classes dynamiques pour mobile / desktop
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

  const iconClasses = cn(
    'text-slate-400',
    isMobile ? 'w-3.5 h-3.5 hidden' : 'w-4 h-4'
  );

  return (
    <div className={containerClasses}>
      <Globe className={iconClasses} />
      <select
        value={prefs.country}
        onChange={handleCountryChange}
        className={selectClasses}
        aria-label={t('select_country')}
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {isMobile ? c.code : t(`countries.${c.code}`, c.name)}
          </option>
        ))}
      </select>
      <select
        value={prefs.currency}
        onChange={handleCurrencyChange}
        className={selectClasses}
        aria-label={t('select_currency')}
      >
        {availableCurrencies.map(code => (
          <option key={code} value={code}>
            {isMobile ? code : (CURRENCY_LABELS[code] || code)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default HeaderPreferences;