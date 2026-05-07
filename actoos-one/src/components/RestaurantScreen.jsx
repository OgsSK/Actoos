import { useState } from 'react';
import { ArrowLeft, Star, Clock, Bike, ShoppingBag } from 'lucide-react';
import { MenuItem } from './MenuItem';
import { AddToCartSheet } from './AddToCartSheet';
import { useCart } from '../context/CartContext';
import { systemConfig } from '../data/mockData';

export function RestaurantScreen({ restaurant, onBack, onCheckout }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const { getItemCount, getTotal } = useCart();

  const itemCount = getItemCount();
  const total = getTotal();

  return (
    <div className="min-h-screen bg-gray-50 pb-32" data-testid="restaurant-screen">
      {/* Header avec image */}
      <div className="relative">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>

        {/* Info restaurant */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white" data-testid="restaurant-title">
            {restaurant.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>{restaurant.rating}</span>
            </div>
            <span>•</span>
            <span>{restaurant.cuisine}</span>
          </div>
        </div>
      </div>

      {/* Info livraison */}
      <div className="bg-white px-4 py-3 flex items-center gap-4 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-primary" />
          <span>{restaurant.deliveryTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Bike className="w-4 h-4 text-primary" />
          <span>{restaurant.deliveryFee} {systemConfig.currency} livraison</span>
        </div>
      </div>

      {/* Menu par catégories */}
      <div className="px-4 py-4">
        {restaurant.categories.map((category) => (
          <div key={category.id} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3" data-testid={`category-${category.id}`}>
              {category.name}
            </h2>
            <div className="space-y-3">
              {category.items.map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sheet ajout panier */}
      <AddToCartSheet
        isOpen={!!selectedItem}
        item={selectedItem}
        restaurant={restaurant}
        onClose={() => setSelectedItem(null)}
      />

      {/* Barre panier fixe */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg" data-testid="cart-bar">
          <button
            onClick={onCheckout}
            className="w-full bg-primary text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-between active:bg-primary/90 transition-colors"
            data-testid="view-cart-btn"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{itemCount} article{itemCount > 1 ? 's' : ''}</span>
            </div>
            <span className="text-lg">{total.toLocaleString()} {systemConfig.currency}</span>
          </button>
        </div>
      )}
    </div>
  );
}
