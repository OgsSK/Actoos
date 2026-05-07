import { useState } from 'react';
import { 
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  Star,
  Phone,
  Truck,
  FileText,
  Heart
} from 'lucide-react';
import { pharmacies, healthCategories } from '../data/healthData';
import { useLazyImage } from '../hooks/useLazyImage';

function PharmacyCard({ pharmacy, onClick }) {
  const { imageSrc, isLoaded } = useLazyImage(pharmacy.image);

  const typeLabels = {
    pharmacy: 'Pharmacie',
    laboratory: 'Laboratoire',
    clinic: 'Clinique',
  };

  const typeColors = {
    pharmacy: 'bg-green-100 text-green-700',
    laboratory: 'bg-blue-100 text-blue-700',
    clinic: 'bg-purple-100 text-purple-700',
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 text-left active:scale-[0.98] transition-transform"
      data-testid={`pharmacy-card-${pharmacy.id}`}
    >
      <div className="relative h-36">
        <div
          className={`w-full h-full bg-gray-200 ${isLoaded ? '' : 'animate-pulse'}`}
          style={{
            backgroundImage: isLoaded ? `url(${imageSrc})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[pharmacy.type]}`}>
            {typeLabels[pharmacy.type]}
          </span>
          {pharmacy.isFeatured && (
            <span className="bg-primary text-white px-2 py-1 rounded-full text-xs font-medium">
              Recommandé
            </span>
          )}
        </div>

        {/* Open/Closed status */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            pharmacy.isOpen ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
          }`}>
            {pharmacy.isOpen ? 'Ouvert' : 'Fermé'}
          </span>
        </div>

        {/* 24h badge */}
        {pharmacy.openHours === '24h/24' && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-primary text-white px-2 py-1 rounded-full text-xs font-bold">
              24h/24
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg">{pharmacy.name}</h3>
        
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{pharmacy.address}</span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-gray-900">{pharmacy.rating}</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">{pharmacy.distance}</span>
          </div>

          {pharmacy.delivery_available && (
            <div className="flex items-center gap-1 text-primary text-sm">
              <Truck className="w-4 h-4" />
              <span>{pharmacy.deliveryTime}</span>
            </div>
          )}
        </div>

        {pharmacy.accepts_ordonnance && (
          <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
            <FileText className="w-4 h-4" />
            <span>Accepte les ordonnances</span>
          </div>
        )}
      </div>
    </button>
  );
}

export function HealthScreen({ onBack, onPharmacyClick }) {
  const [activeCategory, setActiveCategory] = useState('health-cat-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter pharmacies
  const filteredPharmacies = pharmacies.filter(p => {
    // Category filter
    if (activeCategory === 'health-cat-2' && p.type !== 'pharmacy') return false;
    if (activeCategory === 'health-cat-3' && p.type !== 'laboratory') return false;
    if (activeCategory === 'health-cat-4' && p.type !== 'clinic') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(query) || 
             p.address.toLowerCase().includes(query);
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="health-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
              data-testid="health-back-btn"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-500" />
                ACTOOS Health
              </h1>
              <p className="text-xs text-gray-500">Pharmacies, labos et cliniques</p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une pharmacie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl pl-12 pr-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary"
              data-testid="health-search"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {healthCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
                data-testid={`health-cat-${cat.id}`}
              >
                <span>{cat.icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {filteredPharmacies.length} établissement{filteredPharmacies.length > 1 ? 's' : ''} trouvé{filteredPharmacies.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-400">Bamako, Mali</p>
        </div>

        {/* Pharmacy List */}
        {filteredPharmacies.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun établissement trouvé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPharmacies.map((pharmacy) => (
              <PharmacyCard
                key={pharmacy.id}
                pharmacy={pharmacy}
                onClick={() => onPharmacyClick(pharmacy)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
