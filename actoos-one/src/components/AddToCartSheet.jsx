import { useState, useEffect } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { systemConfig } from '../data/mockData';

export function AddToCartSheet({ isOpen, item, restaurant, onClose, canOrder = true }) {
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const { addToCart } = useCart();

  // Reset quand on ouvre avec un nouvel item
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setInstructions('');
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const total = item.price * quantity;
  const canIncrease = quantity < item.max_per_order;
  const canDecrease = quantity > 1;

  // Vérifier si on peut commander
  const isRestaurantOpen = restaurant?.isOpen !== false;
  const acceptsWhenClosed = restaurant?.acceptOrdersWhenClosed || restaurant?.accepts_orders_when_closed;
  const orderAllowed = canOrder && (isRestaurantOpen || acceptsWhenClosed);

  // Ajouter au panier du restaurant (multi-panier comme Deliveroo)
  const handleAdd = () => {
    if (!orderAllowed) return;
    
    // Ajouter directement - le système supporte les paniers multiples
    const success = addToCart(item, quantity, instructions, restaurant);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60]" data-testid="add-to-cart-sheet">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl bottom-sheet-enter safe-area-bottom max-h-[85vh] overflow-hidden flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-4">
          {/* Header avec image */}
          <div className="relative mb-4">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-40 object-cover rounded-2xl"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
              data-testid="close-sheet-btn"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Info produit */}
          <h2 className="text-xl font-bold text-gray-900" data-testid="item-title">
            {item.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {item.description}
          </p>
          <p className="text-lg font-semibold text-primary mt-2">
            {item.price.toLocaleString()} {systemConfig.currency}
          </p>

          {/* Sélecteur de quantité */}
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-700">Quantité</label>
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => canDecrease && setQuantity(q => q - 1)}
                disabled={!canDecrease}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  canDecrease
                    ? 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
                data-testid="quantity-decrease"
              >
                <Minus className="w-5 h-5" />
              </button>
              
              <span className="text-2xl font-semibold text-gray-900 w-12 text-center" data-testid="quantity-value">
                {quantity}
              </span>
              
              <button
                onClick={() => canIncrease && setQuantity(q => q + 1)}
                disabled={!canIncrease}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  canIncrease
                    ? 'bg-primary text-white active:bg-primary/90'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
                data-testid="quantity-increase"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {!canIncrease && (
              <p className="text-xs text-gray-400 mt-1">
                Maximum {item.max_per_order} par commande
              </p>
            )}
          </div>

          {/* Instructions spéciales */}
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-700">
              Instructions au cuisinier
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex : Sans oignons, bien cuit..."
              className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              data-testid="instructions-input"
            />
          </div>
        </div>

        {/* Footer fixe avec bouton */}
        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
          {orderAllowed ? (
            <button
              onClick={handleAdd}
              className="w-full bg-primary text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 active:bg-primary/90 transition-colors"
              data-testid="add-to-cart-btn"
            >
              <span>AJOUTER AU PANIER</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {total.toLocaleString()} {systemConfig.currency}
              </span>
            </button>
          ) : (
            <div className="text-center">
              <div className="bg-gray-100 text-gray-500 font-semibold py-4 px-6 rounded-2xl mb-2">
                Restaurant fermé
              </div>
              <p className="text-sm text-gray-400">
                Ce restaurant n'accepte pas les commandes quand il est fermé
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
