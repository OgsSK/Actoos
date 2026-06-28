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
        // data est un tableau de codes ISO, ex: ["ML"]
        setAllowed(data.map(code => code.toUpperCase()));
        setLoading(false);
      })
      .catch(() => {
        // Si le fichier est absent ou illisible, on laisse la liste vide -> restriction désactivée
        setAllowed([]);
        setLoading(false);
      });
  }, []);

  const isRestricted = allowed.length > 0;
  return { allowed, isRestricted, loading };
};

export default useAllowedCountries;