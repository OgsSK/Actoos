/**
 * ACTOOS ONE - Favorites Service
 * 
 * Gestion des favoris utilisateur avec Supabase.
 * PRODUCTION MODE
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Récupérer les favoris d'un utilisateur
 */
export async function getUserFavorites(userId) {
  if (!isSupabaseConfigured() || !userId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        partner_id,
        created_at,
        partners (
          id,
          name,
          description,
          category,
          image_url,
          address,
          rating,
          preparation_time,
          delivery_fee,
          is_active
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Extraire les partenaires des résultats
    const favorites = (data || [])
      .filter(f => f.partners)
      .map(f => ({
        ...f.partners,
        favorite_id: f.id,
        favorited_at: f.created_at,
      }));

    return { data: favorites, error: null };
  } catch (error) {
    console.error('Erreur getUserFavorites:', error);
    return { data: [], error };
  }
}

/**
 * Ajouter un partenaire aux favoris
 */
export async function addFavorite(userId, partnerId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  if (!userId) {
    return { data: null, error: { message: 'Utilisateur non connecté' } };
  }

  try {
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        partner_id: partnerId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Déjà en favori
        return { data: null, error: { message: 'Déjà en favoris' } };
      }
      throw error;
    }

    console.log('✅ Favori ajouté:', partnerId);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur addFavorite:', error);
    return { data: null, error };
  }
}

/**
 * Retirer un partenaire des favoris
 */
export async function removeFavorite(userId, partnerId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  if (!userId) {
    return { data: null, error: { message: 'Utilisateur non connecté' } };
  }

  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('partner_id', partnerId);

    if (error) throw error;

    console.log('✅ Favori retiré:', partnerId);
    return { data: true, error: null };
  } catch (error) {
    console.error('Erreur removeFavorite:', error);
    return { data: null, error };
  }
}

/**
 * Vérifier si un partenaire est en favori
 */
export async function isFavorite(userId, partnerId) {
  if (!isSupabaseConfigured() || !userId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('partner_id', partnerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Erreur isFavorite:', error);
    return false;
  }
}

/**
 * Toggle favori (ajouter si absent, retirer si présent)
 */
export async function toggleFavorite(userId, partnerId) {
  const isCurrentlyFavorite = await isFavorite(userId, partnerId);
  
  if (isCurrentlyFavorite) {
    return removeFavorite(userId, partnerId);
  } else {
    return addFavorite(userId, partnerId);
  }
}

export default {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  toggleFavorite,
};
