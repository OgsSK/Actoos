/**
 * ACTOOS ONE - Country Selector Component
 * 
 * Sélecteur de pays avec drapeaux pour l'authentification.
 * Style WhatsApp/Glovo avec dropdown élégant.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Globe } from 'lucide-react';
import { 
  COUNTRIES, 
  getActiveCountries, 
  getDefaultCountry,
  LAUNCH_STATUS 
} from '../config/countriesConfig';

export function CountrySelector({ 
  selectedCountry, 
  onSelect, 
  showPhoneCode = true,
  showName = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus sur le champ de recherche quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const country = selectedCountry || getDefaultCountry();
  const activeCountries = getActiveCountries();

  // Filtrer les pays par recherche
  const filteredCountries = activeCountries.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneCode.includes(searchQuery) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (c) => {
    onSelect(c);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Tailles
  const sizeClasses = {
    sm: 'py-1.5 px-2 text-sm',
    md: 'py-2 px-3 text-base',
    lg: 'py-3 px-4 text-lg',
  };

  const flagSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bouton principal */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 
          bg-gray-50 border border-gray-200 rounded-lg
          hover:bg-gray-100 transition-colors
          ${sizeClasses[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        data-testid="country-selector-btn"
      >
        <span className={flagSizes[size]}>{country.flag}</span>
        {showPhoneCode && (
          <span className="text-gray-700 font-medium">{country.phoneCode}</span>
        )}
        {showName && (
          <span className="text-gray-700">{country.name}</span>
        )}
        <ChevronDown 
          size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
          data-testid="country-selector-dropdown"
        >
          {/* Recherche */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                data-testid="country-search-input"
              />
            </div>
          </div>

          {/* Liste des pays */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucun pays trouvé
              </div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 text-left
                    hover:bg-orange-50 transition-colors
                    ${country.code === c.code ? 'bg-orange-50' : ''}
                  `}
                  data-testid={`country-option-${c.code}`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {c.name}
                      </span>
                      {c.status === LAUNCH_STATUS.COMING_SOON && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                          BIENTÔT
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{c.phoneCode}</span>
                  </div>
                  {country.code === c.code && (
                    <Check size={18} className="text-[#FF5A00] flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Globe size={12} />
              <span>{activeCountries.length} pays disponibles</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Version inline pour le champ téléphone
 * Affiche juste le drapeau + code avec dropdown intégré
 */
export function CountrySelectorInline({
  selectedCountry,
  onSelect,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const country = selectedCountry || getDefaultCountry();
  const activeCountries = getActiveCountries();

  const filteredCountries = activeCountries.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneCode.includes(searchQuery)
  );

  const handleSelect = (c) => {
    onSelect(c);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1 pr-1 border-r border-gray-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
        `}
        data-testid="country-selector-inline-btn"
      >
        <span className="text-xl">{country.flag}</span>
        <span className="text-gray-700 font-medium text-base">{country.phoneCode}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
          data-testid="country-selector-dropdown"
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                autoFocus
                data-testid="country-search-input"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filteredCountries.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelect(c)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left
                  hover:bg-orange-50 transition-colors
                  ${country.code === c.code ? 'bg-orange-50' : ''}
                `}
                data-testid={`country-option-${c.code}`}
              >
                <span className="text-xl">{c.flag}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  {c.status === LAUNCH_STATUS.COMING_SOON && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">
                      BIENTÔT
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{c.phoneCode}</span>
                {country.code === c.code && (
                  <Check size={16} className="text-[#FF5A00]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CountrySelector;
