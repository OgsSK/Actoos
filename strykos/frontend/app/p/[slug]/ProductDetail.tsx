'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Check, AlertCircle, Heart } from 'lucide-react';
import { useCart } from '@/app/context/CartContext';
import { formatPrice } from '@/lib/format';
import { useFavorites } from '@/app/context/FavoritesContext';

interface Variant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price_eur: number;
  price_xof: number;
  stock: number;
}

interface MediaItem {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    productType: string | null;
    surface: string | null;
    audience: string | null;
    brand: { id: string; slug: string; name: string } | null;
    category: { slug: string; name: string } | null;
    variants: Variant[];
    media: MediaItem[];
    minPrice: number;
    mainImage: string | null;
  };
}

export default function ProductDetail({ product }: Props) {
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const isFav = isFavorite(product.id);

  const [selectedImage, setSelectedImage] = useState<string | null>(product.mainImage);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.length === 1 ? product.variants[0].id : null
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
  const availableStock = selectedVariant?.stock || 0;

  const handleAddToCart = () => {
    setError('');
    if (!selectedVariant) {
      setError('Veuillez sélectionner une taille');
      return;
    }
    if (availableStock < quantity) {
      setError('Stock insuffisant');
      return;
    }

    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      brandName: product.brand?.name || null,
      variantSize: selectedVariant.size,
      variantColor: selectedVariant.color,
      sku: selectedVariant.sku,
      imageUrl: selectedImage,
      unitPriceEur: selectedVariant.price_eur,
      quantity,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const displayPrice = selectedVariant
    ? selectedVariant.price_eur
    : product.minPrice;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Galerie */}
        <div>
          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden mb-4">
            {selectedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                Pas d'image
              </div>
            )}
          </div>

          {product.media.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.media.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedImage(m.url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === m.url ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bloc achat */}
        <div>
          {product.brand && (
            <Link
              href={`/brand/${product.brand.slug}`}
              className="text-xs uppercase tracking-wider text-slate-400 hover:text-slate-900 font-medium"
            >
              {product.brand.name}
            </Link>
          )}
                    <div className="flex items-start justify-between gap-4 mt-2 mb-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex-1">
              {product.name}
            </h1>
            <button
              onClick={() =>
                toggleFavorite({
                  productId: product.id,
                  productSlug: product.slug,
                  productName: product.name,
                  brandName: product.brand?.name || null,
                  imageUrl: selectedImage,
                  priceEur: product.minPrice,
                })
              }
              aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                isFav
                  ? 'bg-rose-500 border-rose-500 text-white'
                  : 'bg-white border-slate-300 text-slate-500 hover:border-rose-400 hover:text-rose-500'
              }`}
            >
              <Heart size={20} className={isFav ? 'fill-white' : ''} />
            </button>
          </div>
          {product.shortDescription && (
            <p className="text-sm text-slate-500 mb-6">{product.shortDescription}</p>
          )}

          {/* Prix */}
          <div className="mb-6">
            <p className="text-3xl font-black">
              {displayPrice > 0 ? formatPrice(displayPrice, 'EUR') : 'Prix sur demande'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Soit environ {formatPrice(selectedVariant?.price_xof || 0, 'XOF')}
            </p>
          </div>

          {/* Badge authenticité */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-medium mb-6">
            <Check size={14} />
            Authenticité vérifiée — provenance documentée
          </div>

          {/* Sélecteur de taille */}
          {product.variants.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">
                  {product.productType === 'shoes' ? 'Pointure' : 'Taille'}
                </p>
                {selectedVariant && (
                  <p className="text-xs text-slate-500">
                    Stock : {availableStock}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {product.variants.map(v => {
                  const isSelected = v.id === selectedVariantId;
                  const outOfStock = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !outOfStock && setSelectedVariantId(v.id)}
                      disabled={outOfStock}
                      className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : outOfStock
                          ? 'border-slate-200 text-slate-300 line-through cursor-not-allowed'
                          : 'border-slate-300 hover:border-slate-900'
                      }`}
                    >
                      {v.size || v.sku}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantité */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-3">Quantité</p>
            <div className="inline-flex items-center border border-slate-300 rounded-lg">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="p-3 hover:bg-slate-50 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(availableStock || 10, q + 1))}
                className="p-3 hover:bg-slate-50 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleAddToCart}
            disabled={!selectedVariant || availableStock <= 0}
            className={`w-full py-4 rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              added
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {added ? (
              <>
                <Check size={18} /> Ajouté au panier
              </>
            ) : (
              <>
                <ShoppingBag size={18} /> Ajouter au panier
              </>
            )}
          </button>

          {/* Description */}
          {product.description && (
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3">
                Description
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}