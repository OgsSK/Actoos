/**
 * ACTOOS ONE - City Selector
 * 
 * Composant pour changer rapidement de ville/pays.
 * Utilisé dans AddressSheet et en standalone.
 */

import { useState } from 'react';
import { MapPin, ChevronRight, Globe, Check } from 'lucide-react';
import { COUNTRIES, getCountryByCode } from '../config/countriesConfig';

// Villes principales par pays
const CITIES_BY_COUNTRY = {
  ML: ['Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Kayes'],
  SN: ['Dakar', 'Thiès', 'Saint-Louis', 'Kaolack', 'Mbour'],
  CI: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro'],
  BF: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora'],
  GN: ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia'],
  NE: ['Niamey', 'Zinder', 'Maradi', 'Agadez'],
  TG: ['Lomé', 'Sokodé', 'Kara', 'Kpalimé'],
  BJ: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey'],
  GW: ['Bissau', 'Bafatá', 'Gabú'],
  MR: ['Nouakchott', 'Nouadhibou', 'Kaédi'],
};

export function CitySelector({ 
  currentCountry, 
  currentCity, 
  onSelectLocation,
  compact = false,
}) {
  const [showCountries, setShowCountries] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState(currentCountry?.code || 'ML');

  const country = getCountryByCode(selectedCountryCode) || COUNTRIES[0];
  const cities = CITIES_BY_COUNTRY[selectedCountryCode] || [];

  const handleSelectCountry = (countryCode) => {
    setSelectedCountryCode(countryCode);
    // Sélectionner automatiquement la capitale
    const newCountry = getCountryByCode(countryCode);
    if (newCountry) {
      onSelectLocation?.(newCountry, newCountry.capital);
    }
    setShowCountries(false);
  };

  const handleSelectCity = (cityName) => {
    onSelectLocation?.(country, cityName);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
        <button
          onClick={() => setShowCountries(!showCountries)}
          className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <span className="text-lg">{country.flag}</span>
          <span className="text-sm font-medium">{country.name}</span>
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${showCountries ? 'rotate-90' : ''}`} />
        </button>
        <span className="text-gray-400">|</span>
        <span className="text-sm text-gray-700">{currentCity || country.capital}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pays */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
          <Globe size={12} className="inline mr-1" />
          Pays
        </label>
        <div className="grid grid-cols-2 gap-2">
          {COUNTRIES.slice(0, 6).map(c => (
            <button
              key={c.code}
              onClick={() => handleSelectCountry(c.code)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                selectedCountryCode === c.code
                  ? 'border-[#FF5A00] bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{c.flag}</span>
              <span className="text-sm font-medium truncate">{c.name}</span>
              {selectedCountryCode === c.code && (
                <Check size={16} className="text-[#FF5A00] ml-auto" />
              )}
            </button>
          ))}
        </div>
        {COUNTRIES.length > 6 && (
          <button
            onClick={() => setShowCountries(!showCountries)}
            className="mt-2 text-sm text-[#FF5A00] hover:underline"
          >
            {showCountries ? 'Voir moins' : `+ ${COUNTRIES.length - 6} autres pays`}
          </button>
        )}
        {showCountries && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {COUNTRIES.slice(6).map(c => (
              <button
                key={c.code}
                onClick={() => handleSelectCountry(c.code)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                  selectedCountryCode === c.code
                    ? 'border-[#FF5A00] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{c.flag}</span>
                <span className="text-sm font-medium truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Villes */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
          <MapPin size={12} className="inline mr-1" />
          Ville
        </label>
        <div className="flex flex-wrap gap-2">
          {cities.map(cityName => (
            <button
              key={cityName}
              onClick={() => handleSelectCity(cityName)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentCity === cityName
                  ? 'bg-[#FF5A00] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cityName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CitySelector;
