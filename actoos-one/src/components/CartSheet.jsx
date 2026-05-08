/**
 * ACTOOS ONE - Cart Sheet
 * 
 * Panier style Uber Eats / Deliveroo
 * - Affiche les articles du panier
 * - Permet de modifier les quantités
 * - Permet de supprimer des articles
 * - Bouton pour passer au checkout
 */

import { useState } from 'react';
import { 
  X, 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingBag,
  ChevronRight,
  MapPin,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export function CartSheet({ isOpen, onClose, onCheckout, restaurant }) {
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getTotal, 
    getItemCount,
    clearCart 
  } = useCart();
  
  const [removingId, setRemovingId] = useState(null);
  
  const itemCount = getItemCount();
  const subtotal = getTotal();
  
  // Animation pour supprimer
  const handleRemove = (itemId) => {
    setRemovingId(itemId);
    setTimeout(() => {
      removeFromCart(itemId);
      setRemovingId(null);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#FF5A00]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Votre panier</h2>
              <p className="text-sm text-gray-500">{itemCount} article{itemCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            data-testid="close-cart-btn"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Restaurant Info */}
        {restaurant && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {restaurant.image && (
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{restaurant.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{restaurant.deliveryTime || '30-45 min'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {itemCount === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Votre panier est vide</p>
              <p className="text-sm text-gray-400 mt-1">Ajoutez des articles pour commencer</p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-3 bg-[#FF5A00] text-white font-semibold rounded-xl"
              >
                Parcourir les restaurants
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white border border-gray-100 rounded-2xl p-4 transition-all duration-300 ${
                    removingId === item.id ? 'opacity-0 scale-95 -translate-x-full' : ''
                  }`}
                  data-testid={`cart-item-${item.id}`}
                >
                  <div className="flex gap-4">
                    {/* Item Image */}
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    )}
                    
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          {item.options && item.options.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.options.map(o => o.name).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 italic">"{item.notes}"</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          data-testid={`remove-item-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Price & Quantity */}
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-bold text-[#FF5A00]">
                          {((item.price_at_time || item.price || 0) * (item.quantity || 1)).toLocaleString()} FCFA
                        </p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                          <button
                            onClick={() => {
                              if (item.quantity === 1) {
                                handleRemove(item.id);
                              } else {
                                updateQuantity(item.id, item.quantity - 1);
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm active:scale-95 transition-transform"
                            data-testid={`decrease-${item.id}`}
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            ) : (
                              <Minus className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm active:scale-95 transition-transform"
                            data-testid={`increase-${item.id}`}
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add More Items */}
              <button
                onClick={onClose}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:border-[#FF5A00] hover:text-[#FF5A00] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Ajouter d'autres articles
              </button>
            </div>
          )}
        </div>

        {/* Footer with Total & Checkout */}
        {itemCount > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 pb-safe">
            {/* Order Summary */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total</span>
                <span className="font-medium text-gray-900">{subtotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Frais de livraison</span>
                <span className="text-gray-400">Calculé au checkout</span>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              className="w-full bg-[#FF5A00] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-orange-500/30"
              data-testid="checkout-btn"
            >
              <span>Commander</span>
              <span className="bg-white/20 px-3 py-1 rounded-lg">
                {subtotal.toLocaleString()} FCFA
              </span>
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Minimum Order Warning */}
            {subtotal < 1500 && (
              <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Commande minimum: 1,500 FCFA</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}

export default CartSheet;
