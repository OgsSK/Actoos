import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../hooks/usePreferences';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

// ✅ Labels pour toutes les devises (utilisés pour l'affichage)
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
};

const CountryCurrencySelector = () => {
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePreferences();
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
      // ✅ Extraire les devises uniques depuis les pays
      const currencies = [...new Set(data?.map(c => c.currency).filter(Boolean))];
      setAvailableCurrencies(currencies);
      setLoading(false);
    };
    fetchData();
  }, []);

  // ✅ Changement de pays : synchroniser la devise
  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    updatePrefs('country', newCountry);
    const country = countries.find(c => c.code === newCountry);
    if (country?.currency) {
      updatePrefs('currency', country.currency);
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
          value={prefs.country}
          onChange={handleCountryChange}
          className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
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
          value={prefs.currency}
          onChange={handleCurrencyChange}
          className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableCurrencies.map(code => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code] || code}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CountryCurrencySelector;