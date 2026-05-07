import { Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export function FavoriteButton({ partner, size = 'md', className = '' }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(partner.id);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(partner);
      }}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all active:scale-95 ${
        isFav 
          ? 'bg-red-500 text-white' 
          : 'bg-white/90 text-gray-600 backdrop-blur-sm shadow-md'
      } ${className}`}
      data-testid={`favorite-btn-${partner.id}`}
      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart 
        className={`${iconSizes[size]} transition-all ${isFav ? 'fill-white' : ''}`} 
      />
    </button>
  );
}
