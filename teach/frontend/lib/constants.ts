// ============================================================
// RATE PERIODS — périodes de tarif
// ============================================================
export const RATE_PERIODS = [
  {
    value: 'hourly',
    labelFr: 'Par heure',
    labelEn: 'Per hour',
    suffixFr: 'FCFA / h',
    suffixEn: 'FCFA / hr',
  },
  {
    value: 'session',
    labelFr: 'Par séance',
    labelEn: 'Per session',
    suffixFr: 'FCFA / séance',
    suffixEn: 'FCFA / session',
  },
  {
    value: 'weekly',
    labelFr: 'Par semaine',
    labelEn: 'Per week',
    suffixFr: 'FCFA / semaine',
    suffixEn: 'FCFA / wk',
  },
  {
    value: 'monthly',
    labelFr: 'Par mois',
    labelEn: 'Per month',
    suffixFr: 'FCFA / mois',
    suffixEn: 'FCFA / mo',
  },
] as const;

export type RatePeriod = typeof RATE_PERIODS[number]['value'];
// ============================================================
// BRAND — nom du produit, centralisé
// ============================================================
export const BRAND = {
  name: 'Kalanden',
  tagline: {
    fr: 'Pour chaque enfant, le bon prof.',
    en: 'For every child, the right teacher.',
  },
  // description courte — réutilisable partout (meta, footer, etc.)
  short: {
    fr: 'La plateforme qui relie parents et enseignants.',
    en: 'The platform connecting parents and teachers.',
  },
};

export const TEACHING_MODES = [
  { value: 'online', labelFr: 'En ligne', labelEn: 'Online' },
  { value: 'home', labelFr: 'À domicile', labelEn: 'At home' },
  { value: 'both', labelFr: 'Les deux', labelEn: 'Both' },
] as const;

export const TEACHING_LANGUAGES = [
  { code: 'fr', labelFr: 'Français', labelEn: 'French' },
  { code: 'en', labelFr: 'Anglais', labelEn: 'English' },
  { code: 'es', labelFr: 'Espagnol', labelEn: 'Spanish' },
  { code: 'ar', labelFr: 'Arabe', labelEn: 'Arabic' },
];

export const LANGUAGE_LEVELS = [
  { value: 'basic', labelFr: 'Débutant', labelEn: 'Basic' },
  { value: 'intermediate', labelFr: 'Intermédiaire', labelEn: 'Intermediate' },
  { value: 'fluent', labelFr: 'Courant', labelEn: 'Fluent' },
  { value: 'native', labelFr: 'Langue maternelle', labelEn: 'Native' },
];

export const MAX_SUBJECTS_PER_TEACHER = 5;