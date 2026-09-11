// Bibliothèque d'étapes classiques pour les projets.
export type StepCategory = 'cadrage' | 'design' | 'dev' | 'tests' | 'deploiement';

export interface StepTemplate {
  id: string;
  labelFr: string;
  labelEn: string;
  category: StepCategory;
}

export const STEP_CATEGORIES: { id: StepCategory; labelFr: string; labelEn: string }[] = [
  { id: 'cadrage', labelFr: 'Cadrage', labelEn: 'Framing' },
  { id: 'design', labelFr: 'Design', labelEn: 'Design' },
  { id: 'dev', labelFr: 'Développement', labelEn: 'Development' },
  { id: 'tests', labelFr: 'Tests', labelEn: 'Tests' },
  { id: 'deploiement', labelFr: 'Déploiement', labelEn: 'Deployment' },
];

export const STEP_LIBRARY: StepTemplate[] = [
  // Cadrage
  { id: 'decouverte', labelFr: 'Découverte / Échange client', labelEn: 'Discovery / Client meeting', category: 'cadrage' },
  { id: 'analyse-besoins', labelFr: 'Analyse des besoins', labelEn: 'Needs analysis', category: 'cadrage' },
  { id: 'cahier-charges', labelFr: 'Rédaction du cahier des charges', labelEn: 'Specifications writing', category: 'cadrage' },
  { id: 'validation-perimetre', labelFr: 'Validation du périmètre', labelEn: 'Scope validation', category: 'cadrage' },
  { id: 'devis', labelFr: 'Devis et contractualisation', labelEn: 'Quote and contracting', category: 'cadrage' },

  // Design
  { id: 'wireframes', labelFr: 'Wireframes', labelEn: 'Wireframes', category: 'design' },
  { id: 'maquettes', labelFr: 'Maquettes UI', labelEn: 'UI mockups', category: 'design' },
  { id: 'design-system', labelFr: 'Design system', labelEn: 'Design system', category: 'design' },
  { id: 'prototype', labelFr: 'Prototype interactif', labelEn: 'Interactive prototype', category: 'design' },
  { id: 'validation-design', labelFr: 'Validation design client', labelEn: 'Client design approval', category: 'design' },

  // Développement
  { id: 'architecture', labelFr: 'Architecture technique', labelEn: 'Technical architecture', category: 'dev' },
  { id: 'db', labelFr: 'Base de données', labelEn: 'Database', category: 'dev' },
  { id: 'frontend', labelFr: 'Développement frontend', labelEn: 'Frontend development', category: 'dev' },
  { id: 'backend', labelFr: 'Développement backend', labelEn: 'Backend development', category: 'dev' },
  { id: 'api', labelFr: 'Intégration API', labelEn: 'API integration', category: 'dev' },
  { id: 'auth', labelFr: 'Authentification', labelEn: 'Authentication', category: 'dev' },
  { id: 'paiement', labelFr: 'Paiement / Stripe', labelEn: 'Payment / Stripe', category: 'dev' },
  { id: 'notifications', labelFr: 'Notifications / Emails', labelEn: 'Notifications / Emails', category: 'dev' },
  { id: 'admin-panel', labelFr: 'Back-office / Admin', labelEn: 'Back-office / Admin', category: 'dev' },

  // Tests
  { id: 'tests-unitaires', labelFr: 'Tests unitaires', labelEn: 'Unit tests', category: 'tests' },
  { id: 'tests-integration', labelFr: "Tests d'intégration", labelEn: 'Integration tests', category: 'tests' },
  { id: 'tests-utilisateurs', labelFr: 'Tests utilisateurs', labelEn: 'User testing', category: 'tests' },
  { id: 'recette-client', labelFr: 'Recette client', labelEn: 'Client acceptance', category: 'tests' },
  { id: 'corrections', labelFr: 'Corrections / Ajustements', labelEn: 'Fixes / Adjustments', category: 'tests' },

  // Déploiement
  { id: 'staging', labelFr: 'Déploiement staging', labelEn: 'Staging deployment', category: 'deploiement' },
  { id: 'validation-staging', labelFr: 'Validation staging', labelEn: 'Staging validation', category: 'deploiement' },
  { id: 'production', labelFr: 'Déploiement production', labelEn: 'Production deployment', category: 'deploiement' },
  { id: 'formation', labelFr: 'Formation client', labelEn: 'Client training', category: 'deploiement' },
  { id: 'documentation', labelFr: 'Documentation', labelEn: 'Documentation', category: 'deploiement' },
  { id: 'maintenance', labelFr: 'Maintenance / Support', labelEn: 'Maintenance / Support', category: 'deploiement' },
];