import React, { useState, useEffect } from 'react';
import { usePreferences } from '../hooks/usePreferences';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const CURRENCIES = {
  XOF: 'FCFA (XOF)',
  EUR: 'Euro (EUR)',
  USD: 'US Dollar (USD)',
  MAD: 'Dirham marocain (MAD)'
};

const CountryCurrencySelector = () => {
  const { prefs, updatePrefs } = usePreferences();
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase
        .from('countries')
        .select('code, name, currency')
        .order('name');
      setCountries(data || []);
      setLoading(false);
    };
    fetchCountries();
  }, []);

 const handleCountryChange = (e) => {
  const newCountry = e.target.value;
  updatePrefs('country', newCountry);
  const country = countries.find(c => c.code === newCountry);
  if (country && country.currency) {
    updatePrefs('currency', country.currency);
  }
};

  if (loading) return <Loader2 className="w-4 h-4 animate-spin" />;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">🌍 Pays et devise</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
        <select
          value={prefs.country}
          onChange={handleCountryChange}
          className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white"
        >
          {countries.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
        <select
          value={prefs.currency}
          onChange={(e) => updatePrefs('currency', e.target.value)}
          className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white"
        >
          {Object.entries(CURRENCIES).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CountryCurrencySelector;