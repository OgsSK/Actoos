/**
 * ACTOOS ONE - Configuration Métier
 * 
 * Ce fichier contient toutes les règles de tarification, commissions et logique financière.
 * Ces valeurs seront stockées dans system_config en production pour être ajustables sans mise à jour.
 */

// =============================================================================
// 1. FRAIS DE LIVRAISON (DELIVERY FEES)
// =============================================================================

export const DELIVERY_CONFIG = {
  // Base fee covers first 2 km
  base_fee: 700, // FCFA
  base_distance_km: 2,
  
  // Additional fee per km beyond base distance
  fee_per_km: 200, // FCFA per km
  
  // Self-Delivery: Partner sets price but with cap per km
  self_delivery_cap_per_km: 250, // FCFA - Maximum partner can charge per km
  
  // Pickup: No delivery fee
  pickup_fee: 0,
  
  // SOS/Urgent (Health): Additional premium
  sos_premium: 500, // FCFA - 100% goes to driver
};

/**
 * Calculate delivery fee based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} deliveryType - 'actoos' | 'self' | 'pickup'
 * @param {boolean} isUrgent - SOS/Urgent order (Health)
 * @param {number} surgeMultiplier - Surge pricing multiplier (default 1.0)
 * @param {number} selfDeliveryFee - Partner's self-delivery fee (only for self-delivery)
 */
export function calculateDeliveryFee({
  distanceKm,
  deliveryType = 'actoos',
  isUrgent = false,
  surgeMultiplier = 1.0,
  selfDeliveryFee = null,
}) {
  // Pickup: No delivery fee
  if (deliveryType === 'pickup') {
    return { fee: 0, breakdown: { base: 0, distance: 0, surge: 0, sos: 0 } };
  }
  
  let baseFee = 0;
  let distanceFee = 0;
  
  if (deliveryType === 'self' && selfDeliveryFee !== null) {
    // Self-delivery: Partner sets price but capped
    const maxAllowedFee = Math.ceil(distanceKm) * DELIVERY_CONFIG.self_delivery_cap_per_km;
    baseFee = Math.min(selfDeliveryFee, maxAllowedFee);
  } else {
    // Actoos Delivery: Standard calculation
    baseFee = DELIVERY_CONFIG.base_fee;
    
    if (distanceKm > DELIVERY_CONFIG.base_distance_km) {
      const extraKm = distanceKm - DELIVERY_CONFIG.base_distance_km;
      distanceFee = Math.ceil(extraKm) * DELIVERY_CONFIG.fee_per_km;
    }
  }
  
  let subtotal = baseFee + distanceFee;
  
  // Apply surge pricing
  const surgeAmount = subtotal * (surgeMultiplier - 1);
  subtotal = Math.round(subtotal * surgeMultiplier);
  
  // Add SOS premium if urgent
  const sosAmount = isUrgent ? DELIVERY_CONFIG.sos_premium : 0;
  const total = subtotal + sosAmount;
  
  return {
    fee: total,
    breakdown: {
      base: baseFee,
      distance: distanceFee,
      surge: Math.round(surgeAmount),
      sos: sosAmount,
    },
  };
}

// =============================================================================
// 2. SURGE PRICING (TARIFICATION DYNAMIQUE)
// =============================================================================

export const SURGE_CONFIG = {
  // Surge levels
  levels: [
    { threshold: 0.8, multiplier: 1.0, label: 'Normal' },      // < 80% demand
    { threshold: 1.0, multiplier: 1.2, label: 'Demande élevée' }, // 80-100% demand
    { threshold: 1.3, multiplier: 1.5, label: 'Très forte demande' }, // > 130% demand
    { threshold: 1.5, multiplier: 2.0, label: 'Demande extrême' }, // > 150% demand
  ],
  
  // Triggers
  triggers: {
    rain: 1.3,           // Pluie
    evening_rush: 1.2,   // Heure de pointe soir (18h-21h)
    weekend_peak: 1.2,   // Weekend midi
    special_event: 1.5,  // Match de foot, concert, etc.
  },
  
  // Maximum surge multiplier
  max_multiplier: 2.0,
};

/**
 * Get current surge multiplier based on conditions
 * @param {Object} conditions - { rain, isRushHour, isSpecialEvent, demandRatio }
 */
export function getSurgeMultiplier(conditions = {}) {
  const { rain = false, isRushHour = false, isSpecialEvent = false, demandRatio = 1.0 } = conditions;
  
  let multiplier = 1.0;
  
  // Apply condition-based surge
  if (rain) multiplier = Math.max(multiplier, SURGE_CONFIG.triggers.rain);
  if (isRushHour) multiplier = Math.max(multiplier, SURGE_CONFIG.triggers.evening_rush);
  if (isSpecialEvent) multiplier = Math.max(multiplier, SURGE_CONFIG.triggers.special_event);
  
  // Apply demand-based surge
  for (const level of SURGE_CONFIG.levels) {
    if (demandRatio >= level.threshold) {
      multiplier = Math.max(multiplier, level.multiplier);
    }
  }
  
  // Cap at maximum
  return Math.min(multiplier, SURGE_CONFIG.max_multiplier);
}

// =============================================================================
// 3. COMMISSIONS (Par Verticale et Mode)
// =============================================================================

