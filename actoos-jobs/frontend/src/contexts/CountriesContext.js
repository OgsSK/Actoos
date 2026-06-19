import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const CountriesContext = createContext();

export function CountriesProvider({ children }) {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('countries')
      .select('code, name, currency')
      .order('name')
      .then(({ data }) => {
        setCountries(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // On dérive les devises uniques directement du contexte
  const availableCurrencies = [...new Set(countries.map(c => c.currency).filter(Boolean))];

  return (
    <CountriesContext.Provider value={{ countries, loading, availableCurrencies }}>
      {children}
    </CountriesContext.Provider>
  );
}

export function useCountries() {
  return useContext(CountriesContext);
}