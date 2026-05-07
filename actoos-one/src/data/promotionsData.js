// ============================================
// ACTOOS ONE - Système de Promotions Multi-Niveau
// ============================================
// Niveau 1: Platform Promos (Admin GOD MODE)
// Niveau 2: Partner Promos (Restaurant/Pharmacie)
// Niveau 3: Referral System (Parrainage utilisateur)
// ============================================

// Types de promotions
export const PROMO_TYPES = {
  PERCENTAGE: 'percentage',           // -20%
  FIXED_AMOUNT: 'fixed_amount',       // -1000 FCFA
  FREE_DELIVERY: 'free_delivery',     // Livraison gratuite
  FREE_ITEM: 'free_item',             // Article gratuit
  BOGO: 'bogo',                       // Buy One Get One
  FIRST_ORDER: 'first_order',         // Première commande
  FLASH_DEAL: 'flash_deal',           // Offre limitée dans le temps
  REFERRAL: 'referral',               // Code parrainage
};

// Niveaux de contrôle des promotions
export const PROMO_LEVELS = {
  PLATFORM: 'platform',   // Créé par Admin - s'applique partout
  PARTNER: 'partner',     // Créé par Partner - s'applique à son établissement
  REFERRAL: 'referral',   // Code parrainage utilisateur
};

// Types de partenaires
export const PARTNER_TYPES = {
  RESTAURANT: 'restaurant',
  PHARMACY: 'pharmacy',
};

// Catégories de produits pharmacie (pour restrictions BOGO)
export const PHARMACY_CATEGORIES = {
  MEDICATION: 'medicament',         // Pas de BOGO
  PARAPHARMACY: 'parapharmacie',    // Tout autorisé
};

// ============================================
// CONFIGURATION PARRAINAGE (Admin controlled)
// ============================================
export const referralConfig = {
  is_enabled: true,
  referee_bonus: 1500,      // Filleul reçoit -1500 FCFA sur première commande
  referrer_bonus: 1000,     // Parrain reçoit +1000 FCFA en wallet
  min_order_amount: 5000,   // Commande minimum pour valider le parrainage
  code_prefix: 'ACTOOS',    // Format: ACTOOS-XXXX
};

// ============================================
// PROMOTIONS PLATEFORME (Admin GOD MODE)
// ============================================
export let platformPromotions = [
  {
    id: 'platform-001',
    level: PROMO_LEVELS.PLATFORM,
    type: PROMO_TYPES.FIRST_ORDER,
    title: 'Bienvenue sur ACTOOS !',
    description: '-2000 FCFA sur votre première commande',
    discount_value: 2000,
    discount_type: 'fixed',
    code: 'BIENVENUE',
    min_order: 5000,
    max_uses_per_user: 1,
    max_uses_total: null,
    used_count: 0,
    valid_from: null,
    valid_until: null,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    is_active: true,
    is_featured: true,
    applies_to: 'all', // 'all', 'restaurants', 'pharmacies', ou [ids]
    created_by: 'admin',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'platform-002',
    level: PROMO_LEVELS.PLATFORM,
    type: PROMO_TYPES.PERCENTAGE,
    title: '20% de réduction',
    description: 'Sur toutes les commandes de plus de 10,000 FCFA',
    discount_value: 20,
    discount_type: 'percentage',
    code: 'ACTOOS20',
    min_order: 10000,
    max_discount: 5000,
    max_uses_per_user: null,
    max_uses_total: null,
    used_count: 0,
    valid_from: '2025-01-01',
    valid_until: '2025-12-31',
    image: null,
    is_active: true,
    is_featured: false,
    applies_to: 'all',
    created_by: 'admin',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'platform-003',
    level: PROMO_LEVELS.PLATFORM,
    type: PROMO_TYPES.FREE_DELIVERY,
    title: 'Livraison GRATUITE',
    description: 'Ce weekend uniquement !',
    discount_value: 0,
    discount_type: 'free_delivery',
    code: 'FREEWEEKEND',
    min_order: 3000,
    max_uses_per_user: null,
    max_uses_total: null,
    used_count: 0,
    valid_from: null,
    valid_until: '2025-12-31',
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
    is_active: true,
    is_featured: true,
    applies_to: 'all',
    created_by: 'admin',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'platform-004',
    level: PROMO_LEVELS.PLATFORM,
    type: PROMO_TYPES.FLASH_DEAL,
    title: 'Flash Deal - 30%',
    description: 'Valable 2 heures seulement !',
    discount_value: 30,
    discount_type: 'percentage',
    code: null,
    min_order: 0,
    max_discount: 3000,
    max_uses_per_user: 1,
    max_uses_total: 100,
    used_count: 53,
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    image: null,
    is_active: true,
    is_featured: false,
    is_flash: true,
    applies_to: 'all',
    created_by: 'admin',
    created_at: new Date().toISOString(),
  },
];

