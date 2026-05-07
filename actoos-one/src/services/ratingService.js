/**
 * ACTOOS ONE - Rating Service
 * 
 * Gestion des notations commandes avec Supabase.
 * PRODUCTION MODE
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Soumettre une notation pour une commande
 */
export async function submitRating(ratingData) {
  const {
    orderId,
    userId,
    restaurantRating,
    driverRating,
    restaurantComment,
    driverComment,
  } = ratingData;

  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .insert({
        order_id: orderId,
        user_id: userId,
        restaurant_rating: restaurantRating,
        driver_rating: driverRating,
        restaurant_comment: restaurantComment || null,
        driver_comment: driverComment || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: { message: 'Commande déjà notée' } };
      }
      throw error;
    }

    console.log('✅ Rating soumis pour commande:', orderId);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur submitRating:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer la notation d'une commande
 */
export async function getOrderRating(orderId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erreur getOrderRating:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les notations d'un partenaire
 */
export async function getPartnerRatings(partnerId, options = {}) {
  const { limit = 20 } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        orders!inner (
          id,
          partner_id
        )
      `)
      .eq('orders.partner_id', partnerId)
      .not('restaurant_rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erreur getPartnerRatings:', error);
    return { data: [], error };
  }
}

/**
 * Récupérer les notations d'un livreur
 */
export async function getDriverRatings(driverId, options = {}) {
  const { limit = 20 } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        orders!inner (
          id,
          driver_id
        )
      `)
      .eq('orders.driver_id', driverId)
      .not('driver_rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erreur getDriverRatings:', error);
    return { data: [], error };
  }
}

/**
 * Calculer la moyenne des notations d'un partenaire
 */
export async function getPartnerAverageRating(partnerId) {
  if (!isSupabaseConfigured()) {
    return { average: 0, count: 0 };
  }

  try {
    const { data, error } = await supabase
      .rpc('get_partner_rating_stats', { p_partner_id: partnerId });

    if (error) throw error;

    return data || { average: 0, count: 0 };
  } catch (error) {
    // Fallback: calculer manuellement
    const { data: ratings } = await getPartnerRatings(partnerId, { limit: 1000 });
    const validRatings = ratings.filter(r => r.restaurant_rating);
    const sum = validRatings.reduce((acc, r) => acc + r.restaurant_rating, 0);
    return {
      average: validRatings.length > 0 ? sum / validRatings.length : 0,
      count: validRatings.length,
    };
  }
}

export default {
  submitRating,
  getOrderRating,
  getPartnerRatings,
  getDriverRatings,
  getPartnerAverageRating,
};
