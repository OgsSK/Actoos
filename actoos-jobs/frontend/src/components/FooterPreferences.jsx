import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCountries } from '../contexts/CountriesContext';
import useAllowedCountries from '../hooks/useAllowedCountries';
import { Globe, ChevronDown } from 'lucide-react';

const selectClass =
  'w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-200 outline-none transition focus:border-slate-500 focus:ring-0';

const FooterPreferences = () => {
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePreferencesContext();
  const { countries, availableCurrencies } = useCountries();
  const { allowed, isRestricted } = useAllowedCountries();

  const handleCountryChange = (e) => {
    const newValue = e.target.value === '' ? null : e.target.value;
    updatePrefs('country', newValue);
    if (newValue) {
      const country = countries.find(c => c.code === newValue);
      if (country?.currency) updatePrefs('currency', country.currency);
    }
  };

  const handleCurrencyChange = (e) => {
    updatePrefs('currency', e.target.value);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="relative">
        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          value={prefs.country || ''}
          onChange={handleCountryChange}
          className={`${selectClass} pl-10`}
        >
          <option value="">{t('common.allCountries')}</option>
          {countries.map((c) => {
            const disabled = isRestricted && !allowed.includes(c.code);
            return (
              <option
                key={c.code}
                value={c.code}
                disabled={disabled}
                style={disabled ? { color: '#6b7280', opacity: 0.6 } : {}}
              >
                {t(`countries.${c.code}`, c.name)}
                {disabled ? ` (${t('common.comingSoon', 'bientôt')})` : ''}
              </option>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      <div className="relative">
        <select
          value={prefs.currency || 'XOF'}
          onChange={handleCurrencyChange}
          className={selectClass}
        >
          {availableCurrencies.map((code) => (
            <option key={code} value={code}>
              {t(`currencies.${code}`, code)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
};

export default FooterPreferences;