import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date in French
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Format relative date
export function formatRelative(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - d);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  return formatDate(date);
}

// Format salary
export function formatSalary(min, max, currency = 'XOF') {
  const formatter = new Intl.NumberFormat('fr-ML', {
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

// Contract types
export const CONTRACT_TYPES = {
  cdi: { label: 'CDI', color: 'bg-green-100 text-green-700' },
  cdd: { label: 'CDD', color: 'bg-blue-100 text-blue-700' },
  stage: { label: 'Stage', color: 'bg-purple-100 text-purple-700' },
  alternance: { label: 'Alternance', color: 'bg-orange-100 text-orange-700' },
  freelance: { label: 'Freelance', color: 'bg-cyan-100 text-cyan-700' },
  interim: { label: 'Intérim', color: 'bg-yellow-100 text-yellow-700' },
};

// Experience levels
export const EXPERIENCE_LEVELS = {
  junior: { label: 'Junior (0-2 ans)', value: 'junior' },
  intermediaire: { label: 'Intermédiaire (2-5 ans)', value: 'intermediaire' },
  senior: { label: 'Senior (5-10 ans)', value: 'senior' },
  expert: { label: 'Expert (10+ ans)', value: 'expert' },
};

// Job categories
export const JOB_CATEGORIES = [
  { id: 'tech', label: 'Technologie & IT', icon: '💻' },
  { id: 'marketing', label: 'Marketing & Communication', icon: '📢' },
  { id: 'finance', label: 'Finance & Comptabilité', icon: '💰' },
  { id: 'rh', label: 'Ressources Humaines', icon: '👥' },
  { id: 'commerce', label: 'Commerce & Vente', icon: '🛒' },
  { id: 'sante', label: 'Santé & Médical', icon: '🏥' },
  { id: 'education', label: 'Éducation & Formation', icon: '📚' },
  { id: 'btp', label: 'BTP & Construction', icon: '🏗️' },
  { id: 'transport', label: 'Transport & Logistique', icon: '🚚' },
  { id: 'agriculture', label: 'Agriculture & Environnement', icon: '🌱' },
  { id: 'tourisme', label: 'Tourisme & Hôtellerie', icon: '✈️' },
  { id: 'juridique', label: 'Juridique & Droit', icon: '⚖️' },
];

// Cities in Mali
export const CITIES_MALI = [
  'Bamako',
  'Sikasso',
  'Mopti',
  'Koutiala',
  'Ségou',
  'Kayes',
  'Gao',
  'Kati',
  'Tombouctou',
  'San',
];
