import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../hooks/usePreferences';
import { supabase } from '../lib/supabase';
import { Globe, ChevronDown } from 'lucide-react';

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

const selectClass =
  'w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-200 outline-none transition focus:border-slate-500 focus:ring-0';

const FooterPreferences = () => {
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePreferences();
  const [countries, setCountries] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  useEffect(() => {
    let alive = true;

    supabase
      .from('countries')
      .select('code, name, currency')
      .order('name')
      .then(({ data }) => {
        if (!alive) return;
        const rows = data || [];
        setCountries(rows);
        setAvailableCurrencies([...new Set(rows.map(c => c.currency).filter(Boolean))]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    updatePrefs('country', newCountry);

    supabase
      .from('countries')
      .select('currency')
      .eq('code', newCountry)
      .single()
      .then(({ data }) => {
        if (data?.currency) updatePrefs('currency', data.currency);
      });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="relative">
        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          value={prefs.country}
          onChange={handleCountryChange}
          className={`${selectClass} pl-10`}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {t(`countries.${c.code}`, c.name)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>

      <div className="relative">
        <select
          value={prefs.currency}
          onChange={(e) => updatePrefs('currency', e.target.value)}
          className={selectClass}
        >
          {availableCurrencies.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code] || code}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
};

export default FooterPreferences;