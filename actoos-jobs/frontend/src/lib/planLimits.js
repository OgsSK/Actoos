// src/lib/planLimits.js
// Centralise toutes les limites et durées par plan d'abonnement
// Modifier ces valeurs pour ajuster les offres

export const PLAN_LIMITS = {
  free: {
    jobs: 3,               // offres actives max
    members: 1,            // membres max (propriétaire inclus)
    expirationDays: 15,    // durée de vie d'une offre
    hasStats: false,
    hasApi: false,
    hasExport: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  pro: {
    jobs: 25,
    members: 5,
    expirationDays: 30,
    hasStats: true,
    hasApi: false,
    hasExport: false,
    hasPrioritySupport: true,
    hasCustomBranding: false,
  },
  business: {
    jobs: Infinity,
    members: Infinity,
    expirationDays: 60,
    hasStats: true,
    hasApi: true,
    hasExport: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
  },
  enterprise: {
    jobs: Infinity,
    members: Infinity,
    expirationDays: 90,
    hasStats: true,
    hasApi: true,
    hasExport: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
  },
};

// Retourne la limite pour un attribut donné (jobs, members, etc.)
export function getPlanLimit(plan, attribute = 'jobs') {
  const planData = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return planData[attribute] ?? PLAN_LIMITS.free[attribute];
}

// Retourne la durée d'expiration en jours
export function getExpirationDays(plan) {
  return getPlanLimit(plan, 'expirationDays');
}

// Vérifie si un plan possède une fonctionnalité
export function planHasFeature(plan, feature) {
  const planData = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return Boolean(planData[feature]);
}