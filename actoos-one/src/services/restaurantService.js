/**
 * ACTOOS ONE - Restaurant Service
 * 
 * Service pour les opérations sur les restaurants/partenaires.
 * Supporte mode Supabase et mode mocké.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { restaurants as mockRestaurants } from '../data/mockData';
import { getRestaurantMenu } from '../data/menuData';

const useMockData = !isSupabaseConfigured();

/**
 * Récupérer tous les restaurants/partenaires actifs
 */
export async function getRestaurants(options = {}) {
  const { category, city = 'Bamako', limit = 50 } = options;

  if (useMockData) {
    let filtered = [...mockRestaurants];
    
    if (category && category !== 'cat-all') {
      // Filtrer par catégorie
      const categoryName = category.replace('cat-', '').toLowerCase();
      filtered = filtered.filter(r => 
        r.cuisine.toLowerCase().includes(categoryName)
      );
    }
    
    return {
      data: filtered.slice(0, limit),
      error: null,
    };
  }

  try {
    let query = supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .eq('city', city)
      .limit(limit);

    if (category && category !== 'restaurant') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformer les données pour matcher le format frontend
    const transformed = data.map(partner => ({
      id: partner.id,
      name: partner.name,
      image: partner.image_url || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
      cuisine: partner.category,
      rating: partner.rating || 4.5,
      deliveryTime: `${partner.avg_prep_time_minutes || 30}-${(partner.avg_prep_time_minutes || 30) + 15} min`,
      deliveryFee: 500, // Calculé dynamiquement en fonction de la distance
      distance: '-- km', // Calculé dynamiquement
      isOpen: partner.is_open && !partner.is_paused,
      isFeatured: partner.is_featured || false,
      hasOffers: partner.has_offers || false,
      acceptsPickup: partner.accepts_pickup || false,
      selfDelivery: partner.delivery_mode === 'self',
      preparationTime: partner.avg_prep_time_minutes || 30,
      acceptsCash: partner.accepts_cash,
    }));

    return { data: transformed, error: null };
  } catch (error) {
    console.error('Erreur getRestaurants:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer un restaurant par ID avec son menu
 */
export async function getRestaurantById(id) {
  if (useMockData) {
    const restaurant = mockRestaurants.find(r => r.id === id);
    if (!restaurant) {
      return { data: null, error: { message: 'Restaurant non trouvé' } };
    }
    
    const menuData = getRestaurantMenu(id);
    return {
      data: menuData || {
        ...restaurant,
        accepts_cash: false,
        categories: [{
          id: 'cat-default',
          name: 'Menu',
          items: [{
            id: 'item-default-1',
            name: 'Plat du jour',
            price: 2500,
          }],
        }],
      },
      error: null,
    };
  }

  try {
    // Récupérer le partenaire
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();

    if (partnerError) throw partnerError;

    // Récupérer les items du menu
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('partner_id', id)
      .eq('is_available', true)
      .order('sort_order');

    if (menuError) throw menuError;

    // Grouper les items par catégorie
    const categoriesMap = {};
    menuItems.forEach(item => {
      const catId = item.category || 'default';
      if (!categoriesMap[catId]) {
        categoriesMap[catId] = {
          id: `cat-${catId}`,
          name: item.category || 'Menu',
          items: [],
        };
      }
      categoriesMap[catId].items.push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        image: item.image_url,
        is_available: item.is_available,
        max_per_order: item.max_per_order || 10,
      });
    });

    const transformed = {
      id: partner.id,
      name: partner.name,
      image: partner.image_url,
      cuisine: partner.category,
      rating: partner.rating || 4.5,
      isOpen: partner.is_open && !partner.is_paused,
      accepts_cash: partner.accepts_cash,
      selfDelivery: partner.delivery_mode === 'self',
      preparationTime: partner.avg_prep_time_minutes || 30,
      categories: Object.values(categoriesMap),
    };

    return { data: transformed, error: null };
  } catch (error) {
    console.error('Erreur getRestaurantById:', error);
    return { data: null, error };
  }
}

/**
 * Recherche de restaurants
 */
export async function searchRestaurants(query, options = {}) {
  const { city = 'Bamako', limit = 20 } = options;

  if (useMockData) {
    const searchLower = query.toLowerCase();
    const filtered = mockRestaurants.filter(r =>
      r.name.toLowerCase().includes(searchLower) ||
      r.cuisine.toLowerCase().includes(searchLower)
    );
    return { data: filtered.slice(0, limit), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .eq('city', city)
      .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;

    const transformed = data.map(partner => ({
      id: partner.id,
      name: partner.name,
      image: partner.image_url,
      cuisine: partner.category,
      rating: partner.rating || 4.5,
      isOpen: partner.is_open && !partner.is_paused,
    }));

    return { data: transformed, error: null };
  } catch (error) {
    console.error('Erreur searchRestaurants:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer les restaurants à proximité (nécessite coordonnées GPS)
 */
export async function getNearbyRestaurants(latitude, longitude, radiusKm = 5) {
  if (useMockData) {
    // En mode mocké, retourner tous les restaurants
    return { data: mockRestaurants, error: null };
  }

  try {
    // Note: Cette requête nécessite une fonction PostGIS côté Supabase
    // Pour l'instant, on retourne tous les restaurants de la ville
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) throw error;

    // Filtrer côté client par distance (approximation simple)
    const filtered = data.filter(partner => {
      if (!partner.latitude || !partner.longitude) return false;
      const distance = calculateDistance(
        latitude, longitude,
        partner.latitude, partner.longitude
      );
      return distance <= radiusKm;
    });

    return { data: filtered, error: null };
  } catch (error) {
    console.error('Erreur getNearbyRestaurants:', error);
    return { data: [], error };
  }
}

// Helper pour calculer la distance (formule Haversine simplifiée)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default {
  getRestaurants,
  getRestaurantById,
  searchRestaurants,
  getNearbyRestaurants,
};
