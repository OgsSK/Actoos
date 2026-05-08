/**
 * ACTOOS ONE - Cart Context
 * 
 * Gestion du panier style Uber Eats / Deliveroo
 * - Un panier par restaurant (pas de mélange)
 * - Plusieurs paniers possibles (multi-restaurant)
 * - Persistance localStorage
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CartContext = createContext(null);

// Clés localStorage
const CARTS_STORAGE_KEY = 'actoos_carts'; // Multiple carts by restaurant
const ACTIVE_CART_KEY = 'actoos_active_cart'; // Current active restaurant ID

export function CartProvider({ children }) {
  // Multiple carts: { [restaurantId]: { restaurant: {...}, items: [...] } }
  const [carts, setCarts] = useState(() => {
    try {
      const saved = localStorage.getItem(CARTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Active cart restaurant ID
  const [activeRestaurantId, setActiveRestaurantId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_CART_KEY) || null;
    } catch {
      return null;
    }
  });

  // Persister les paniers
  useEffect(() => {
    try {
      const nonEmptyCarts = Object.fromEntries(
        Object.entries(carts).filter(([_, cart]) => cart.items && cart.items.length > 0)
      );
      if (Object.keys(nonEmptyCarts).length > 0) {
        localStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(nonEmptyCarts));
      } else {
        localStorage.removeItem(CARTS_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Erreur sauvegarde paniers:', e);
    }
  }, [carts]);

  // Persister le panier actif
  useEffect(() => {
    try {
      if (activeRestaurantId) {
        localStorage.setItem(ACTIVE_CART_KEY, activeRestaurantId);
      } else {
        localStorage.removeItem(ACTIVE_CART_KEY);
      }
    } catch (e) {
      console.warn('Erreur sauvegarde panier actif:', e);
    }
  }, [activeRestaurantId]);

  // Récupérer le panier actif
  const activeCart = activeRestaurantId ? carts[activeRestaurantId] : null;
  const cartItems = activeCart?.items || [];
  const cartRestaurant = activeCart?.restaurant || null;

  // Définir le restaurant actif (quand on ouvre un restaurant)
  const setActiveRestaurant = useCallback((restaurant) => {
    if (restaurant?.id) {
      setActiveRestaurantId(restaurant.id);
      // Créer le panier s'il n'existe pas
      setCarts(prev => {
        if (!prev[restaurant.id]) {
          return {
            ...prev,
            [restaurant.id]: {
              restaurant: {
                id: restaurant.id,
                name: restaurant.name,
                image: restaurant.image,
                deliveryTime: restaurant.deliveryTime || '30-45 min',
                deliveryFee: restaurant.deliveryFee,
                rating: restaurant.rating,
              },
              items: [],
            }
          };
        }
        return prev;
      });
    }
  }, []);

  // Ajouter un article au panier
  const addToCart = useCallback((item, quantity = 1, instructions = '', restaurant = null) => {
    // Si restaurant fourni, s'assurer que c'est le bon panier
    const targetRestaurantId = restaurant?.id || activeRestaurantId;
    
    if (!targetRestaurantId) {
      console.error('Aucun restaurant sélectionné');
      return false;
    }

    // Mettre à jour le panier actif si nécessaire
    if (restaurant?.id && restaurant.id !== activeRestaurantId) {
      setActiveRestaurantId(restaurant.id);
    }

    setCarts(prev => {
      const currentCart = prev[targetRestaurantId] || {
        restaurant: restaurant ? {
          id: restaurant.id,
          name: restaurant.name,
          image: restaurant.image,
          deliveryTime: restaurant.deliveryTime || '30-45 min',
          deliveryFee: restaurant.deliveryFee,
          rating: restaurant.rating,
        } : null,
        items: [],
      };

      const existingIndex = currentCart.items.findIndex(
        (cartItem) => cartItem.id === item.id && cartItem.instructions === instructions
      );

      let newItems;
      if (existingIndex > -1) {
        // Mettre à jour la quantité
        newItems = [...currentCart.items];
        const maxQty = item.max_per_order || 10;
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: Math.min(newItems[existingIndex].quantity + quantity, maxQty),
        };
      } else {
        // Ajouter nouvel article
        newItems = [
          ...currentCart.items,
          {
            id: item.id,
            name: item.name,
            price_at_time: item.price,
            quantity,
            instructions,
            max_per_order: item.max_per_order || 10,
            image: item.image,
            category: item.category,
          },
        ];
      }

      return {
        ...prev,
        [targetRestaurantId]: {
          ...currentCart,
          items: newItems,
        },
      };
    });

    return true;
  }, [activeRestaurantId]);

  // Mettre à jour la quantité d'un article
  const updateQuantity = useCallback((itemId, newQuantity, instructions = null) => {
    if (!activeRestaurantId) return;

    setCarts(prev => {
      const currentCart = prev[activeRestaurantId];
      if (!currentCart) return prev;

      let newItems;
      if (newQuantity <= 0) {
        // Supprimer l'article
        newItems = currentCart.items.filter(item => {
          if (instructions !== null) {
            return !(item.id === itemId && item.instructions === instructions);
          }
          return item.id !== itemId;
        });
      } else {
        // Mettre à jour la quantité
        newItems = currentCart.items.map(item => {
          const matchesId = item.id === itemId;
          const matchesInstructions = instructions === null || item.instructions === instructions;
          
          if (matchesId && matchesInstructions) {
            return {
              ...item,
              quantity: Math.min(newQuantity, item.max_per_order || 10),
            };
          }
          return item;
        });
      }

      // Si le panier est vide, on peut le garder ou le supprimer
      return {
        ...prev,
        [activeRestaurantId]: {
          ...currentCart,
          items: newItems,
        },
      };
    });
  }, [activeRestaurantId]);

  // Supprimer un article du panier
  const removeFromCart = useCallback((itemId, instructions = null) => {
    updateQuantity(itemId, 0, instructions);
  }, [updateQuantity]);

  // Vider le panier actif
  const clearCart = useCallback((restaurantId = null) => {
    const targetId = restaurantId || activeRestaurantId;
    if (!targetId) return;

    setCarts(prev => {
      const newCarts = { ...prev };
      delete newCarts[targetId];
      return newCarts;
    });

    if (targetId === activeRestaurantId) {
      setActiveRestaurantId(null);
    }
  }, [activeRestaurantId]);

  // Vider tous les paniers
  const clearAllCarts = useCallback(() => {
    setCarts({});
    setActiveRestaurantId(null);
  }, []);

  // Calculer le total du panier actif
  const getTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.price_at_time || 0) * (item.quantity || 1), 0);
  }, [cartItems]);

  // Nombre d'articles dans le panier actif
  const getItemCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cartItems]);

  // Nombre total d'articles tous paniers confondus
  const getTotalItemCount = useCallback(() => {
    return Object.values(carts).reduce((total, cart) => {
      return total + (cart.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, 0);
  }, [carts]);

  // Obtenir tous les paniers non-vides
  const getAllCarts = useCallback(() => {
    return Object.entries(carts)
      .filter(([_, cart]) => cart.items && cart.items.length > 0)
      .map(([restaurantId, cart]) => ({
        restaurantId,
        ...cart,
        total: cart.items.reduce((sum, item) => sum + (item.price_at_time || 0) * (item.quantity || 1), 0),
        itemCount: cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      }));
  }, [carts]);

  // Changer de panier actif
  const switchCart = useCallback((restaurantId) => {
    if (carts[restaurantId]) {
      setActiveRestaurantId(restaurantId);
    }
  }, [carts]);

  // Pour la compatibilité avec l'ancien code
  const restaurantId = activeRestaurantId;

  const value = {
    // State
    cartItems,
    cartRestaurant,
    restaurantId,
    activeRestaurantId,
    carts,
    
    // Actions
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearAllCarts,
    setActiveRestaurant,
    switchCart,
    
    // Getters
    getTotal,
    getItemCount,
    getTotalItemCount,
    getAllCarts,
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

export default CartContext;
