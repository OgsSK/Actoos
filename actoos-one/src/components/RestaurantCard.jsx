import { Star, Clock, Bike, Tag, Heart } from 'lucide-react';
import { useLazyImage } from '../hooks/useLazyImage';
import { systemConfig } from '../data/mockData';
import { getRestaurantPromotions } from '../data/promotionsData';
import { useFavorites } from '../context/FavoritesContext';

export function RestaurantCard({ restaurant, onClick }) {
  const { imgRef, isLoaded, isInView } = useLazyImage(restaurant.image);
  const promos = getRestaurantPromotions(restaurant.id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(restaurant.id);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(restaurant);
  };

  return (
    <button
      onClick={() => onClick(restaurant)}
      className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
      data-testid={`restaurant-card-${restaurant.id}`}
    >
      {/* Image Container */}
      <div ref={imgRef} className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
        {isInView && (
          <>
            {!isLoaded && <div className="absolute inset-0 skeleton" />}
            <img
              src={restaurant.image}
              alt={restaurant.name}
              className={`w-full h-full object-cover lazy ${isLoaded ? 'loaded' : ''}`}
              loading="lazy"
            />
          </>
        )}
        
        {/* Promo Badge */}
        {promos.length > 0 && restaurant.isOpen && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full flex items-center gap-1 ${
            promos[0].badge_color === 'green' ? 'bg-green-500' :
            promos[0].badge_color === 'purple' ? 'bg-purple-500' :
            'bg-[#FF5A00]'
          }`}>
            <Tag className="w-3 h-3 text-white" />
            <span className="text-xs font-semibold text-white">{promos[0].badge}</span>
          </div>
        )}
        
        {/* Featured Badge - only if no promo */}
        {restaurant.isFeatured && promos.length === 0 && (
          <div className="absolute top-3 left-3 bg-primary px-2.5 py-1 rounded-full">
            <span className="text-xs font-semibold text-white">Populaire</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            isFav 
              ? 'bg-red-500 text-white' 
              : 'bg-white/90 text-gray-600 backdrop-blur-sm shadow-md'
          }`}
          data-testid={`favorite-btn-${restaurant.id}`}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
        </button>
        
        {/* Closed Overlay */}
        {!restaurant.isOpen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-medium text-sm bg-gray-900/80 px-3 py-1.5 rounded-full">
              Fermé
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-left truncate" data-testid="restaurant-name">
              {restaurant.name}
            </h3>
            <p className="text-xs text-gray-500 text-left mt-0.5">
              {restaurant.cuisine} • {restaurant.distance}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium text-gray-700">{restaurant.rating}</span>
          </div>
        </div>

        {/* Promo text */}
        {promos.length > 0 && restaurant.isOpen && (
          <p className="text-xs text-[#FF5A00] font-medium mt-1.5 text-left">
            {promos[0].title}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{restaurant.deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bike className="w-3.5 h-3.5" />
            <span>{promos.some(p => p.discount_type === 'free_delivery') 
              ? <span className="text-green-600 font-medium">Gratuit</span>
              : `${restaurant.deliveryFee} ${systemConfig.currency}`
            }</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100" data-testid="restaurant-skeleton">
      <div className="aspect-[16/10] skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-5 w-3/4 skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
        <div className="h-3 w-2/3 skeleton rounded mt-2" />
      </div>
    </div>
  );
}
