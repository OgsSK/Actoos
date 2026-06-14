import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useCachedData from './useCachedData';

export const useCities = (countryCode) => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charge toutes les villes une seule fois (cache 30 min)
  const { data: allCities, loading: citiesLoading } = useCachedData(
    'cities',
    'id, name, country_id, region',
    'name'
  );

  // Charge les pays pour faire la correspondance code → id
  const { data: countries } = useCachedData(
    'countries',
    'id, code',
    'name'
  );

  useEffect(() => {
    if (!countryCode || citiesLoading || countries.length === 0) {
      if (!citiesLoading) {
        setCities([]);
        setLoading(false);
      }
      return;
    }

    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setCities(allCities.filter((city) => city.country_id === country.id));
    } else {
      setCities([]);
    }
    setLoading(false);
  }, [countryCode, allCities, countries, citiesLoading]);

  return { cities, loading: loading || citiesLoading };
};