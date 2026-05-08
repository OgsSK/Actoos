/**
 * ACTOOS PRO - Configuration centralisée
 * Ce fichier centralise toutes les URLs et configurations pour le déploiement
 */

// Domaines de production
export const DOMAINS = {
  // Site vitrine corporate (Hub)
  CORPORATE: 'https://actoos.com',
  
  // ACTOOS PRO - SaaS B2B (cette application)
  PRO: 'https://pro.actoos.com',
  PRO_API: 'https://pro.actoos.com/api',
  
  // ACTOOS ONE - Super-App Afrique
  ONE: 'https://one.actoos.com',
  
  // Email contact
  CONTACT_EMAIL: 'contact@actoos.com',
  
  // Demo account
  DEMO_EMAIL: 'demo@actoos.com'
};

// Configuration de l'application
export const APP_CONFIG = {
  // Nom de l'application
  APP_NAME: 'ACTOOS PRO',
  
  // Slogan
  SLOGAN: 'Run your business, simply.',
  
  // Description
  DESCRIPTION: 'Application professionnelle pour la gestion d\'interventions terrain, devis et factures',
  
  // Couleurs du thème
  THEME: {
    PRIMARY: '#22C55E', // Vert émeraude
    SECONDARY: '#3B82F6', // Bleu
    ACCENT: '#10B981' // Vert
  },
  
  // Tarifs (synchronisés avec le backend)
  PRICING: {
    STARTUP: { monthly: 19.99, yearly: 191.90 },
    PRO: { monthly: 49.99, yearly: 479.90 },
    ENTERPRISE: { monthly: 89.99, yearly: 863.90 }
  },
  
  // Durée essai gratuit
  TRIAL_DAYS: 14,
  
  // Limites par plan (synchronisées avec plan_limits.py)
  PLAN_LIMITS: {
    free: { techniciens: 1, interventions_mois: 10, clients: 20, categories: 3, devis_mois: 5 },
    startup: { techniciens: 3, interventions_mois: 100, clients: 100, categories: 10, devis_mois: 50 },
    pro: { techniciens: 10, interventions_mois: 500, clients: 500, categories: 50, devis_mois: 200 },
    enterprise: { techniciens: -1, interventions_mois: -1, clients: -1, categories: -1, devis_mois: -1 } // -1 = illimité
  }
};

// URLs des réseaux sociaux (à configurer)
export const SOCIAL_LINKS = {
  LINKEDIN: 'https://linkedin.com/company/actoos',
  TWITTER: 'https://twitter.com/actoos',
  FACEBOOK: 'https://facebook.com/actoos'
};

// Configuration PWA
export const PWA_CONFIG = {
  SHORT_NAME: 'ACTOOS PRO',
  NAME: 'ACTOOS PRO - Run your business, simply.',
  THEME_COLOR: '#22C55E',
  BACKGROUND_COLOR: '#FFFFFF'
};

// Obtenir l'URL de base selon l'environnement
export const getBaseUrl = () => {
  // En développement/preview, utiliser la variable d'environnement
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  // En production, utiliser le domaine pro.actoos.com
  return DOMAINS.PRO;
};

// Obtenir l'URL de l'API
export const getApiUrl = () => {
  return `${getBaseUrl()}/api`;
};

export default {
  DOMAINS,
  APP_CONFIG,
  SOCIAL_LINKS,
  PWA_CONFIG,
  getBaseUrl,
  getApiUrl
};
