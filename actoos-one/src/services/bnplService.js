// BNPL Service - Buy Now, Pay Later
// Gère l'éligibilité et le scoring de risque pour le crédit

// Critères d'éligibilité BNPL
const BNPL_CRITERIA = {
  min_total_spent: 50000,        // FCFA minimum dépensé au total
  min_account_age_days: 30,      // Ancienneté minimum du compte
  max_cancellation_rate: 0.10,   // Taux d'annulation max (10%)
  min_completed_orders: 5,       // Nombre minimum de commandes réussies
  min_transaction_score: 70,     // Score minimum de transactions (0-100)
  max_fraud_score: 20,           // Score de fraude maximum (0-100)
  max_bnpl_amount: 10000,        // Montant max BNPL par commande
  max_outstanding_bnpl: 20000,   // Montant max BNPL en cours
};

// Pondération des critères pour le score final
const SCORE_WEIGHTS = {
  account_age: 0.15,
  total_spent: 0.20,
  completed_orders: 0.15,
  cancellation_rate: 0.15,
  transaction_history: 0.20,
  fraud_score: 0.15,
};

// Mock user data pour la démo
const MOCK_USER_DATA = {
  user_id: 'user-001',
  account_created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 jours
  total_spent: 75000,
  completed_orders: 12,
  cancelled_orders: 1,
  total_orders: 13,
  transaction_score: 82,
  fraud_score: 5,
  outstanding_bnpl: 0,
  bnpl_history: [
    { amount: 5000, paid_on_time: true },
    { amount: 8000, paid_on_time: true },
  ],
};

// Calculer l'ancienneté du compte en jours
function getAccountAgeDays(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

// Calculer le taux d'annulation
function getCancellationRate(cancelled, total) {
  if (total === 0) return 0;
  return cancelled / total;
}

// Calculer le score de chaque critère (0-100)
function calculateCriteriaScores(userData) {
  const accountAge = getAccountAgeDays(userData.account_created_at);
  const cancellationRate = getCancellationRate(userData.cancelled_orders, userData.total_orders);
  
  return {
    // Score ancienneté (0-100)
    account_age: Math.min(100, (accountAge / BNPL_CRITERIA.min_account_age_days) * 100),
    
    // Score dépenses (0-100) - plafonné à 100
    total_spent: Math.min(100, (userData.total_spent / BNPL_CRITERIA.min_total_spent) * 100),
    
    // Score commandes complétées (0-100)
    completed_orders: Math.min(100, (userData.completed_orders / BNPL_CRITERIA.min_completed_orders) * 100),
    
    // Score taux d'annulation (inversé: moins = mieux)
    cancellation_rate: Math.max(0, 100 - (cancellationRate / BNPL_CRITERIA.max_cancellation_rate) * 100),
    
    // Score historique transactions (déjà en 0-100)
    transaction_history: userData.transaction_score,
    
    // Score fraude (inversé: moins = mieux)
    fraud_score: Math.max(0, 100 - (userData.fraud_score / BNPL_CRITERIA.max_fraud_score) * 100),
  };
}

// Calculer le score final pondéré
function calculateFinalScore(criteriaScores) {
  let totalScore = 0;
  
  for (const [criteria, weight] of Object.entries(SCORE_WEIGHTS)) {
    totalScore += (criteriaScores[criteria] || 0) * weight;
  }
  
  return Math.round(totalScore);
}

// Vérifier l'éligibilité BNPL
export function checkBNPLEligibility(userData = MOCK_USER_DATA, orderAmount) {
  const accountAge = getAccountAgeDays(userData.account_created_at);
  const cancellationRate = getCancellationRate(userData.cancelled_orders, userData.total_orders);
  
  // Critères binaires (pass/fail)
  const criteria = {
    account_age: accountAge >= BNPL_CRITERIA.min_account_age_days,
    total_spent: userData.total_spent >= BNPL_CRITERIA.min_total_spent,
    completed_orders: userData.completed_orders >= BNPL_CRITERIA.min_completed_orders,
    cancellation_rate: cancellationRate <= BNPL_CRITERIA.max_cancellation_rate,
    transaction_score: userData.transaction_score >= BNPL_CRITERIA.min_transaction_score,
    fraud_score: userData.fraud_score <= BNPL_CRITERIA.max_fraud_score,
    order_amount: orderAmount <= BNPL_CRITERIA.max_bnpl_amount,
    outstanding_limit: (userData.outstanding_bnpl + orderAmount) <= BNPL_CRITERIA.max_outstanding_bnpl,
  };
  
  // Calculer les scores détaillés
  const criteriaScores = calculateCriteriaScores(userData);
  const finalScore = calculateFinalScore(criteriaScores);
  
  // IMPORTANT: Ne jamais utiliser un seul critère
  // L'éligibilité nécessite que TOUS les critères soient remplis
  // ET un score final suffisant (>= 60)
  const allCriteriaMet = Object.values(criteria).every(v => v === true);
  const isEligible = allCriteriaMet && finalScore >= 60;
  
  // Raisons de refus
  const rejectionReasons = [];
  if (!criteria.account_age) rejectionReasons.push('Compte trop récent');
  if (!criteria.completed_orders) rejectionReasons.push('Pas assez de commandes');
  if (!criteria.cancellation_rate) rejectionReasons.push('Taux d\'annulation élevé');
  if (!criteria.fraud_score) rejectionReasons.push('Vérification de sécurité requise');
  if (!criteria.order_amount) rejectionReasons.push('Montant trop élevé pour BNPL');
  if (!criteria.outstanding_limit) rejectionReasons.push('Limite BNPL atteinte');
  if (finalScore < 60) rejectionReasons.push('Score de confiance insuffisant');
  
  return {
    isEligible,
    score: finalScore,
    maxAmount: BNPL_CRITERIA.max_bnpl_amount,
    criteria,
    criteriaScores,
    rejectionReasons,
    message: isEligible 
      ? 'Mangez maintenant, payez plus tard' 
      : rejectionReasons[0] || 'Non éligible au BNPL',
  };
}

// Obtenir les détails BNPL pour l'UI
export function getBNPLDetails(orderAmount) {
  const eligibility = checkBNPLEligibility(MOCK_USER_DATA, orderAmount);
  
  return {
    ...eligibility,
    // Conditions de paiement
    paymentTerms: {
      dueInDays: 7,
      lateFeePercent: 5,
      reminderDays: [3, 5, 7],
    },
    // Historique BNPL de l'utilisateur
    userHistory: {
      previousBNPL: MOCK_USER_DATA.bnpl_history.length,
      allPaidOnTime: MOCK_USER_DATA.bnpl_history.every(h => h.paid_on_time),
      outstandingAmount: MOCK_USER_DATA.outstanding_bnpl,
    },
  };
}

// Créer une commande BNPL
export async function createBNPLOrder(orderData, amount) {
  const eligibility = checkBNPLEligibility(MOCK_USER_DATA, amount);
  
  if (!eligibility.isEligible) {
    throw new Error(eligibility.rejectionReasons[0] || 'Non éligible au BNPL');
  }
  
  // Simuler la création
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    bnpl_id: `BNPL-${Date.now()}`,
    amount,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  };
}