export const COMMISSION_CONFIG = {
  // EATS (Restaurants, Fast-Foods, Maquis)
  eats: {
    actoos_delivery: 15, // 15% - Partner gets 85%
    self_delivery: 10,   // 10% - Partner gets 90% + 100% delivery
    pickup: 10,          // 10% - Partner gets 90%
  },
  
  // HEALTH (Pharmacies) - Lower margin due to regulation
  health: {
    actoos_delivery: 5,  // 5% - Pharmacy gets 95%
    self_delivery: 2,    // 2% - Pharmacy gets 98% + 100% delivery
    pickup: 2,           // 2% - Pharmacy gets 98%
  },
};

/**
 * Calculate commission breakdown for an order
 * @param {number} subtotal - Order subtotal (items only, no delivery)
 * @param {number} deliveryFee - Delivery fee
 * @param {string} vertical - 'eats' | 'health'
 * @param {string} deliveryType - 'actoos_delivery' | 'self_delivery' | 'pickup'
 */
export function calculateCommission({
  subtotal,
  deliveryFee,
  vertical = 'eats',
  deliveryType = 'actoos_delivery',
}) {
  const commissionRate = COMMISSION_CONFIG[vertical]?.[deliveryType] || 15;
  const commissionAmount = Math.round(subtotal * (commissionRate / 100));
  const partnerEarnings = subtotal - commissionAmount;
  
  // Driver gets 100% of delivery fee (Actoos NEVER takes from delivery)
  const driverEarnings = deliveryType !== 'pickup' ? deliveryFee : 0;
  
  // For self-delivery, partner also gets the delivery fee
  const totalPartnerEarnings = deliveryType === 'self_delivery' 
    ? partnerEarnings + deliveryFee 
    : partnerEarnings;
  
  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    commission: {
      rate: commissionRate,
      amount: commissionAmount,
    },
    distribution: {
      actoos: commissionAmount,
      partner: totalPartnerEarnings,
      driver: deliveryType === 'self_delivery' ? 0 : driverEarnings,
    },
  };
}

// =============================================================================
// 4. WALLET & WITHDRAWAL RULES
// =============================================================================

export const WALLET_CONFIG = {
  // Withdrawal fees (Actoos takes 0%, telecom fees are user's responsibility)
  actoos_withdrawal_fee: 0, // 0%
  
  // Telecom fees (approximate)
  telecom_fees: {
    orange_money: 1.0,    // 1% for B2C transfer
    wave: 0.5,            // 0.5% 
    moov_money: 1.0,      // 1%
  },
  
  // Bank transfer
  bank_transfer_fee: 1000, // Fixed FCFA
  bank_transfer_delay: '24-48h',
  
  // Minimum withdrawal amounts
  min_withdrawal: 500,     // FCFA
  min_driver_caution: 5000, // FCFA - Minimum caution for drivers to receive orders
  
  // Settlement: Instant when Handshake code is entered
  settlement_type: 'instant',
};

/**
 * Calculate withdrawal amount after fees
 * @param {number} amount - Amount to withdraw
 * @param {string} method - 'orange_money' | 'wave' | 'moov_money' | 'bank_transfer'
 */
export function calculateWithdrawal(amount, method = 'orange_money') {
  if (amount < WALLET_CONFIG.min_withdrawal) {
    return { 
      error: `Montant minimum: ${WALLET_CONFIG.min_withdrawal} FCFA`, 
      valid: false 
    };
  }
  
  let fee = 0;
  
  if (method === 'bank_transfer') {
    fee = WALLET_CONFIG.bank_transfer_fee;
  } else {
    const feeRate = WALLET_CONFIG.telecom_fees[method] || 1.0;
    fee = Math.round(amount * (feeRate / 100));
  }
  
  return {
    valid: true,
    requested: amount,
    fee,
    feeLabel: method === 'bank_transfer' 
      ? `Frais bancaires: ${fee} FCFA` 
      : `Frais opérateur: ${WALLET_CONFIG.telecom_fees[method]}%`,
    received: amount - fee,
    method,
    delay: method === 'bank_transfer' ? WALLET_CONFIG.bank_transfer_delay : 'Immédiat',
  };
}

// =============================================================================
// 5. EXAMPLE CALCULATIONS
// =============================================================================

/**
 * Full order calculation example
 * 
 * Scenario: Dibi Mouton 10,000F, Actoos Delivery, 4km distance
 * 
 * Delivery Fee: 700 + (2 * 200) = 1,100 FCFA
 * Client Pays: 10,000 + 1,100 = 11,100 FCFA
 * 
 * Distribution:
 * - Livreur: 1,100 FCFA (100% delivery)
 * - Restaurant: 10,000 - 15% = 8,500 FCFA
 * - Actoos: 10,000 * 15% = 1,500 FCFA
 */

export function calculateFullOrder({
  items, // Array of { price, quantity }
  distanceKm,
  vertical = 'eats',
  deliveryType = 'actoos_delivery',
  isUrgent = false,
  surgeMultiplier = 1.0,
}) {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate delivery fee
  const deliveryResult = calculateDeliveryFee({
    distanceKm,
    deliveryType,
    isUrgent,
    surgeMultiplier,
  });
  
  // Calculate commission split
  const commissionResult = calculateCommission({
    subtotal,
    deliveryFee: deliveryResult.fee,
    vertical,
    deliveryType,
  });
  
  return {
    ...commissionResult,
    deliveryBreakdown: deliveryResult.breakdown,
    surgeMultiplier,
    isUrgent,
  };
}

// Export default config for easy access
export default {
  delivery: DELIVERY_CONFIG,
  surge: SURGE_CONFIG,
  commission: COMMISSION_CONFIG,
  wallet: WALLET_CONFIG,
};
