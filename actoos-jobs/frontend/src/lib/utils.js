import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import i18n from '../i18n'; // ← instance i18next (à adapter selon ton projet)

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date in French (inchangé)
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Format relative date (multilingue)
export function formatRelative(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - d);
  const diffSeconds = Math.floor(diffTime / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Utilisation directe de la fonction t d’i18next
  const t = i18n.t.bind(i18n);

  if (diffSeconds < 60) return t('time.justNow');
  if (diffMinutes < 60) return t('time.minutesAgo', { count: diffMinutes });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays === 0) return t('time.today');
  if (diffDays === 1) return t('time.yesterday');
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  if (diffDays < 30) return t('time.weeksAgo', { count: Math.floor(diffDays / 7) });
  if (diffDays < 365) return t('time.monthsAgo', { count: Math.floor(diffDays / 30) });
  return t('time.yearsAgo', { count: Math.floor(diffDays / 365) });
}

// Format salary (à remplacer à terme par useCurrencyFormatter dans les composants)
export function formatSalary(min, max, currency = 'XOF') {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  });
  
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }
  if (min) return `À partir de ${formatter.format(min)}`;
  if (max) return `Jusqu'à ${formatter.format(max)}`;
  return 'Non précisé';
}

// Ajouter la période de salaire (jour, heure, forfait) après le montant
export const formatSalaryPeriod = (period, t) => {
  if (!period || period === 'monthly') return '';
  const map = {
    daily: ` / ${t('salaryPeriod.dailyShort', 'jour')}`,
    hourly: ` / ${t('salaryPeriod.hourlyShort', 'heure')}`,
    fixed: ` ${t('salaryPeriod.fixedShort', '(forfait)')}`,
  };
  return map[period] || '';
};

// Truncate text
export function truncate(text, length = 100) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Generate slug
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// ----- Types de contrat (clés de traduction) -----
export const CONTRACT_TYPES = {
  cdi:             { key: 'contractTypes.cdi',              color: 'bg-blue-100 text-blue-700' },
  cdd:             { key: 'contractTypes.cdd',              color: 'bg-green-100 text-green-700' },
  stage:           { key: 'contractTypes.stage',            color: 'bg-purple-100 text-purple-700' },
  alternance:      { key: 'contractTypes.alternance',       color: 'bg-orange-100 text-orange-700' },
  freelance:       { key: 'contractTypes.freelance',        color: 'bg-teal-100 text-teal-700' },
  interim:         { key: 'contractTypes.interim',          color: 'bg-amber-100 text-amber-700' },
  'job-etudiant':  { key: 'contractTypes.jobEtudiant',      color: 'bg-pink-100 text-pink-700' },
  extra:           { key: 'contractTypes.extra',            color: 'bg-indigo-100 text-indigo-700' },
  saisonnier:      { key: 'contractTypes.saisonnier',       color: 'bg-rose-100 text-rose-700' },
  benevolat:       { key: 'contractTypes.benevolat',        color: 'bg-emerald-100 text-emerald-700' },
};

// ----- Niveaux d'expérience (clés de traduction) -----
export const EXPERIENCE_LEVELS = {
  junior:           { key: 'experienceLevels.junior',           color: 'bg-green-100 text-green-700' },
  intermediaire:    { key: 'experienceLevels.intermediaire',    color: 'bg-blue-100 text-blue-700' },
  senior:           { key: 'experienceLevels.senior',           color: 'bg-purple-100 text-purple-700' },
  expert:           { key: 'experienceLevels.expert',           color: 'bg-red-100 text-red-700' },
};