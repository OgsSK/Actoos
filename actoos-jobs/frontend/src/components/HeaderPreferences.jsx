import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../hooks/usePreferences';
import { supabase } from '../lib/supabase';
import { Globe } from 'lucide-react';

// ✅ Labels pour les codes de devise (tu peux les enrichir au besoin)
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

const HeaderPreferences = () => {
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
        // ✅ Extraire les devises uniques depuis les pays récupérés
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
        {availableCurrencies.map(code => (
          <option key={code} value={code}>
            {CURRENCY_LABELS[code] || code}
          </option>
        ))}
      </select>
    </div>
  );
};

export default HeaderPreferences;