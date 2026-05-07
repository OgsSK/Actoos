import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const FavoritesContext = createContext(null);

const STORAGE_KEY = 'actoos_favorites';

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Persist to localStorage when favorites change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // Add a partner to favorites
  const addFavorite = useCallback((partner) => {
    setFavorites(prev => {
      if (prev.find(f => f.id === partner.id)) {
        return prev; // Already exists
      }
      return [...prev, {
        id: partner.id,
        name: partner.name,
        image: partner.image,
        cuisine: partner.cuisine,
        rating: partner.rating,
        type: partner.type || 'restaurant',
        addedAt: new Date().toISOString(),
      }];
    });
  }, []);

  // Remove a partner from favorites
  const removeFavorite = useCallback((partnerId) => {
    setFavorites(prev => prev.filter(f => f.id !== partnerId));
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback((partner) => {
    const isFav = favorites.find(f => f.id === partner.id);
    if (isFav) {
      removeFavorite(partner.id);
    } else {
      addFavorite(partner);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // Check if a partner is in favorites
  const isFavorite = useCallback((partnerId) => {
    return favorites.some(f => f.id === partnerId);
  }, [favorites]);

  // Get all favorites
  const getFavorites = useCallback(() => {
    return favorites;
  }, [favorites]);

  // Get favorites count
  const getFavoritesCount = useCallback(() => {
    return favorites.length;
  }, [favorites]);

  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getFavorites,
    getFavoritesCount,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
