'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { useFavorites } from '@/app/context/FavoritesContext';
import { formatPrice } from '@/lib/format';

export default function FavoritesPage() {
  const { items, removeFavorite, clearFavorites, count } = useFavorites();

  if (count === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Heart size={48} className="text-slate-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Aucun favori</h1>
        <p className="text-slate-500 mb-8">
          Ajoutez des produits à vos favoris pour les retrouver facilement.
        </p>
        <Link
          href="/c/maillots"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-800"
        >
          Découvrir les produits <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          Mes favoris ({count})
        </h1>
        <button
          onClick={clearFavorites}
          className="text-xs text-slate-500 hover:text-red-600 underline"
        >
          Tout supprimer
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map(item => (
          <div key={item.productId} className="group relative">
            <Link
              href={`/p/${item.productSlug}`}
              className="block"
            >
              <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-3">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                    Pas d'image
                  </div>
                )}
              </div>
              {item.brandName && (
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                  {item.brandName}
                </p>
              )}
              <h3 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:underline">
                {item.productName}
              </h3>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {item.priceEur > 0 ? formatPrice(item.priceEur, 'EUR') : 'Prix sur demande'}
              </p>
            </Link>

            <button
              onClick={() => removeFavorite(item.productId)}
              aria-label="Retirer des favoris"
              className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center bg-white/95 border border-white/40 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-200"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}