// ============================================
// PROMOTIONS PARTENAIRES (Restaurant/Pharmacie)
// ============================================
export let partnerPromotions = [
  // Maquis Chez Tanti - Self Delivery (peut offrir livraison gratuite)
  {
    id: 'partner-001',
    level: PROMO_LEVELS.PARTNER,
    partner_id: 'rest-001',
    partner_name: 'Maquis Chez Tanti',
    partner_type: PARTNER_TYPES.RESTAURANT,
    type: PROMO_TYPES.PERCENTAGE,
    title: '-15% sur tout le menu',
    description: 'Profitez de 15% de réduction !',
    discount_value: 15,
    discount_type: 'percentage',
    code: 'TANTI15',
    min_order: 3000,
    max_discount: 2000,
    max_uses_per_user: null,
    max_uses_total: null,
    used_count: 0,
    valid_from: '2025-01-01',
    valid_until: '2025-06-30',
    is_active: true,
    badge: '-15%',
    badge_color: 'orange',
    requires_approval: false,
    approved_by: null,
    created_at: '2025-01-15T10:00:00Z',
  },
  // Le Diplomate - Actoos Delivery (NE peut PAS offrir livraison gratuite)
  {
    id: 'partner-002',
    level: PROMO_LEVELS.PARTNER,
    partner_id: 'rest-002',
    partner_name: 'Le Diplomate',
    partner_type: PARTNER_TYPES.RESTAURANT,
    type: PROMO_TYPES.FIXED_AMOUNT,
    title: '-1000 FCFA',
    description: 'Sur votre prochaine commande',
    discount_value: 1000,
    discount_type: 'fixed',
    code: 'DIPLO1000',
    min_order: 5000,
    max_discount: null,
    max_uses_per_user: 1,
    max_uses_total: 50,
    used_count: 12,
    valid_from: '2025-01-01',
    valid_until: '2025-03-31',
    is_active: true,
    badge: '-1000F',
    badge_color: 'green',
    requires_approval: false,
    approved_by: null,
    created_at: '2025-01-20T14:00:00Z',
  },
  // Pizza Milano - Self Delivery - BOGO
  {
    id: 'partner-003',
    level: PROMO_LEVELS.PARTNER,
    partner_id: 'rest-003',
    partner_name: 'Pizza Milano',
    partner_type: PARTNER_TYPES.RESTAURANT,
    type: PROMO_TYPES.BOGO,
    title: '1 Pizza = 2 Pizzas',
    description: '1 achetée = 1 offerte sur les moyennes',
    discount_value: 50,
    discount_type: 'percentage',
    code: 'MILANO2X',
    min_order: 0,
    max_discount: null,
    max_uses_per_user: 2,
    max_uses_total: null,
    used_count: 0,
    valid_from: '2025-01-01',
    valid_until: '2025-12-31',
    is_active: true,
    badge: '1+1',
    badge_color: 'purple',
    applies_to_items: ['pizza-medium'],
    requires_approval: false,
    approved_by: null,
    created_at: '2025-01-10T09:00:00Z',
  },
  // Pharmacie du Point G - Promo parapharmacie
  {
    id: 'partner-004',
    level: PROMO_LEVELS.PARTNER,
    partner_id: 'pharm-001',
    partner_name: 'Pharmacie du Point G',
    partner_type: PARTNER_TYPES.PHARMACY,
    type: PROMO_TYPES.PERCENTAGE,
    title: '-20% Cosmétiques',
    description: 'Sur toute la parapharmacie',
    discount_value: 20,
    discount_type: 'percentage',
    code: 'POINTG20',
    min_order: 2000,
    max_discount: 3000,
    max_uses_per_user: null,
    max_uses_total: null,
    used_count: 0,
    valid_from: '2025-01-01',
    valid_until: '2025-06-30',
    is_active: true,
    badge: '-20%',
    badge_color: 'blue',
    applies_to_categories: [PHARMACY_CATEGORIES.PARAPHARMACY],
    requires_approval: false,
    approved_by: null,
    created_at: '2025-01-25T11:00:00Z',
  },
];

