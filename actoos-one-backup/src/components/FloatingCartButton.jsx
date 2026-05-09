/**
 * ACTOOS ONE - Floating Cart Button (Mobile)
 * 
 * Bouton flottant affichant le panier sur mobile.
 * Apparaît quand il y a des articles dans le panier.
 */

import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function FloatingCartButton({ onClick }) {
  const { cartItems, getTotal, getItemCount } = useCart();
  
  const itemCount = getItemCount();
  const total = getTotal();
  
  // Ne pas afficher si panier vide
  if (itemCount === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-20 left-4 right-4 z-40 bg-[#FF5A00] text-white rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-between px-5 py-4 active:scale-[0.98] transition-transform"
      data-testid="floating-cart-btn"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-white text-[#FF5A00] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </div>
        <span className="font-semibold">
          {itemCount} article{itemCount > 1 ? 's' : ''}
        </span>
      </div>
      <span className="font-bold text-lg">
        {total.toLocaleString()} FCFA
      </span>
    </button>
  );
}

export default FloatingCartButton;
