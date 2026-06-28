import { useState, useEffect } from 'react';

const useAllowedCountries = () => {
  const [allowed, setAllowed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/allowed-countries.json')
      .then(res => {
        if (!res.ok) throw new Error('Fichier non trouvé');
        return res.json();
      })
      .then(data => {
        // On ne garde que les codes qui ne commencent pas par "//"
        const active = data
          .filter(code => typeof code === 'string' && !code.startsWith('//'))
          .map(code => code.toUpperCase());
        setAllowed(active);
        setLoading(false);
      })
      .catch(() => {
        setAllowed([]);
        setLoading(false);
      });
  }, []);

  const isRestricted = allowed.length > 0;
  return { allowed, isRestricted, loading };
};

export default useAllowedCountries;