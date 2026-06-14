import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const useCachedData = (table, query = '*', orderBy = 'name') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(`cache_${table}`);
    if (cached) {
      try {
        const { data: stored, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setData(stored);
          setLoading(false);
          return;
        }
      } catch {}
    }

    supabase
      .from(table)
      .select(query)
      .order(orderBy)
      .then(({ data: fresh }) => {
        if (fresh) {
          localStorage.setItem(`cache_${table}`, JSON.stringify({ data: fresh, timestamp: Date.now() }));
          setData(fresh);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [table, query, orderBy]);

  return { data, loading };
};

export default useCachedData;