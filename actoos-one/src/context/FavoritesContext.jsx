/**
 * ACTOOS ONE - Favorites Context
 * 
 * Gestion des favoris avec Supabase + fallback localStorage.
 * PRODUCTION MODE
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  getUserFavorites, 
  addFavorite as addFavoriteAPI, 
  removeFavorite as removeFavoriteAPI,
  isFavorite as isFavoriteAPI 
} from '../services/favoritesService';
import { isSupabaseConfigured } from '../services/supabaseClient';

const FavoritesContext = createContext(null);

const STORAGE_KEY = 'actoos_favorites';

export function FavoritesProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);

  // Charger les favoris au démarrage ou quand l'utilisateur change
  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);

      // Si utilisateur connecté et Supabase configuré → charger depuis Supabase
      if (isAuthenticated && user?.id && isSupabaseConfigured()) {
        setIsSupabaseMode(true);
        const { data } = await getUserFavorites(user.id);
        setFavorites(data || []);
      } else {
        // Sinon → charger depuis localStorage (guest mode)
        setIsSupabaseMode(false);
        const stored = localStorage.getItem(STORAGE_KEY);
        setFavorites(stored ? JSON.parse(stored) : []);
      }

      setIsLoading(false);
    };

    loadFavorites();
  }, [isAuthenticated, user?.id]);

  // Sauvegarder en localStorage pour les guests
  useEffect(() => {
    if (!isSupabaseMode) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites, isSupabaseMode]);

  // Ajouter un favori
  const addFavorite = useCallback(async (partner) => {
    if (!partner?.id) return;

    // Ajouter immédiatement à l'état local (optimistic update)
    setFavorites(prev => {
      if (prev.find(f => f.id === partner.id)) return prev;
      return [...prev, {
        id: partner.id,
        name: partner.name,
        image_url: partner.image_url || partner.image,
        category: partner.category || partner.cuisine,
        rating: partner.rating,
        addedAt: new Date().toISOString(),
      }];
    });

    // Si connecté → sauvegarder dans Supabase
    if (isSupabaseMode && user?.id) {
      const { error } = await addFavoriteAPI(user.id, partner.id);
      if (error) {
        console.error('Erreur ajout favori:', error);
        // Rollback si erreur
        setFavorites(prev => prev.filter(f => f.id !== partner.id));
      }
    }
  }, [isSupabaseMode, user?.id]);

  // Retirer un favori
  const removeFavorite = useCallback(async (partnerId) => {
    // Retirer immédiatement de l'état local
    const previousFavorites = favorites;
    setFavorites(prev => prev.filter(f => f.id !== partnerId));

    // Si connecté → supprimer dans Supabase
    if (isSupabaseMode && user?.id) {
      const { error } = await removeFavoriteAPI(user.id, partnerId);
      if (error) {
        console.error('Erreur suppression favori:', error);
        // Rollback si erreur
        setFavorites(previousFavorites);
      }
    }
  }, [isSupabaseMode, user?.id, favorites]);

  // Toggle favori
  const toggleFavorite = useCallback(async (partner) => {
    const isFav = favorites.find(f => f.id === partner.id);
    if (isFav) {
      await removeFavorite(partner.id);
    } else {
      await addFavorite(partner);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // Vérifier si un partenaire est en favori
  const isFavorite = useCallback((partnerId) => {
    return favorites.some(f => f.id === partnerId);
  }, [favorites]);

  // Récupérer tous les favoris
  const getFavorites = useCallback(() => {
    return favorites;
  }, [favorites]);

  // Nombre de favoris
  const getFavoritesCount = useCallback(() => {
    return favorites.length;
  }, [favorites]);

  // Synchroniser les favoris localStorage vers Supabase après connexion
  const syncLocalFavoritesToSupabase = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) return;

    const localFavorites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    if (localFavorites.length > 0) {
      console.log('Synchronisation des favoris locaux vers Supabase...');
      for (const fav of localFavorites) {
        await addFavoriteAPI(user.id, fav.id);
      }
      // Vider le localStorage après sync
      localStorage.removeItem(STORAGE_KEY);
      // Recharger depuis Supabase
      const { data } = await getUserFavorites(user.id);
      setFavorites(data || []);
    }
  }, [isAuthenticated, user?.id]);

  // Appeler la sync après connexion
  useEffect(() => {
    if (isSupabaseMode) {
      syncLocalFavoritesToSupabase();
    }
  }, [isSupabaseMode, syncLocalFavoritesToSupabase]);

  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getFavorites,
    getFavoritesCount,
    isLoading,
    isSupabaseMode,
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
