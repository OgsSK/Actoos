import { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Home, 
  Briefcase, 
  Clock, 
  ChevronRight,
  X,
  Loader2,
  Plus,
  Check,
  Edit3,
  Trash2,
  Star,
  MoreHorizontal,
  Tag,
  Globe
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { BAMAKO_NEIGHBORHOODS } from '../data/locationData';
import { CitySelector } from './CitySelector';
import { COUNTRIES, getCountryByCode } from '../config/countriesConfig';

// Clé localStorage pour les adresses sauvegardées
const SAVED_ADDRESSES_KEY = 'actoos_saved_addresses';

// Icônes disponibles pour les adresses
const ADDRESS_ICONS = {
  home: { icon: Home, color: 'bg-blue-100 text-blue-600', label: 'Maison' },
  work: { icon: Briefcase, color: 'bg-purple-100 text-purple-600', label: 'Bureau' },
  other: { icon: MapPin, color: 'bg-gray-100 text-gray-600', label: 'Autre' },
  star: { icon: Star, color: 'bg-yellow-100 text-yellow-600', label: 'Favori' },
};

export function AddressSheet({ 
  isOpen, 
  onClose, 
  currentAddress,
  onSelectAddress,
  userLocation,
  onRequestLocation,
  currentCountry,
  currentCity,
  onChangeLocation,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentAddresses, setRecentAddresses] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locatingError, setLocatingError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showCitySelector, setShowCitySelector] = useState(false);
  
  // Formulaire d'ajout/édition d'adresse
  const [formLabel, setFormLabel] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState('other');
  const [formDetails, setFormDetails] = useState('');
  
  // Charger les adresses sauvegardées depuis localStorage
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const stored = localStorage.getItem(SAVED_ADDRESSES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load recent addresses from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('actoos_recent_addresses');
    if (stored) {
      setRecentAddresses(JSON.parse(stored));
    }
  }, [isOpen]);

  // Sauvegarder les adresses dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(savedAddresses));
    } catch (e) {
      console.warn('Erreur sauvegarde adresses:', e);
    }
  }, [savedAddresses]);

  // Filter neighborhoods based on search
  const filteredNeighborhoods = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    return BAMAKO_NEIGHBORHOODS
      .filter(n => 
        n.name.toLowerCase().includes(query) ||
        n.commune.toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [searchQuery]);

  // Handle address selection
  const handleSelectAddress = (address) => {
    // Add to recent addresses
    const newRecent = [
      { address, timestamp: Date.now() },
      ...recentAddresses.filter(r => r.address !== address)
    ].slice(0, 3);
    
    setRecentAddresses(newRecent);
    localStorage.setItem('actoos_recent_addresses', JSON.stringify(newRecent));
    
    onSelectAddress(address);
    setSearchQuery('');
    onClose();
  };

  // Reverse geocoding avec Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr',
            'User-Agent': 'ACTOOS-App/1.0'
          }
        }
      );
      
      if (!response.ok) throw new Error('Nominatim error');
      
      const data = await response.json();
      
      // Construire une adresse lisible - SANS préfixer avec Bamako
      const addr = data.address;
      let formattedAddress = '';
      
      // Obtenir la ville/commune
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      
      // Obtenir le quartier/zone
      const area = addr.neighbourhood || addr.suburb || addr.district || addr.city_district || '';
      
      if (city && area) {
        formattedAddress = `${city}, ${area}`;
      } else if (city) {
        formattedAddress = city;
      } else if (area) {
        formattedAddress = area;
      } else {
        // Fallback sur le display_name
        formattedAddress = data.display_name?.split(',').slice(0, 2).join(', ') || 'Position actuelle';
      }
      
      return formattedAddress;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Position actuelle';
    }
  };

  // Handle "Use my location" - VRAIE géolocalisation
  const handleUseLocation = async () => {
    setIsLocating(true);
    setLocatingError(null);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('La géolocalisation n\'est pas supportée par votre navigateur');
      }
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });
      
      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding pour obtenir l'adresse
      const detectedAddress = await reverseGeocode(latitude, longitude);
      
      // Sauvegarder la permission et la position
      localStorage.setItem('actoos_location_permission', 'granted');
      localStorage.setItem('actoos_user_location', JSON.stringify({
        lat: latitude,
        lng: longitude
      }));
      
      // Sélectionner cette adresse
      handleSelectAddress(detectedAddress);
      
      if (onRequestLocation) {
        onRequestLocation({ lat: latitude, lng: longitude });
      }
      
    } catch (error) {
      console.error('Geolocation error:', error);
      let errorMessage = 'Impossible d\'obtenir votre position';
      
      if (error.code === 1) {
        errorMessage = 'Vous avez refusé l\'accès à votre position. Activez la localisation dans les paramètres de votre navigateur.';
      } else if (error.code === 2) {
        errorMessage = 'Position indisponible. Vérifiez que le GPS est activé.';
      } else if (error.code === 3) {
        errorMessage = 'Délai dépassé. Réessayez.';
      }
      
      setLocatingError(errorMessage);
    } finally {
      setIsLocating(false);
    }
  };

  // Ajouter une nouvelle adresse
  const handleAddAddress = () => {
    if (!formAddress) return;
    
    const newAddress = {
      id: `addr_${Date.now()}`,
      type: formType,
      label: formLabel || ADDRESS_ICONS[formType]?.label || 'Adresse',
      address: formAddress,
      details: formDetails,
      createdAt: Date.now()
    };
    
    setSavedAddresses(prev => [...prev, newAddress]);
    resetForm();
    setShowAddForm(false);
  };

  // Modifier une adresse existante
  const handleUpdateAddress = () => {
    if (!editingAddress || !formAddress) return;
    
    setSavedAddresses(prev => 
      prev.map(addr => 
        addr.id === editingAddress.id 
          ? { 
              ...addr, 
              type: formType,
              label: formLabel || ADDRESS_ICONS[formType]?.label || 'Adresse',
              address: formAddress,
              details: formDetails
            }
          : addr
      )
    );
    
    resetForm();
    setEditingAddress(null);
  };

  // Supprimer une adresse
  const handleDeleteAddress = (addressId) => {
    setSavedAddresses(prev => prev.filter(addr => addr.id !== addressId));
  };

  // Commencer l'édition
  const startEdit = (addr) => {
    setEditingAddress(addr);
    setFormType(addr.type || 'other');
    setFormLabel(addr.label || '');
    setFormAddress(addr.address || '');
    setFormDetails(addr.details || '');
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormLabel('');
    setFormAddress('');
    setFormType('other');
    setFormDetails('');
    setEditingAddress(null);
  };

  // Check if GPS is available
  const hasLocationPermission = localStorage.getItem('actoos_location_permission') === 'granted';

  // Render add/edit form
  const renderAddressForm = () => (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
        </h3>
        <button
          onClick={() => {
            setShowAddForm(false);
            resetForm();
          }}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Type d'adresse */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Type d'adresse</p>
        <div className="flex gap-2">
          {Object.entries(ADDRESS_ICONS).map(([key, { icon: Icon, color, label }]) => (
            <button
              key={key}
              onClick={() => {
                setFormType(key);
                if (!formLabel || Object.values(ADDRESS_ICONS).some(i => i.label === formLabel)) {
                  setFormLabel(label);
                }
              }}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                formType === key 
                  ? 'border-[#FF5A00] bg-[#FF5A00]/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nom personnalisé */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de l'adresse
        </label>
        <input
          type="text"
          value={formLabel}
          onChange={(e) => setFormLabel(e.target.value)}
          placeholder="Ex: Maison de maman, Gym..."
          className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#FF5A00]"
        />
      </div>

      {/* Quartier / Zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quartier / Zone *
        </label>
        <select
          value={formAddress}
          onChange={(e) => setFormAddress(e.target.value)}
          className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
          data-testid="form-address-select"
        >
          <option value="">Sélectionner un quartier</option>
          {BAMAKO_NEIGHBORHOODS.map((n) => (
            <option key={n.id} value={`Bamako, ${n.name}`}>
              {n.name} ({n.commune})
            </option>
          ))}
        </select>
      </div>

      {/* Détails */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Détails (optionnel)
        </label>
        <input
          type="text"
          value={formDetails}
          onChange={(e) => setFormDetails(e.target.value)}
          placeholder="Ex: Près du marché, Portail bleu..."
          className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#FF5A00]"
        />
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => {
            setShowAddForm(false);
            resetForm();
          }}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium"
        >
          Annuler
        </button>
        <button
          onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
          disabled={!formAddress}
          className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
            formAddress 
              ? 'bg-[#FF5A00] text-white' 
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <Check className="w-5 h-5" />
          {editingAddress ? 'Modifier' : 'Ajouter'}
        </button>
      </div>
    </div>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={showAddForm ? null : "Adresse de livraison"}
    >
      <div className="flex flex-col max-h-[70vh]">
        {showAddForm ? (
          renderAddressForm()
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un quartier..."
                className="w-full bg-gray-100 rounded-2xl pl-12 pr-10 py-4 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                data-testid="address-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto -mx-4 px-4">
              {/* Search Results */}
              {searchQuery && filteredNeighborhoods.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Résultats
                  </p>
                  <div className="space-y-1">
                    {filteredNeighborhoods.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleSelectAddress(`Bamako, ${n.name}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        data-testid={`search-result-${n.id}`}
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{n.name}</p>
                          <p className="text-sm text-gray-500">{n.commune}, Bamako</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchQuery && filteredNeighborhoods.length === 0 && (
                <div className="text-center py-8 mb-6">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun quartier trouvé</p>
                  <p className="text-sm text-gray-400 mt-1">Essayez "Hamdallaye" ou "ACI"</p>
                </div>
              )}

              {/* Default Content (when no search) */}
              {!searchQuery && (
                <>
                  {/* Use Current Location */}
                  <button
                    onClick={handleUseLocation}
                    disabled={isLocating}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#FF5A00]/5 border border-[#FF5A00]/20 mb-4 active:bg-[#FF5A00]/10 transition-colors"
                    data-testid="use-location-btn"
                  >
                    <div className="w-12 h-12 bg-[#FF5A00] rounded-full flex items-center justify-center flex-shrink-0">
                      {isLocating ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Navigation className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-[#FF5A00]">
                        {isLocating ? 'Localisation en cours...' : 'Utiliser ma position'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isLocating ? 'Veuillez patienter' : 'Détection automatique GPS'}
                      </p>
                    </div>
                  </button>

                  {/* Change City/Country Button */}
                  <button
                    onClick={() => setShowCitySelector(!showCitySelector)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 mb-4 hover:bg-gray-50 transition-colors"
                    data-testid="change-city-btn"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Globe className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">Changer de ville/pays</p>
                      <p className="text-sm text-gray-500">
                        {currentCity || 'Bamako'}, {currentCountry?.name || 'Mali'} {currentCountry?.flag || '🇲🇱'}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showCitySelector ? 'rotate-90' : ''}`} />
                  </button>

                  {/* City Selector Expanded */}
                  {showCitySelector && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                      <CitySelector
                        currentCountry={currentCountry}
                        currentCity={currentCity}
                        onSelectLocation={(country, city) => {
                          onChangeLocation?.(country, city);
                          setShowCitySelector(false);
                        }}
                      />
                    </div>
                  )}

                  {/* Error message */}
                  {locatingError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-600">{locatingError}</p>
                    </div>
                  )}

                  {/* Add New Address Button */}
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-300 mb-4 hover:border-[#FF5A00] hover:bg-[#FF5A00]/5 transition-colors"
                    data-testid="add-new-address-btn"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Plus className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-700">Ajouter une adresse</p>
                      <p className="text-sm text-gray-400">Maison, bureau, ou autre...</p>
                    </div>
                  </button>

                  {/* Saved Addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Mes adresses
                      </p>
                      <div className="space-y-2">
                        {savedAddresses.map((saved) => {
                          const iconConfig = ADDRESS_ICONS[saved.type] || ADDRESS_ICONS.other;
                          const Icon = iconConfig.icon;
                          
                          return (
                            <div 
                              key={saved.id}
                              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                            >
                              <button
                                onClick={() => handleSelectAddress(saved.address)}
                                className="flex-1 flex items-center gap-3"
                                data-testid={`saved-address-${saved.id}`}
                              >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconConfig.color}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="font-medium text-gray-900">{saved.label}</p>
                                  <p className="text-sm text-gray-500">{saved.address}</p>
                                  {saved.details && (
                                    <p className="text-xs text-gray-400">{saved.details}</p>
                                  )}
                                </div>
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEdit(saved)}
                                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                                  data-testid={`edit-address-${saved.id}`}
                                >
                                  <Edit3 className="w-4 h-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAddress(saved.id)}
                                  className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100"
                                  data-testid={`delete-address-${saved.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent Addresses */}
                  {recentAddresses.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Récentes
                      </p>
                      <div className="space-y-1">
                        {recentAddresses.map((recent, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectAddress(recent.address)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                          >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Clock className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900">{recent.address}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Selection */}
                  {currentAddress && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Adresse actuelle
                      </p>
                      <div className="bg-[#FF5A00]/5 border border-[#FF5A00] rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF5A00] rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-medium text-gray-900">{currentAddress}</p>
                      </div>
                    </div>
                  )}

                  {/* Help Text */}
                  <p className="text-center text-sm text-gray-400 pb-4">
                    Tapez pour rechercher un quartier de Bamako
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