// ============================================
// CODES PARRAINAGE UTILISATEURS
// ============================================
export let referralCodes = [
  {
    id: 'ref-001',
    user_id: 'user-001',
    user_name: 'Amadou Diallo',
    user_phone: '+223 70 00 00 01',
    code: 'ACTOOS-AD01',
    total_referrals: 5,
    successful_referrals: 3,
    total_earned: 3000,
    is_active: true,
    created_at: '2025-01-05T08:00:00Z',
  },
  {
    id: 'ref-002',
    user_id: 'user-002',
    user_name: 'Fatou Traoré',
    user_phone: '+223 70 00 00 02',
    code: 'ACTOOS-FT02',
    total_referrals: 12,
    successful_referrals: 8,
    total_earned: 8000,
    is_active: true,
    created_at: '2025-01-10T12:00:00Z',
  },
];

// ============================================
// HISTORIQUE UTILISATIONS PARRAINAGE
// ============================================
export let referralUses = [
  {
    id: 'ref-use-001',
    referral_code: 'ACTOOS-FT02',
    referrer_id: 'user-002',
    referee_id: 'user-003',
    referee_phone: '+223 70 00 00 03',
    order_id: 'ORD-123456',
    referee_bonus_given: 1500,
    referrer_bonus_given: 1000,
    created_at: '2025-01-15T14:30:00Z',
  },
];

