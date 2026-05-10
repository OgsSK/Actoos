/**
 * ACTOOS ONE - Baskets Screen (Style Deliveroo)
 * 
 * Affiche tous les paniers de restaurants différents
 * Le client peut avoir plusieurs paniers mais commande un à la fois
 */

import { useState } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  Clock,
  ShoppingBag,
  ChevronRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { systemConfig } from '../data/mockData';

export function BasketsScreen({ onBack, onViewRestaurant, onViewBasket }) {
  const { getAllCarts, clearCart } = useCart();
  const [deletingId, setDeletingId] = useState(null);
  
  const baskets = getAllCarts();

  const handleDelete = (restaurantId) => {
    setDeletingId(restaurantId);
    setTimeout(() => {
      clearCart(restaurantId);
      setDeletingId(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="baskets-screen">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          data-testid="baskets-back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mes Paniers</h1>
          <p className="text-sm text-gray-500">
            {baskets.length} panier{baskets.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Baskets List */}
      <div className="p-4 space-y-4">
        {baskets.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Aucun panier</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajoutez des articles depuis les restaurants
            </p>
          </div>
        ) : (
          baskets.map((basket) => {
            const isDeleting = deletingId === basket.restaurantId;
            
            return (
              <div
                key={basket.restaurantId}
                className={`bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 ${
                  isDeleting ? 'opacity-0 scale-95' : ''
                }`}
                data-testid={`basket-${basket.restaurantId}`}
              >
                {/* Restaurant Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {basket.restaurant?.name || 'Restaurant'}
                      </h3>
                      
                      {/* Items preview - petites images */}
                      <div className="flex items-center gap-2 mt-3">
                        {basket.items.slice(0, 3).map((item, idx) => (
                          <div 
                            key={idx}
                            className="relative"
                          >
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm">
                                <ShoppingBag className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            {item.quantity > 1 && (
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FF5A00] text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {item.quantity}
                              </span>
                            )}
                          </div>
                        ))}
                        {basket.items.length > 3 && (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-medium">
                            +{basket.items.length - 3}
                          </div>
                        )}
                      </div>
                      
                      {/* Price & Items count */}
                      <div className="flex items-center gap-2 mt-3 text-sm">
                        <span className="font-bold text-[#FF5A00]">
                          {basket.total.toLocaleString()} {systemConfig.currency}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">
                          {basket.itemCount} article{basket.itemCount > 1 ? 's' : ''}
                        </span>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{basket.restaurant?.deliveryTime || '30-45 min'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(basket.restaurantId)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      data-testid={`delete-basket-${basket.restaurantId}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => onViewRestaurant && onViewRestaurant(basket.restaurant)}
                    className="flex-1 py-4 text-[#FF5A00] font-semibold border-r border-gray-100 hover:bg-gray-50 transition-colors"
                    data-testid={`view-restaurant-${basket.restaurantId}`}
                  >
                    Voir le restaurant
                  </button>
                  <button
                    onClick={() => onViewBasket && onViewBasket(basket.restaurantId, basket.restaurant)}
                    className="flex-1 py-4 bg-[#FF5A00] text-white font-semibold hover:bg-[#E55100] transition-colors flex items-center justify-center gap-2"
                    data-testid={`view-basket-${basket.restaurantId}`}
                  >
                    Voir le panier
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Info */}
      {baskets.length > 0 && (
        <div className="px-4 pb-8">
          <p className="text-sm text-gray-400 text-center">
            Vous pouvez commander un panier à la fois
          </p>
        </div>
      )}
    </div>
  );
}

export default BasketsScreen;
