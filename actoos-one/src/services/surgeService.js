// Surge Pricing Service
// Gère la tarification dynamique basée sur la demande

// Configuration du surge
const SURGE_CONFIG = {
  DRIVER_THRESHOLD: 5,        // Seuil de livreurs en ligne
  SURGE_MULTIPLIER: 1.2,      // Multiplicateur x1.2
  PEAK_HOURS: [12, 13, 19, 20, 21], // Heures de pointe
  WEEKEND_MULTIPLIER: 1.1,    // Léger surplus weekend
};

// Mock: Nombre de livreurs en ligne (simulé)
let mockOnlineDrivers = 3; // < 5 = surge actif

// Obtenir le nombre de livreurs en ligne
export function getOnlineDriversCount() {
  // En production: appel API temps réel
  // Ici: simulation avec variation aléatoire
  const variation = Math.floor(Math.random() * 4) - 2; // -2 à +2
  return Math.max(1, mockOnlineDrivers + variation);
}

// Vérifier si le surge est actif
export function isSurgeActive() {
  const onlineDrivers = getOnlineDriversCount();
  const currentHour = new Date().getHours();
  const isPeakHour = SURGE_CONFIG.PEAK_HOURS.includes(currentHour);
  
  return onlineDrivers < SURGE_CONFIG.DRIVER_THRESHOLD || isPeakHour;
}

// Obtenir les détails du surge
export function getSurgeDetails() {
  const onlineDrivers = getOnlineDriversCount();
  const currentHour = new Date().getHours();
  const isPeakHour = SURGE_CONFIG.PEAK_HOURS.includes(currentHour);
  const isWeekend = [0, 6].includes(new Date().getDay());
  
  const isActive = onlineDrivers < SURGE_CONFIG.DRIVER_THRESHOLD || isPeakHour;
  
  let multiplier = 1;
  let reason = '';
  
  if (onlineDrivers < SURGE_CONFIG.DRIVER_THRESHOLD) {
    multiplier = SURGE_CONFIG.SURGE_MULTIPLIER;
    reason = 'Forte demande';
  } else if (isPeakHour) {
    multiplier = 1.15;
    reason = 'Heure de pointe';
  }
  
  if (isWeekend && isActive) {
    multiplier = Math.min(multiplier * SURGE_CONFIG.WEEKEND_MULTIPLIER, 1.5);
  }
  
  return {
    isActive,
    multiplier,
    reason,
    onlineDrivers,
    isPeakHour,
    isWeekend,
    threshold: SURGE_CONFIG.DRIVER_THRESHOLD,
  };
}

// Calculer le prix avec surge
export function applyStoPricing(basePrice) {
  const surge = getSurgeDetails();
  
  if (!surge.isActive) {
    return {
      originalPrice: basePrice,
      finalPrice: basePrice,
      surgeAmount: 0,
      multiplier: 1,
      isActive: false,
      reason: null,
    };
  }
  
  const finalPrice = Math.round(basePrice * surge.multiplier);
  const surgeAmount = finalPrice - basePrice;
  
  return {
    originalPrice: basePrice,
    finalPrice,
    surgeAmount,
    multiplier: surge.multiplier,
    isActive: true,
    reason: surge.reason,
  };
}

// Calculer les frais de livraison avec surge
export function calculateDeliveryFeeWithSurge(baseFee = 500) {
  return applyStoPricing(baseFee);
}

// Pour le module Black (VTC)
export function calculateVTCPriceWithSurge(distance, vehicleType = 'standard') {
  const basePrices = {
    standard: 150,  // FCFA par km
    confort: 250,
    premium: 400,
  };
  
  const basePrice = basePrices[vehicleType] || basePrices.standard;
  const baseTotal = Math.round(distance * basePrice);
  const minimumFare = vehicleType === 'premium' ? 2000 : vehicleType === 'confort' ? 1500 : 1000;
  
  const totalBeforeSurge = Math.max(baseTotal, minimumFare);
  
  return applyStoPricing(totalBeforeSurge);
}

// Mettre à jour le nombre de livreurs (pour simulation)
export function setMockOnlineDrivers(count) {
  mockOnlineDrivers = count;
}
