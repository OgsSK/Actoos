'use client';

import Link from 'next/link';
import { useCurrency } from '../context/CurrencyContext';
import FavoriteButton from './FavoriteButton';

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    brandName: string | null;
    imageUrl: string | null;
    priceEur: number;
    badge?: string;
  };
}

export default function ProductCard({ product }: Props) {
  const { formatPrice } = useCurrency();

  return (
    <Link href={`/p/${product.slug}`} className="group block">
      <div className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden mb-3">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
            Pas d'image
          </div>
        )}

        {product.badge && (
          <span className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            {product.badge}
          </span>
        )}

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <FavoriteButton
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              brandName: product.brandName,
              imageUrl: product.imageUrl,
              priceEur: product.priceEur,
            }}
          />
        </div>
      </div>

      {product.brandName && (
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
          {product.brandName}
        </p>
      )}
      <h3 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:underline">
        {product.name}
      </h3>
      <p className="text-sm font-bold text-slate-900 mt-1">
        {product.priceEur > 0
          ? formatPrice(product.priceEur, 'EUR')
          : 'Prix sur demande'}
      </p>
    </Link>
  );
}