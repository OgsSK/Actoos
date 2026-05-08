import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CartContext = createContext(null);

// Clé localStorage pour persister le panier
const CART_STORAGE_KEY = 'actoos_cart';
const CART_RESTAURANT_KEY = 'actoos_cart_restaurant';

export function CartProvider({ children }) {
  // Initialiser depuis localStorage pour persistance
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [restaurantId, setRestaurantId] = useState(() => {
    try {
      return localStorage.getItem(CART_RESTAURANT_KEY) || null;
    } catch {
      return null;
    }
  });

  // Persister le panier dans localStorage à chaque changement
  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Erreur sauvegarde panier:', e);
    }
  }, [cartItems]);

  // Persister le restaurantId
  useEffect(() => {
    try {
      if (restaurantId) {
        localStorage.setItem(CART_RESTAURANT_KEY, restaurantId);
      } else {
        localStorage.removeItem(CART_RESTAURANT_KEY);
      }
    } catch (e) {
      console.warn('Erreur sauvegarde restaurant:', e);
    }
  }, [restaurantId]);

  // Ajouter un article au panier
  const addToCart = useCallback((item, quantity, instructions, restaurant) => {
    // Si le panier contient des articles d'un autre restaurant, on demande confirmation
    if (restaurantId && restaurantId !== restaurant.id) {
      const confirm = window.confirm(
        'Votre panier contient des articles d\'un autre restaurant. Voulez-vous vider le panier et ajouter ce nouvel article ?'
      );
      if (!confirm) return false;
      setCartItems([]);
    }

    setRestaurantId(restaurant.id);

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (cartItem) => cartItem.id === item.id && cartItem.instructions === instructions
      );

      if (existingIndex > -1) {
        // Mettre à jour la quantité si l'article existe déjà avec les mêmes instructions
        const updated = [...prev];
        const newQuantity = updated[existingIndex].quantity + quantity;
        
        // Respecter max_per_order
        if (newQuantity <= item.max_per_order) {
          updated[existingIndex].quantity = newQuantity;
        } else {
          updated[existingIndex].quantity = item.max_per_order;
        }
        return updated;
      }

      // Ajouter un nouvel article
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price_at_time: item.price, // Stocker le prix au moment de l'ajout
          quantity,
          instructions,
          max_per_order: item.max_per_order,
          image: item.image,
        },
      ];
    });

    return true;
  }, [restaurantId]);

  // Mettre à jour la quantité d'un article
  const updateQuantity = useCallback((itemId, instructions, newQuantity) => {
    setCartItems((prev) => {
      if (newQuantity <= 0) {
        return prev.filter(
          (item) => !(item.id === itemId && item.instructions === instructions)
        );
      }

      return prev.map((item) => {
        if (item.id === itemId && item.instructions === instructions) {
          return {
            ...item,
            quantity: Math.min(newQuantity, item.max_per_order),
          };
        }
        return item;
      });
    });
  }, []);

  // Supprimer un article du panier
  const removeFromCart = useCallback((itemId, instructions) => {
    setCartItems((prev) => {
      const filtered = prev.filter(
        (item) => !(item.id === itemId && item.instructions === instructions)
      );
      if (filtered.length === 0) {
        setRestaurantId(null);
      }
      return filtered;
    });
  }, []);

  // Vider le panier
  const clearCart = useCallback(() => {
    setCartItems([]);
    setRestaurantId(null);
  }, []);

  // Calculer le total
  const getTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.price_at_time * item.quantity, 0);
  }, [cartItems]);

  // Nombre total d'articles
  const getItemCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    restaurantId,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotal,
    getItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
