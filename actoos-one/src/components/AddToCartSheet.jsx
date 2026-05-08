import { useState, useEffect } from 'react';
import { Minus, Plus, X, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { systemConfig } from '../data/mockData';

export function AddToCartSheet({ isOpen, item, restaurant, onClose, canOrder = true }) {
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [showConflictAlert, setShowConflictAlert] = useState(false);
  const { addToCart, cartItems, cartRestaurant, clearCart, setActiveRestaurant } = useCart();

  // Reset quand on ouvre avec un nouvel item
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setInstructions('');
      setShowConflictAlert(false);
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

  // Vérifier si le panier a des articles d'un autre restaurant
  const hasConflict = cartItems.length > 0 && 
                      cartRestaurant && 
                      cartRestaurant.id !== restaurant?.id;

  const handleAdd = () => {
    if (!orderAllowed) return;
    
    // Si conflit avec un autre restaurant, montrer l'alerte
    if (hasConflict) {
      setShowConflictAlert(true);
      return;
    }
    
    const success = addToCart(item, quantity, instructions, restaurant);
    if (success) {
      onClose();
    }
  };

  // Confirmer le remplacement du panier
  const handleConfirmReplace = () => {
    // Vider l'ancien panier
    clearCart();
    // Définir le nouveau restaurant comme actif
    setActiveRestaurant(restaurant);
    // Ajouter l'article
    const success = addToCart(item, quantity, instructions, restaurant);
    if (success) {
      setShowConflictAlert(false);
      onClose();
    }
  };

  // Annuler et garder l'ancien panier
  const handleCancelReplace = () => {
    setShowConflictAlert(false);
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

      {/* Modal de conflit - Style Uber Eats */}
      {showConflictAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop sombre */}
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={handleCancelReplace}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-bounce-in">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            
            {/* Titre */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Créer une nouvelle commande ?
            </h3>
            
            {/* Message */}
            <p className="text-gray-500 text-center mb-6">
              Votre panier contient des articles de{' '}
              <span className="font-semibold text-gray-900">
                {cartRestaurant?.name}
              </span>
              . Souhaitez-vous les supprimer et ajouter cet article de{' '}
              <span className="font-semibold text-[#FF5A00]">
                {restaurant?.name}
              </span>
              {' '}?
            </p>
            
            {/* Boutons */}
            <div className="space-y-3">
              <button
                onClick={handleConfirmReplace}
                className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-2xl active:bg-[#E55100] transition-colors"
                data-testid="confirm-replace-cart"
              >
                Oui, nouvelle commande
              </button>
              <button
                onClick={handleCancelReplace}
                className="w-full py-4 bg-gray-100 text-gray-700 font-semibold rounded-2xl active:bg-gray-200 transition-colors"
                data-testid="cancel-replace-cart"
              >
                Non, garder mon panier
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
