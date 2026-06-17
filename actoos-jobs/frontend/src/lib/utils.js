import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import i18n from '../i18n'; // ← instance i18next (à adapter selon ton projet)

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date in French (inchangé – pour l'instant, tu peux le garder tel quel)
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Format relative date (maintenant multilingue)
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

// Format salary in FCFA (default)
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

// Contract types (fixed enum)
export const CONTRACT_TYPES = {
  cdi:             { label: 'CDI',              color: 'bg-green-100 text-green-700' },
  cdd:             { label: 'CDD',              color: 'bg-blue-100 text-blue-700' },
  stage:           { label: 'Stage',            color: 'bg-purple-100 text-purple-700' },
  alternance:      { label: 'Alternance',       color: 'bg-orange-100 text-orange-700' },
  freelance:       { label: 'Freelance',        color: 'bg-cyan-100 text-cyan-700' },
  interim:         { label: 'Intérim',          color: 'bg-yellow-100 text-yellow-700' },
  'job-etudiant':  { label: 'Job étudiant',     color: 'bg-teal-100 text-teal-700' },
  extra:           { label: 'Extra',            color: 'bg-pink-100 text-pink-700' },
  saisonnier:      { label: 'Saisonnier',       color: 'bg-lime-100 text-lime-700' },
  benevolat:       { label: 'Bénévolat',        color: 'bg-indigo-100 text-indigo-700' },
};

// Experience levels (fixed enum)
export const EXPERIENCE_LEVELS = {
  junior: { label: 'Junior (0-2 ans)', value: 'junior' },
  intermediaire: { label: 'Intermédiaire (2-5 ans)', value: 'intermediaire' },
  senior: { label: 'Senior (5-10 ans)', value: 'senior' },
  expert: { label: 'Expert (10+ ans)', value: 'expert' },
};