/**
 * ACTOOS ONE - Promo Code Service
 * 
 * Gestion des codes promo avec Supabase.
 * PRODUCTION MODE
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Valider et appliquer un code promo
 */
export async function validatePromoCode(code, orderAmount, userId = null) {
  if (!isSupabaseConfigured()) {
    return { valid: false, error: 'Supabase non configuré' };
  }

  if (!code || code.trim() === '') {
    return { valid: false, error: 'Code promo requis' };
  }

  try {
    // Récupérer le code promo
    const { data: promo, error: fetchError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (fetchError || !promo) {
      return { valid: false, error: 'Code promo invalide' };
    }

    // Vérifier la validité temporelle
    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return { valid: false, error: 'Code promo pas encore actif' };
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return { valid: false, error: 'Code promo expiré' };
    }

    // Vérifier le montant minimum
    if (promo.min_order_amount && orderAmount < promo.min_order_amount) {
      return { 
        valid: false, 
        error: `Commande minimum de ${promo.min_order_amount.toLocaleString()} FCFA requise` 
      };
    }

    // Vérifier la limite d'utilisation globale
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return { valid: false, error: 'Code promo épuisé' };
    }

    // Vérifier si l'utilisateur a déjà utilisé ce code
    if (userId) {
      const { data: usage } = await supabase
        .from('promo_usage')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('user_id', userId)
        .single();

      if (usage) {
        return { valid: false, error: 'Vous avez déjà utilisé ce code' };
      }
    }

    // Calculer la réduction
    let discount = 0;
    let discountLabel = '';

    switch (promo.discount_type) {
      case 'percentage':
        discount = Math.round(orderAmount * promo.discount_value / 100);
        if (promo.max_discount && discount > promo.max_discount) {
          discount = promo.max_discount;
        }
        discountLabel = `${promo.discount_value}%`;
        break;
      
      case 'fixed':
        discount = promo.discount_value;
        discountLabel = `${promo.discount_value.toLocaleString()} FCFA`;
        break;
      
      case 'free_delivery':
        discount = 0; // Le composant checkout gérera les frais de livraison
        discountLabel = 'Livraison gratuite';
        break;
    }

    return {
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
      },
      discount,
      discountLabel,
      freeDelivery: promo.discount_type === 'free_delivery',
    };
  } catch (error) {
    console.error('Erreur validatePromoCode:', error);
    return { valid: false, error: 'Erreur de validation' };
  }
}

/**
 * Enregistrer l'utilisation d'un code promo
 */
export async function recordPromoUsage(promoCodeId, userId, orderId) {
  if (!isSupabaseConfigured()) {
    return { success: false };
  }

  try {
    // Enregistrer l'utilisation
    await supabase
      .from('promo_usage')
      .insert({
        promo_code_id: promoCodeId,
        user_id: userId,
        order_id: orderId,
      });

    // Incrémenter le compteur d'utilisation
    await supabase
      .from('promo_codes')
      .update({ usage_count: supabase.sql`usage_count + 1` })
      .eq('id', promoCodeId);

    return { success: true };
  } catch (error) {
    console.error('Erreur recordPromoUsage:', error);
    return { success: false };
  }
}

/**
 * Récupérer tous les codes promo actifs (Admin)
 */
export async function getAllPromoCodes() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erreur getAllPromoCodes:', error);
    return { data: [], error };
  }
}

/**
 * Créer un nouveau code promo (Admin)
 */
export async function createPromoCode(promoData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: promoData.code.toUpperCase().trim(),
        description: promoData.description,
        discount_type: promoData.discountType,
        discount_value: promoData.discountValue,
        min_order_amount: promoData.minOrderAmount || 0,
        max_discount: promoData.maxDiscount || null,
        valid_from: promoData.validFrom || new Date().toISOString(),
        valid_until: promoData.validUntil || null,
        usage_limit: promoData.usageLimit || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ Code promo créé:', data.code);
    return { data, error: null };
  } catch (error) {
    console.error('Erreur createPromoCode:', error);
    return { data: null, error };
  }
}

/**
 * Désactiver un code promo (Admin)
 */
export async function deactivatePromoCode(promoId) {
  if (!isSupabaseConfigured()) {
    return { success: false };
  }

  try {
    await supabase
      .from('promo_codes')
      .update({ is_active: false })
      .eq('id', promoId);

    return { success: true };
  } catch (error) {
    console.error('Erreur deactivatePromoCode:', error);
    return { success: false };
  }
}

export default {
  validatePromoCode,
  recordPromoUsage,
  getAllPromoCodes,
  createPromoCode,
  deactivatePromoCode,
};
