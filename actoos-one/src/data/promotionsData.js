// Promotions Data - Système de promotions style Uber Eats/Deliveroo

// Types de promotions
export const PROMO_TYPES = {
  PERCENTAGE: 'percentage',      // -20%
  FIXED_AMOUNT: 'fixed_amount',  // -1000 FCFA
  FREE_DELIVERY: 'free_delivery', // Livraison gratuite
  FREE_ITEM: 'free_item',        // Article gratuit
  BOGO: 'bogo',                  // Buy One Get One
  FIRST_ORDER: 'first_order',    // Première commande
  FLASH_DEAL: 'flash_deal',      // Offre limitée dans le temps
};

// Promotions actives (mock data - serait géré par l'admin en production)
export const activePromotions = [
  {
    id: 'promo-001',
    type: PROMO_TYPES.FIRST_ORDER,
    title: 'Bienvenue sur ACTOOS !',
    description: '-2000 FCFA sur votre première commande',
    discount_value: 2000,
    discount_type: 'fixed',
    code: 'BIENVENUE',
    min_order: 5000,
    max_uses: 1,
    valid_until: null, // Permanent
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    is_active: true,
    is_featured: true,
  },
  {
    id: 'promo-002',
    type: PROMO_TYPES.PERCENTAGE,
    title: '20% de réduction',
    description: 'Sur toutes les commandes de plus de 10,000 FCFA',
    discount_value: 20,
    discount_type: 'percentage',
    code: 'ACTOOS20',
    min_order: 10000,
    max_discount: 5000, // Cap à 5000 FCFA
    max_uses: null,
    valid_until: '2025-02-28',
    image: null,
    is_active: true,
    is_featured: false,
  },
  {
    id: 'promo-003',
    type: PROMO_TYPES.FREE_DELIVERY,
    title: 'Livraison GRATUITE',
    description: 'Ce weekend uniquement !',
    discount_value: 0,
    discount_type: 'free_delivery',
    code: 'FREEWEEKEND',
    min_order: 3000,
    max_uses: null,
    valid_until: '2025-01-12',
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
    is_active: true,
    is_featured: true,
  },
  {
    id: 'promo-004',
    type: PROMO_TYPES.FLASH_DEAL,
    title: 'Flash Deal - 30%',
    description: 'Valable 2 heures seulement !',
    discount_value: 30,
    discount_type: 'percentage',
    code: null, // Automatique
    min_order: 0,
    max_discount: 3000,
    max_uses: 100,
    valid_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2h
    image: null,
    is_active: true,
    is_featured: false,
    is_flash: true,
    remaining_uses: 47,
  },
];

// Promotions par restaurant
export const restaurantPromotions = {
  'rest-001': [
    {
      id: 'rest-promo-001',
      type: PROMO_TYPES.PERCENTAGE,
      title: '-15% Maquis Chez Tanti',
      description: 'Sur tout le menu',
      discount_value: 15,
      discount_type: 'percentage',
      badge: '-15%',
      badge_color: 'orange',
    },
  ],
  'rest-002': [
    {
      id: 'rest-promo-002',
      type: PROMO_TYPES.FREE_DELIVERY,
      title: 'Livraison offerte',
      description: 'Le Diplomate vous livre gratuitement',
      discount_value: 0,
      discount_type: 'free_delivery',
      badge: 'Livraison offerte',
      badge_color: 'green',
    },
  ],
  'rest-003': [
    {
      id: 'rest-promo-003',
      type: PROMO_TYPES.BOGO,
      title: '1 acheté = 1 offert',
      description: 'Sur les pizzas moyennes',
      discount_value: 50,
      discount_type: 'percentage',
      badge: '1+1',
      badge_color: 'purple',
      applies_to: ['pizza-medium'],
    },
  ],
};

// Codes promo utilisés par l'utilisateur (stocké localement)
export function getUsedPromoCodes() {
  const stored = localStorage.getItem('actoos_used_promos');
  return stored ? JSON.parse(stored) : [];
}

export function markPromoCodeUsed(code) {
  const used = getUsedPromoCodes();
  if (!used.includes(code)) {
    used.push(code);
    localStorage.setItem('actoos_used_promos', JSON.stringify(used));
  }
}

// Valider un code promo
export function validatePromoCode(code, orderTotal, isFirstOrder = false) {
  const promo = activePromotions.find(
    p => p.code?.toLowerCase() === code.toLowerCase() && p.is_active
  );

  if (!promo) {
    return { valid: false, error: 'Code promo invalide' };
  }

  // Vérifier si déjà utilisé
  const usedCodes = getUsedPromoCodes();
  if (promo.max_uses === 1 && usedCodes.includes(code.toUpperCase())) {
    return { valid: false, error: 'Code déjà utilisé' };
  }

  // Vérifier minimum commande
  if (promo.min_order && orderTotal < promo.min_order) {
    return { 
      valid: false, 
      error: `Commande minimum: ${promo.min_order.toLocaleString()} FCFA` 
    };
  }

  // Vérifier date expiration
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return { valid: false, error: 'Code expiré' };
  }

  // Vérifier première commande
  if (promo.type === PROMO_TYPES.FIRST_ORDER && !isFirstOrder) {
    return { valid: false, error: 'Réservé aux nouvelles inscriptions' };
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

// Obtenir les promotions pour la bannière home
export function getFeaturedPromotions() {
  return activePromotions.filter(p => p.is_featured && p.is_active);
}

// Obtenir les flash deals actifs
export function getActiveFlashDeals() {
  return activePromotions.filter(p => 
    p.is_flash && 
    p.is_active && 
    new Date(p.valid_until) > new Date()
  );
}

// Obtenir les promotions d'un restaurant
export function getRestaurantPromotions(restaurantId) {
  return restaurantPromotions[restaurantId] || [];
}
