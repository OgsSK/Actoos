import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  MapPin,
  Star,
  ChevronRight,
  Utensils,
  Pill,
  Tag
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

// Types de résultats
const RESULT_TYPES = {
  RESTAURANT: 'restaurant',
  PHARMACY: 'pharmacy',
  DISH: 'dish',
  PRODUCT: 'product',
  CATEGORY: 'category',
};

// Tendances populaires (sans pharmacie)
const TRENDING_SEARCHES = [
  'Poulet braisé',
  'Pizza',
  'Burgers',
  'Thieboudienne',
  'Shawarma',
];

export function SearchSheet({ 
  isOpen, 
  onClose, 
  restaurants = [], 
  pharmacies = [],
  onSelectRestaurant,
  onSelectPharmacy,
}) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('actoos_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    }
  }, [isOpen]);

  // Save search to recent
  const saveRecentSearch = (searchTerm) => {
    const newRecent = [
      searchTerm,
      ...recentSearches.filter(s => s.toLowerCase() !== searchTerm.toLowerCase())
    ].slice(0, 5);
    
    setRecentSearches(newRecent);
    localStorage.setItem('actoos_recent_searches', JSON.stringify(newRecent));
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('actoos_recent_searches');
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase().trim();
    const results = [];

    // Search in restaurants
    restaurants.forEach(restaurant => {
      // Match restaurant name
      if (restaurant.name.toLowerCase().includes(q)) {
        results.push({
          type: RESULT_TYPES.RESTAURANT,
          id: restaurant.id,
          name: restaurant.name,
          subtitle: restaurant.cuisine,
          image: restaurant.image,
          rating: restaurant.rating,
          data: restaurant,
        });
      }

      // Match dishes in menu categories
      restaurant.categories?.forEach(category => {
        // Match category name
        if (category.name.toLowerCase().includes(q)) {
          results.push({
            type: RESULT_TYPES.CATEGORY,
            id: `cat-${restaurant.id}-${category.id}`,
            name: category.name,
            subtitle: `Chez ${restaurant.name}`,
            restaurantId: restaurant.id,
            data: restaurant,
          });
        }

        // Match dishes
        category.items?.forEach(item => {
          if (item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)) {
            results.push({
              type: RESULT_TYPES.DISH,
              id: `dish-${item.id}`,
              name: item.name,
              subtitle: `${item.price?.toLocaleString()} FCFA • ${restaurant.name}`,
              image: item.image,
              price: item.price,
              restaurantId: restaurant.id,
              data: restaurant,
            });
          }
        });
      });
    });

    // Search in pharmacies
    pharmacies.forEach(pharmacy => {
      if (pharmacy.name.toLowerCase().includes(q)) {
        results.push({
          type: RESULT_TYPES.PHARMACY,
          id: pharmacy.id,
          name: pharmacy.name,
          subtitle: pharmacy.address,
          image: pharmacy.image,
          rating: pharmacy.rating,
          data: pharmacy,
        });
      }

      // Match products
      pharmacy.categories?.forEach(category => {
        category.items?.forEach(item => {
          if (item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)) {
            results.push({
              type: RESULT_TYPES.PRODUCT,
              id: `product-${item.id}`,
              name: item.name,
              subtitle: `${item.price?.toLocaleString()} FCFA • ${pharmacy.name}`,
              image: item.image,
              price: item.price,
              pharmacyId: pharmacy.id,
              data: pharmacy,
            });
          }
        });
      });
    });

    // Deduplicate and limit
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    }).slice(0, 15);
  }, [query, restaurants, pharmacies]);

  // Handle result click
  const handleResultClick = (result) => {
    saveRecentSearch(result.name);
    setQuery('');
    onClose();

    if (result.type === RESULT_TYPES.RESTAURANT || 
        result.type === RESULT_TYPES.DISH || 
        result.type === RESULT_TYPES.CATEGORY) {
      onSelectRestaurant?.(result.data);
    } else if (result.type === RESULT_TYPES.PHARMACY || 
               result.type === RESULT_TYPES.PRODUCT) {
      onSelectPharmacy?.(result.data);
    }
  };

  // Handle recent/trending click
  const handleQuickSearch = (term) => {
    setQuery(term);
    saveRecentSearch(term);
  };

  // Get icon for result type
  const getResultIcon = (type) => {
    switch (type) {
      case RESULT_TYPES.RESTAURANT:
        return <Utensils className="w-5 h-5 text-[#FF5A00]" />;
      case RESULT_TYPES.PHARMACY:
        return <Pill className="w-5 h-5 text-green-600" />;
      case RESULT_TYPES.DISH:
      case RESULT_TYPES.PRODUCT:
        return <Tag className="w-5 h-5 text-gray-500" />;
      case RESULT_TYPES.CATEGORY:
        return <Tag className="w-5 h-5 text-purple-500" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title="Rechercher"
      fullHeight={false}
    >
      <div className="flex flex-col">
        {/* Search Input */}
        <div className="relative mb-4 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Restaurant, plat..."
            className="w-full bg-gray-100 rounded-2xl pl-12 pr-10 py-4 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#FF5A00]"
            data-testid="search-input"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto -mx-4 px-4">
          {/* Search Results */}
          {query && searchResults.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Résultats ({searchResults.length})
              </p>
              <div className="space-y-1">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    data-testid={`search-result-${result.id}`}
                  >
                    {result.image ? (
                      <div 
                        className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0"
                        style={{
                          backgroundImage: `url(${result.image})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {getResultIcon(result.type)}
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.name}</p>
                      <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                    </div>
                    {result.rating && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span>{result.rating}</span>
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {query && searchResults.length === 0 && (
            <div className="text-center py-8 mb-6">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun résultat pour "{query}"</p>
              <p className="text-sm text-gray-400 mt-1">Essayez un autre terme</p>
            </div>
          )}

          {/* Default Content (when no search) */}
          {!query && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Recherches récentes
                    </p>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-[#FF5A00] font-medium"
                    >
                      Effacer
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickSearch(term)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 active:bg-gray-200 transition-colors"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Tendances
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickSearch(term)}
                      className="px-4 py-2 bg-[#FF5A00]/10 text-[#FF5A00] rounded-full text-sm font-medium active:bg-[#FF5A00]/20 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Help Text */}
              <p className="text-center text-sm text-gray-400 pb-4">
                Recherchez un restaurant ou un plat
              </p>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
