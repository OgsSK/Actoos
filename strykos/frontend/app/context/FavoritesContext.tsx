'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface FavoriteItem {
  productId: string;
  productSlug: string;
  productName: string;
  brandName: string | null;
  imageUrl: string | null;
  priceEur: number;
  addedAt: number;
}

interface FavoritesContextType {
  items: FavoriteItem[];
  toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  isFavorite: (productId: string) => boolean;
  removeFavorite: (productId: string) => void;
  clearFavorites: () => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextType>({
  items: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  removeFavorite: () => {},
  clearFavorites: () => {},
  count: 0,
});

const STORAGE_KEY = 'strykos_favorites_v1';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Charge depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch (e) {
      console.warn('[Favorites] load failed', e);
    }
    setHydrated(true);
  }, []);

  // Persiste
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[Favorites] save failed', e);
    }
  }, [items, hydrated]);

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, 'addedAt'>) => {
    setItems(prev => {
      const exists = prev.some(f => f.productId === item.productId);
      if (exists) {
        return prev.filter(f => f.productId !== item.productId);
      }
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const isFavorite = useCallback(
    (productId: string) => items.some(f => f.productId === productId),
    [items]
  );

  const removeFavorite = useCallback((productId: string) => {
    setItems(prev => prev.filter(f => f.productId !== productId));
  }, []);

  const clearFavorites = useCallback(() => setItems([]), []);

  return (
    <FavoritesContext.Provider
      value={{
        items,
        toggleFavorite,
        isFavorite,
        removeFavorite,
        clearFavorites,
        count: items.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);