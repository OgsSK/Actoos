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
  Trash2
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { BAMAKO_NEIGHBORHOODS } from '../data/locationData';

// Clé localStorage pour les adresses sauvegardées
const SAVED_ADDRESSES_KEY = 'actoos_saved_addresses';

// Adresses par défaut
const DEFAULT_SAVED_ADDRESSES = [
  { id: 'home', type: 'home', label: 'Maison', address: null },
  { id: 'work', type: 'work', label: 'Bureau', address: null },
];

export function AddressSheet({ 
  isOpen, 
  onClose, 
  currentAddress,
  onSelectAddress,
  userLocation,
  onRequestLocation 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentAddresses, setRecentAddresses] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [editAddressValue, setEditAddressValue] = useState('');
  
  // Charger les adresses sauvegardées depuis localStorage
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const stored = localStorage.getItem(SAVED_ADDRESSES_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_SAVED_ADDRESSES;
    } catch {
      return DEFAULT_SAVED_ADDRESSES;
    }
  });

  // Sauvegarder les adresses dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(savedAddresses));
    } catch (e) {
      console.warn('Erreur sauvegarde adresses:', e);
    }
  }, [savedAddresses]);

  // Load recent addresses from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('actoos_recent_addresses');
    if (stored) {
      setRecentAddresses(JSON.parse(stored));
    }
  }, [isOpen]);

  // Filter neighborhoods based on search
  const filteredNeighborhoods = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    return BAMAKO_NEIGHBORHOODS
      .filter(n => 
        n.name.toLowerCase().includes(query) ||
        n.commune.toLowerCase().includes(query)
      )
      .slice(0, 6); // Max 6 results
  }, [searchQuery]);

  // Handle address selection
  const handleSelectAddress = (address) => {
    // Add to recent addresses
    const newRecent = [
      { address, timestamp: Date.now() },
      ...recentAddresses.filter(r => r.address !== address)
    ].slice(0, 3); // Keep last 3
    
    setRecentAddresses(newRecent);
    localStorage.setItem('actoos_recent_addresses', JSON.stringify(newRecent));
    
    onSelectAddress(address);
    setSearchQuery('');
    onClose();
  };

  // Handle "Use my location"
  const handleUseLocation = async () => {
    setIsLocating(true);
    
    try {
      if (onRequestLocation) {
        await onRequestLocation();
      }
      // If location is available, it will update via props
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Sauvegarder une adresse (Maison ou Bureau)
  const handleSaveAddress = (addressId, newAddress) => {
    setSavedAddresses(prev => 
      prev.map(addr => 
        addr.id === addressId 
          ? { ...addr, address: newAddress }
          : addr
      )
    );
    setEditingAddress(null);
    setEditAddressValue('');
  };

  // Supprimer une adresse sauvegardée
  const handleRemoveAddress = (addressId) => {
    setSavedAddresses(prev => 
      prev.map(addr => 
        addr.id === addressId 
          ? { ...addr, address: null }
          : addr
      )
    );
  };

  // Commencer l'édition d'une adresse
  const startEditAddress = (addressId, currentAddr) => {
    setEditingAddress(addressId);
    setEditAddressValue(currentAddr || '');
  };

  // Check if GPS is available
  const hasLocationPermission = localStorage.getItem('actoos_location_permission') === 'granted';

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Adresse de livraison"
    >
      <div className="flex flex-col max-h-[70vh]">
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
            autoFocus
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
                <div className="w-10 h-10 bg-[#FF5A00] rounded-full flex items-center justify-center flex-shrink-0">
                  {isLocating ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-[#FF5A00]">
                    {isLocating ? 'Localisation...' : 'Utiliser ma position'}
                  </p>
                  {hasLocationPermission && userLocation && (
                    <p className="text-sm text-gray-500">Position GPS disponible</p>
                  )}
                  {!hasLocationPermission && (
                    <p className="text-sm text-gray-500">Activer la géolocalisation</p>
                  )}
                </div>
              </button>

              {/* Saved Addresses */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Adresses enregistrées
                </p>
                <div className="space-y-2">
                  {savedAddresses.map((saved) => (
                    <div key={saved.id}>
                      {editingAddress === saved.id ? (
                        /* Mode édition */
                        <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              saved.type === 'home' ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                              {saved.type === 'home' ? (
                                <Home className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Briefcase className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                            <span className="font-medium text-gray-900">{saved.label}</span>
                          </div>
                          <select
                            value={editAddressValue}
                            onChange={(e) => setEditAddressValue(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                            data-testid={`edit-address-select-${saved.id}`}
                          >
                            <option value="">Sélectionner un quartier</option>
                            {BAMAKO_NEIGHBORHOODS.map((n) => (
                              <option key={n.id} value={`Bamako, ${n.name}`}>
                                {n.name} ({n.commune})
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveAddress(saved.id, editAddressValue)}
                              disabled={!editAddressValue}
                              className={`flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 ${
                                editAddressValue 
                                  ? 'bg-[#FF5A00] text-white active:bg-[#E55100]' 
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                              data-testid={`save-address-btn-${saved.id}`}
                            >
                              <Check className="w-4 h-4" />
                              Enregistrer
                            </button>
                            <button
                              onClick={() => {
                                setEditingAddress(null);
                                setEditAddressValue('');
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium active:bg-gray-300"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Mode normal */
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <button
                            onClick={() => saved.address ? handleSelectAddress(saved.address) : startEditAddress(saved.id, saved.address)}
                            className="flex-1 flex items-center gap-3"
                            data-testid={`saved-address-${saved.id}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              saved.type === 'home' ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                              {saved.type === 'home' ? (
                                <Home className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Briefcase className="w-5 h-5 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900">{saved.label}</p>
                              {saved.address ? (
                                <p className="text-sm text-gray-500">{saved.address}</p>
                              ) : (
                                <p className="text-sm text-[#FF5A00] flex items-center gap-1">
                                  <Plus className="w-3 h-3" />
                                  Ajouter une adresse
                                </p>
                              )}
                            </div>
                          </button>
                          {saved.address && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditAddress(saved.id, saved.address)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                                data-testid={`edit-address-btn-${saved.id}`}
                              >
                                <Edit3 className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleRemoveAddress(saved.id)}
                                className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:bg-red-100"
                                data-testid={`remove-address-btn-${saved.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
      </div>
    </BottomSheet>
  );
}
