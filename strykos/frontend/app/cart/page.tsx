'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal, itemCount, clearCart } = useCart();
  const { formatPrice } = useCurrency();

  if (itemCount === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={48} className="text-slate-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Votre panier est vide</h1>
        <p className="text-slate-500 mb-8">
          Découvrez notre sélection de maillots, chaussures et équipements.
        </p>
        <Link
          href="/c/maillots"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-800"
        >
          Voir les produits <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-8">
        Panier ({itemCount} article{itemCount > 1 ? 's' : ''})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste articles */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div
              key={item.variantId}
              className="flex gap-4 bg-white border border-slate-200 rounded-xl p-4"
            >
              <Link
                href={`/p/${item.productSlug}`}
                className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                    N/A
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                {item.brandName && (
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    {item.brandName}
                  </p>
                )}
                <Link
                  href={`/p/${item.productSlug}`}
                  className="font-medium text-sm hover:underline line-clamp-2"
                >
                  {item.productName}
                </Link>
                <p className="text-xs text-slate-500 mt-1">
                  {item.variantSize && `Taille ${item.variantSize}`}
                  {item.variantColor && ` · ${item.variantColor}`}
                </p>

                <div className="flex items-center justify-between mt-4">
                  <div className="inline-flex items-center border border-slate-300 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="p-2 hover:bg-slate-50"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="p-2 hover:bg-slate-50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="p-2 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-sm">
                  {formatPrice(item.unitPriceEur * item.quantity, 'EUR')}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-slate-400">
                    {formatPrice(item.unitPriceEur, 'EUR')} × {item.quantity}
                  </p>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={clearCart}
            className="text-xs text-slate-500 hover:text-red-600 underline"
          >
            Vider le panier
          </button>
        </div>

        {/* Récap */}
        <div className="lg:col-span-1">
          <div className="bg-slate-50 rounded-xl p-6 sticky top-24">
            <h2 className="font-bold mb-4">Récapitulatif</h2>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Sous-total</span>
                <span className="font-medium">{formatPrice(subtotal, 'EUR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Livraison</span>
                <span className="text-slate-400 text-xs">Calculée au checkout</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mb-6 flex justify-between items-baseline">
              <span className="font-bold">Total</span>
              <span className="font-black text-xl">{formatPrice(subtotal, 'EUR')}</span>
            </div>

            <Link
              href="/checkout"
              className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-semibold text-sm hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              Passer commande <ArrowRight size={16} />
            </Link>

            <Link
              href="/c/maillots"
              className="block text-center text-xs text-slate-500 hover:text-slate-900 mt-4"
            >
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}