// ============================================
// CONFIGURATION PARTENAIRES (delivery mode)
// ============================================
export const partnerDeliveryConfig = {
  'rest-001': { self_delivery: true },   // Peut offrir livraison gratuite
  'rest-002': { self_delivery: false },  // NE peut PAS offrir livraison gratuite
  'rest-003': { self_delivery: true },
  'rest-004': { self_delivery: false },
  'pharm-001': { self_delivery: false },
  'pharm-002': { self_delivery: true },
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

// Codes promo utilisés par l'utilisateur (stocké localement)
export function getUsedPromoCodes() {
  const stored = localStorage.getItem('actoos_used_promos');
  return stored ? JSON.parse(stored) : [];
}

export function markPromoCodeUsed(code) {
  const used = getUsedPromoCodes();
  if (!used.includes(code.toUpperCase())) {
    used.push(code.toUpperCase());
    localStorage.setItem('actoos_used_promos', JSON.stringify(used));
  }
}

// Vérifier si un partenaire peut offrir la livraison gratuite
export function canOfferFreeDelivery(partnerId) {
  return partnerDeliveryConfig[partnerId]?.self_delivery === true;
}

// Vérifier si un type de promo est autorisé pour un partenaire
export function isPromoTypeAllowed(partnerId, partnerType, promoType, itemCategory = null) {
  // Restaurants: tout autorisé sauf livraison gratuite si Actoos delivery
  if (partnerType === PARTNER_TYPES.RESTAURANT) {
    if (promoType === PROMO_TYPES.FREE_DELIVERY) {
      return canOfferFreeDelivery(partnerId);
    }
    return true;
  }
  
  // Pharmacies: BOGO interdit sur médicaments
  if (partnerType === PARTNER_TYPES.PHARMACY) {
    if (promoType === PROMO_TYPES.FREE_DELIVERY) {
      return canOfferFreeDelivery(partnerId);
    }
    if (promoType === PROMO_TYPES.BOGO && itemCategory === PHARMACY_CATEGORIES.MEDICATION) {
      return false;
    }
    return true;
  }
  
  return true;
}

// Obtenir les types de promo disponibles pour un partenaire
export function getAvailablePromoTypes(partnerId, partnerType) {
  const allTypes = [
    { type: PROMO_TYPES.PERCENTAGE, label: 'Pourcentage (-X%)', icon: '💯' },
    { type: PROMO_TYPES.FIXED_AMOUNT, label: 'Montant fixe (-X FCFA)', icon: '💰' },
    { type: PROMO_TYPES.BOGO, label: '1 Acheté = 1 Offert', icon: '🎁' },
    { type: PROMO_TYPES.FREE_ITEM, label: 'Article gratuit', icon: '🆓' },
    { type: PROMO_TYPES.FREE_DELIVERY, label: 'Livraison gratuite', icon: '🚚' },
  ];
  
  return allTypes.map(t => ({
    ...t,
    enabled: isPromoTypeAllowed(partnerId, partnerType, t.type),
    reason: !isPromoTypeAllowed(partnerId, partnerType, t.type) 
      ? (t.type === PROMO_TYPES.FREE_DELIVERY 
          ? 'Livraison gérée par ACTOOS' 
          : 'Non disponible pour les médicaments')
      : null,
  }));
}

// ============================================
// VALIDATION CODE PROMO (Améliorée)
// ============================================
export function validatePromoCode(code, orderTotal, options = {}) {
  const {
    isFirstOrder = false,
    partnerId = null,
    partnerType = null,
    itemCategories = [],
  } = options;
  
  const codeUpper = code.toUpperCase();
  
  // 1. Chercher dans les promos plateforme
  let promo = platformPromotions.find(
    p => p.code?.toUpperCase() === codeUpper && p.is_active
  );
  
  // 2. Chercher dans les promos partenaires
  if (!promo) {
    promo = partnerPromotions.find(
      p => p.code?.toUpperCase() === codeUpper && 
           p.is_active &&
           (!partnerId || p.partner_id === partnerId)
    );
  }
  
  // 3. Chercher dans les codes parrainage
  if (!promo) {
    const referral = referralCodes.find(
      r => r.code.toUpperCase() === codeUpper && r.is_active
    );
    if (referral) {
      return validateReferralCode(referral, orderTotal, isFirstOrder);
    }
  }
  
  if (!promo) {
    return { valid: false, error: 'Code promo invalide' };
  }
  
  // Vérifier si déjà utilisé (pour les codes à usage unique)
  const usedCodes = getUsedPromoCodes();
  if (promo.max_uses_per_user === 1 && usedCodes.includes(codeUpper)) {
    return { valid: false, error: 'Code déjà utilisé' };
  }
  
  // Vérifier minimum commande
  if (promo.min_order && orderTotal < promo.min_order) {
    return { 
      valid: false, 
      error: `Commande minimum: ${promo.min_order.toLocaleString()} FCFA` 
    };
  }
  
  // Vérifier date validité
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return { valid: false, error: 'Code expiré' };
  }
  if (promo.valid_from && new Date(promo.valid_from) > new Date()) {
    return { valid: false, error: 'Code pas encore actif' };
  }
  
  // Vérifier première commande
  if (promo.type === PROMO_TYPES.FIRST_ORDER && !isFirstOrder) {
    return { valid: false, error: 'Réservé aux nouvelles inscriptions' };
  }
  
  // Vérifier utilisation totale max
  if (promo.max_uses_total && promo.used_count >= promo.max_uses_total) {
    return { valid: false, error: 'Code épuisé' };
  }
  
  // Vérifier si promo partenaire correspond au partenaire actuel
  if (promo.level === PROMO_LEVELS.PARTNER && partnerId && promo.partner_id !== partnerId) {
    return { valid: false, error: `Code valable uniquement chez ${promo.partner_name}` };
  }
  
  // Calculer la réduction
  let discount = 0;
  if (promo.discount_type === 'percentage') {
    discount = Math.round(orderTotal * promo.discount_value / 100);
    if (promo.max_discount) {
      discount = Math.min(discount, promo.max_discount);
    }
  } else if (promo.discount_type === 'fixed') {
    discount = promo.discount_value;
  }
  
  return {
    valid: true,
    promo,
    discount,
    message: promo.discount_type === 'free_delivery' 
      ? 'Livraison gratuite appliquée !'
      : `-${discount.toLocaleString()} FCFA appliqué !`,
  };
}

