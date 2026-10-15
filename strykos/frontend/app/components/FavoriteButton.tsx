'use client';

import { Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    brandName: string | null;
    imageUrl: string | null;
    priceEur: number;
  };
  className?: string;
  size?: number;
}

export default function FavoriteButton({ product, className = '', size = 18 }: Props) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const isFav = isFavorite(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      brandName: product.brandName,
      imageUrl: product.imageUrl,
      priceEur: product.priceEur,
    });
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all duration-200 ${
        isFav
          ? 'bg-rose-500 border-rose-500 text-white'
          : 'bg-white/95 border-white/40 text-slate-700 hover:border-rose-300 hover:text-rose-500'
      } ${className}`}
    >
      <Heart size={size} className={isFav ? 'fill-white' : ''} strokeWidth={2.2} />
    </button>
  );
}