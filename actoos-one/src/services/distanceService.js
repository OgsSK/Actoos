/**
 * ACTOOS ONE - Distance Calculation Service
 * 
 * Calcul de distance utilisant:
 * 1. PostGIS (Supabase) si disponible
 * 2. Haversine formula comme fallback
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Rayon de la Terre en km
const EARTH_RADIUS_KM = 6371;

/**
 * Calcule la distance entre deux points GPS en utilisant la formule Haversine
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  // Convertir en radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calcule la distance entre deux points en utilisant PostGIS (si disponible) ou Haversine
 * @param {Object} from - Point de départ { lat, lng } ou { latitude, longitude }
 * @param {Object} to - Point d'arrivée { lat, lng } ou { latitude, longitude }
 * @returns {Promise<{distance: number, method: string}>}
 */
export async function calculateDistance(from, to) {
  // Normaliser les coordonnées
  const fromLat = from.lat || from.latitude;
  const fromLng = from.lng || from.longitude;
  const toLat = to.lat || to.latitude;
  const toLng = to.lng || to.longitude;

  // Vérifier que les coordonnées sont valides
  if (!isValidCoordinate(fromLat, fromLng) || !isValidCoordinate(toLat, toLng)) {
    console.warn('[Distance] Coordonnées invalides, retour distance par défaut');
    return { distance: 3, method: 'default' };
  }

  // Essayer PostGIS d'abord
  if (isSupabaseConfigured()) {
    try {
      const result = await calculatePostGISDistance(fromLat, fromLng, toLat, toLng);
      if (result !== null) {
        console.log(`✅ [Distance] PostGIS: ${result.toFixed(2)} km`);
        return { distance: result, method: 'postgis' };
      }
    } catch (err) {
      console.warn('[Distance] PostGIS non disponible, fallback Haversine:', err.message);
    }
  }

  // Fallback sur Haversine
  const haversineDistance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
  console.log(`📐 [Distance] Haversine: ${haversineDistance.toFixed(2)} km`);
  return { distance: haversineDistance, method: 'haversine' };
}

/**
 * Calcule la distance via PostGIS (Supabase RPC)
 */
async function calculatePostGISDistance(lat1, lng1, lat2, lng2) {
  // Essayer la fonction RPC PostGIS
  const { data, error } = await supabase.rpc('calculate_distance', {
    lat1: lat1,
    lng1: lng1,
    lat2: lat2,
    lng2: lng2,
  });

  if (error) {
    // Si la fonction n'existe pas, on laisse le fallback Haversine prendre le relais
    if (error.code === '42883') {
      console.log('[Distance] Fonction PostGIS non installée');
      return null;
    }
    throw error;
  }

  return data; // Distance en km
}

/**
 * Vérifie si les coordonnées sont valides
 */
function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    !isNaN(lat) && 
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Calcule la distance entre le client et un restaurant
 * @param {Object} clientLocation - { lat, lng }
 * @param {Object} restaurant - Restaurant avec coordonnées
 * @returns {Promise<number>} Distance en km
 */
export async function calculateDeliveryDistance(clientLocation, restaurant) {
  // Vérifier si le restaurant a des coordonnées
  const restaurantLat = restaurant?.latitude || restaurant?.lat || restaurant?.location?.lat;
  const restaurantLng = restaurant?.longitude || restaurant?.lng || restaurant?.location?.lng;

  if (!restaurantLat || !restaurantLng) {
    console.warn('[Distance] Restaurant sans coordonnées, distance par défaut');
    return 3; // Distance par défaut
  }

  if (!clientLocation?.lat || !clientLocation?.lng) {
    console.warn('[Distance] Client sans coordonnées, distance par défaut');
    return 3;
  }

  const result = await calculateDistance(
    { lat: clientLocation.lat, lng: clientLocation.lng },
    { lat: restaurantLat, lng: restaurantLng }
  );

  return result.distance;
}

/**
 * Trouve les restaurants les plus proches
 * @param {Object} clientLocation - { lat, lng }
 * @param {Array} restaurants - Liste des restaurants
 * @param {number} maxDistance - Distance maximum en km (optionnel)
 * @returns {Promise<Array>} Restaurants triés par distance
 */
export async function findNearbyRestaurants(clientLocation, restaurants, maxDistance = null) {
  if (!clientLocation?.lat || !clientLocation?.lng) {
    return restaurants.map(r => ({ ...r, distanceKm: null, distanceText: '-- km' }));
  }

  const restaurantsWithDistance = await Promise.all(
    restaurants.map(async (restaurant) => {
      const distance = await calculateDeliveryDistance(clientLocation, restaurant);
      return {
        ...restaurant,
        distanceKm: distance,
        distanceText: `${distance.toFixed(1)} km`,
      };
    })
  );

  // Trier par distance
  const sorted = restaurantsWithDistance.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

  // Filtrer par distance max si spécifié
  if (maxDistance) {
    return sorted.filter(r => r.distanceKm <= maxDistance);
  }

  return sorted;
}

/**
 * Coordonnées par défaut pour Bamako (Mali)
 */
export const BAMAKO_DEFAULT_LOCATION = {
  lat: 12.6392,
  lng: -8.0029,
};

/**
 * Coordonnées par défaut pour Abidjan (Côte d'Ivoire)
 */
export const ABIDJAN_DEFAULT_LOCATION = {
  lat: 5.3600,
  lng: -4.0083,
};

/**
 * Migration SQL pour PostGIS (à exécuter dans Supabase)
 */
export const POSTGIS_MIGRATION_SQL = `
-- Activer l'extension PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fonction pour calculer la distance entre deux points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  -- Retourne la distance en kilomètres
  RETURN ST_DistanceSphere(
    ST_MakePoint(lng1, lat1),
    ST_MakePoint(lng2, lat2)
  ) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ajouter des colonnes de géolocalisation aux tables existantes si nécessaire
ALTER TABLE partners ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Index spatial pour optimiser les requêtes de proximité
CREATE INDEX IF NOT EXISTS idx_partners_location ON partners USING GIST (location);

-- Fonction pour trouver les partenaires proches
CREATE OR REPLACE FUNCTION find_nearby_partners(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  partner_id UUID,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS partner_id,
    ST_DistanceSphere(
      ST_MakePoint(user_lng, user_lat),
      p.location::geometry
    ) / 1000.0 AS distance_km
  FROM partners p
  WHERE p.is_active = true
    AND p.location IS NOT NULL
    AND ST_DWithin(
      p.location::geography,
      ST_MakePoint(user_lng, user_lat)::geography,
      max_distance_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
`;

export default {
  calculateDistance,
  calculateDeliveryDistance,
  calculateHaversineDistance,
  findNearbyRestaurants,
  BAMAKO_DEFAULT_LOCATION,
  ABIDJAN_DEFAULT_LOCATION,
  POSTGIS_MIGRATION_SQL,
};