// Valider un code parrainage
function validateReferralCode(referral, orderTotal, isFirstOrder) {
  if (!referralConfig.is_enabled) {
    return { valid: false, error: 'Parrainage temporairement désactivé' };
  }
  
  if (!isFirstOrder) {
    return { valid: false, error: 'Code parrainage réservé à la première commande' };
  }
  
  if (orderTotal < referralConfig.min_order_amount) {
    return { 
      valid: false, 
      error: `Commande minimum: ${referralConfig.min_order_amount.toLocaleString()} FCFA` 
    };
  }
  
  return {
    valid: true,
    promo: {
      ...referral,
      type: PROMO_TYPES.REFERRAL,
      discount_type: 'fixed',
      discount_value: referralConfig.referee_bonus,
    },
    discount: referralConfig.referee_bonus,
    message: `-${referralConfig.referee_bonus.toLocaleString()} FCFA (parrainage) !`,
    referrer_bonus: referralConfig.referrer_bonus,
  };
}

// ============================================
// FONCTIONS ADMIN
// ============================================

// Obtenir toutes les promotions (pour admin)
export function getAllPromotions() {
  return {
    platform: platformPromotions,
    partner: partnerPromotions,
    referral: referralCodes,
  };
}

// Créer une promo plateforme (admin)
export function createPlatformPromo(promoData) {
  const newPromo = {
    id: `platform-${Date.now()}`,
    level: PROMO_LEVELS.PLATFORM,
    ...promoData,
    used_count: 0,
    created_by: 'admin',
    created_at: new Date().toISOString(),
  };
  platformPromotions.push(newPromo);
  return newPromo;
}

// Modifier une promo (admin peut modifier n'importe laquelle)
export function updatePromotion(promoId, updates) {
  // Chercher dans platform
  let index = platformPromotions.findIndex(p => p.id === promoId);
  if (index !== -1) {
    platformPromotions[index] = { ...platformPromotions[index], ...updates };
    return platformPromotions[index];
  }
  
  // Chercher dans partner
  index = partnerPromotions.findIndex(p => p.id === promoId);
  if (index !== -1) {
    partnerPromotions[index] = { ...partnerPromotions[index], ...updates };
    return partnerPromotions[index];
  }
  
  return null;
}

// Désactiver une promo (admin)
export function deactivatePromotion(promoId) {
  return updatePromotion(promoId, { is_active: false });
}

// Mettre à jour la config parrainage (admin)
export function updateReferralConfig(config) {
  Object.assign(referralConfig, config);
  return referralConfig;
}

// ============================================
// FONCTIONS PARTENAIRE
// ============================================

// Obtenir les promos d'un partenaire
export function getPartnerPromotions(partnerId) {
  return partnerPromotions.filter(p => p.partner_id === partnerId);
}

// Créer une promo partenaire
export function createPartnerPromo(partnerId, partnerName, partnerType, promoData) {
  // Vérifier si le type est autorisé
  if (!isPromoTypeAllowed(partnerId, partnerType, promoData.type)) {
    return { 
      success: false, 
      error: 'Ce type de promotion n\'est pas disponible pour votre établissement' 
    };
  }
  
  const newPromo = {
    id: `partner-${Date.now()}`,
    level: PROMO_LEVELS.PARTNER,
    partner_id: partnerId,
    partner_name: partnerName,
    partner_type: partnerType,
    ...promoData,
    used_count: 0,
    requires_approval: false,
    approved_by: null,
    created_at: new Date().toISOString(),
  };
  
  partnerPromotions.push(newPromo);
  return { success: true, promo: newPromo };
}

