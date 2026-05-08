/**
 * ACTOOS ONE - Location Context
 * 
 * Gère la localisation de l'utilisateur (pays, ville) pour le filtrage
 * des restaurants et l'expérience multi-pays.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCountryByCode, getDefaultCountry, COUNTRIES } from '../config/countriesConfig';

const LocationContext = createContext(null);

// Clés localStorage
const STORAGE_KEYS = {
  COUNTRY: 'actoos_user_country',
  CITY: 'actoos_user_city',
  COORDS: 'actoos_user_coords',
};

export function LocationProvider({ children }) {
  // État de la localisation
  const [country, setCountryState] = useState(null);
  const [city, setCity] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);

  // Charger la localisation depuis localStorage au démarrage
  useEffect(() => {
    const loadSavedLocation = () => {
      try {
        const savedCountryCode = localStorage.getItem(STORAGE_KEYS.COUNTRY);
        const savedCity = localStorage.getItem(STORAGE_KEYS.CITY);
        const savedCoords = localStorage.getItem(STORAGE_KEYS.COORDS);

        if (savedCountryCode) {
          const countryObj = getCountryByCode(savedCountryCode);
          if (countryObj) {
            setCountryState(countryObj);
          }
        }

        if (savedCity) {
          setCity(savedCity);
        }

        if (savedCoords) {
          setCoordinates(JSON.parse(savedCoords));
        }

        // Si rien n'est sauvegardé, utiliser Mali par défaut
        if (!savedCountryCode) {
          const defaultCountry = getDefaultCountry();
          setCountryState(defaultCountry);
          setCity(defaultCountry.capital);
        }
      } catch (err) {
        console.error('Erreur chargement localisation:', err);
        // Fallback vers Mali
        setCountryState(getDefaultCountry());
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedLocation();
  }, []);

  // Définir le pays
  const setCountry = useCallback((countryOrCode) => {
    let countryObj;
    
    if (typeof countryOrCode === 'string') {
      countryObj = getCountryByCode(countryOrCode);
    } else {
      countryObj = countryOrCode;
    }

    if (countryObj) {
      setCountryState(countryObj);
      localStorage.setItem(STORAGE_KEYS.COUNTRY, countryObj.code);
      
      // Mettre à jour la ville vers la capitale si on change de pays
      setCity(countryObj.capital);
      localStorage.setItem(STORAGE_KEYS.CITY, countryObj.capital);
    }
  }, []);

  // Définir la ville
  const setCityLocation = useCallback((newCity) => {
    setCity(newCity);
    localStorage.setItem(STORAGE_KEYS.CITY, newCity);
  }, []);

  // Définir les coordonnées GPS
  const setCoords = useCallback((coords) => {
    setCoordinates(coords);
    if (coords) {
      localStorage.setItem(STORAGE_KEYS.COORDS, JSON.stringify(coords));
    }
  }, []);

  // Détecter le pays à partir des coordonnées GPS (utilise reverse geocoding)
  const detectCountryFromGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Géolocalisation non supportée');
      return null;
    }

    setIsLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });

      // Reverse geocoding avec Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
      );
      const data = await response.json();

      if (data?.address) {
        const countryCode = data.address.country_code?.toUpperCase();
        const cityName = data.address.city || data.address.town || data.address.village;

        // Vérifier si le pays est supporté
        const supportedCountry = COUNTRIES.find(c => c.code === countryCode);
        
        if (supportedCountry) {
          setCountry(supportedCountry);
          if (cityName) {
            setCityLocation(cityName);
          }
          return supportedCountry;
        } else {
          // Pays non supporté - utiliser Mali par défaut
          console.log(`Pays ${countryCode} non supporté, fallback vers Mali`);
          setCountry(getDefaultCountry());
          return getDefaultCountry();
        }
      }
    } catch (err) {
      console.error('Erreur détection GPS:', err);
      setLocationError(err.message || 'Erreur de géolocalisation');
    } finally {
      setIsLoading(false);
    }

    return null;
  }, [setCoords, setCountry, setCityLocation]);

  // Obtenir la localisation formatée
  const getLocationDisplay = useCallback(() => {
    if (!country) return 'Choisir un emplacement';
    if (city) return `${city}, ${country.name}`;
    return country.name;
  }, [country, city]);

  // Vérifier si la localisation est complète
  const hasLocation = Boolean(country && city);

  const value = {
    // État
    country,
    city,
    coordinates,
    isLoading,
    locationError,
    hasLocation,

    // Actions
    setCountry,
    setCity: setCityLocation,
    setCoordinates: setCoords,
    detectCountryFromGPS,

    // Helpers
    getLocationDisplay,
    countryCode: country?.code || 'ML',
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export default LocationContext;
