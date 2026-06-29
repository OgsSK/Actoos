export const PLAN_LIMITS = {
  free: {
    jobs: 3,
    members: 1,
    expirationDays: 15,
    canUseInterviewTools: false,
    canAccessCvBank: false,
    canCreateMultipleCompanies: false,
    hasFreeBoost: false,
    hasBadge: false,
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
    canUseInterviewTools: true,
    canAccessCvBank: false,
    canCreateMultipleCompanies: false,
    hasFreeBoost: false,
    hasBadge: true,
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
    canUseInterviewTools: true,
    canAccessCvBank: true,
    canCreateMultipleCompanies: true,
    hasFreeBoost: true,
    hasBadge: true,
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
    canUseInterviewTools: true,
    canAccessCvBank: true,
    canCreateMultipleCompanies: true,
    hasFreeBoost: true,
    hasBadge: true,
    hasStats: true,
    hasApi: true,
    hasExport: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
  },
};

// ✅ Fonctions existantes remises
export function getPlanLimit(plan, attribute = 'jobs') {
  const planData = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return planData[attribute] ?? PLAN_LIMITS.free[attribute];
}

export function getExpirationDays(plan) {
  return getPlanLimit(plan, 'expirationDays');
}

// ✅ Nouvelle fonction pour les droits
export function planHasFeature(plan, feature) {
  const planData = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return Boolean(planData[feature]);
}