import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useCities = (countryCode) => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      setLoading(false);
      return;
    }

    const fetchCities = async () => {
      setLoading(true);
      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', countryCode)
        .single();

      if (country) {
        const { data } = await supabase
          .from('cities')
          .select('*')
          .eq('country_id', country.id)
          .eq('is_active', true)
          .order('name');
        setCities(data || []);
      } else {
        setCities([]);
      }
      setLoading(false);
    };

    fetchCities();
  }, [countryCode]);

  return { cities, loading };
};