// Modifier une promo partenaire (seulement la sienne)
export function updatePartnerPromo(partnerId, promoId, updates) {
  const index = partnerPromotions.findIndex(
    p => p.id === promoId && p.partner_id === partnerId
  );
  if (index === -1) {
    return { success: false, error: 'Promotion non trouvée' };
  }
  
  partnerPromotions[index] = { ...partnerPromotions[index], ...updates };
  return { success: true, promo: partnerPromotions[index] };
}

// ============================================
// FONCTIONS UTILISATEUR (Parrainage)
// ============================================

// Générer un code parrainage pour un utilisateur
export function generateReferralCode(userId, userName, userPhone) {
  // Vérifier si l'utilisateur a déjà un code
  const existing = referralCodes.find(r => r.user_id === userId);
  if (existing) {
    return existing;
  }
  
  // Générer un code unique
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const code = `${referralConfig.code_prefix}-${initials}${random}`;
  
  const newReferral = {
    id: `ref-${Date.now()}`,
    user_id: userId,
    user_name: userName,
    user_phone: userPhone,
    code,
    total_referrals: 0,
    successful_referrals: 0,
    total_earned: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  
  referralCodes.push(newReferral);
  return newReferral;
}

// Obtenir le code parrainage d'un utilisateur
export function getUserReferralCode(userId) {
  return referralCodes.find(r => r.user_id === userId);
}

// Enregistrer une utilisation de parrainage
export function recordReferralUse(referralCode, refereeId, refereePhone, orderId) {
  const referral = referralCodes.find(r => r.code === referralCode);
  if (!referral) return null;
  
  // Enregistrer l'utilisation
  const use = {
    id: `ref-use-${Date.now()}`,
    referral_code: referralCode,
    referrer_id: referral.user_id,
    referee_id: refereeId,
    referee_phone: refereePhone,
    order_id: orderId,
    referee_bonus_given: referralConfig.referee_bonus,
    referrer_bonus_given: referralConfig.referrer_bonus,
    created_at: new Date().toISOString(),
  };
  referralUses.push(use);
  
  // Mettre à jour les stats du parrain
  referral.total_referrals++;
  referral.successful_referrals++;
  referral.total_earned += referralConfig.referrer_bonus;
  
  return use;
}

// ============================================
// FONCTIONS D'AFFICHAGE
// ============================================

// Obtenir les promotions pour la bannière home
export function getFeaturedPromotions() {
  return platformPromotions.filter(p => p.is_featured && p.is_active);
}

// Obtenir les flash deals actifs
export function getActiveFlashDeals() {
  return platformPromotions.filter(p => 
    p.is_flash && 
    p.is_active && 
    new Date(p.valid_until) > new Date()
  );
}

// Obtenir les promotions d'un restaurant (pour affichage badge)
export function getRestaurantPromotions(restaurantId) {
  return partnerPromotions.filter(
    p => p.partner_id === restaurantId && p.is_active
  );
}

// Obtenir le top des parrains (pour admin)
export function getTopReferrers(limit = 10) {
  return [...referralCodes]
    .sort((a, b) => b.successful_referrals - a.successful_referrals)
    .slice(0, limit);
}

// Statistiques globales parrainage (pour admin)
export function getReferralStats() {
  const totalReferrals = referralCodes.reduce((sum, r) => sum + r.successful_referrals, 0);
  const totalPaid = referralCodes.reduce((sum, r) => sum + r.total_earned, 0);
  
  return {
    total_codes: referralCodes.length,
    total_successful_referrals: totalReferrals,
    total_bonus_paid: totalPaid,
    average_per_referrer: totalReferrals / (referralCodes.length || 1),
    config: referralConfig,
  };
}
