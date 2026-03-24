import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'HH:mm', { locale: fr });
  } catch {
    return dateString;
  }
};

export const formatRelative = (dateString) => {
  if (!dateString) return '';
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true, locale: fr });
  } catch {
    return dateString;
  }
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
};

export const getDateLabel = (dateString) => {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEEE d MMMM', { locale: fr });
  } catch {
    return dateString;
  }
};

export const isOverdue = (dateString) => {
  if (!dateString) return false;
  try {
    return isPast(parseISO(dateString));
  } catch {
    return false;
  }
};

export const statusLabels = {
  // Interventions
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
  // Devis
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  signe: 'Signé',
  refuse: 'Refusé',
  expire: 'Expiré',
  facture: 'Facturé',
  // Factures
  emise: 'Émise',
  payee: 'Payée',
  en_retard: 'En retard',
};

export const getStatusLabel = (status) => {
  return statusLabels[status] || status;
};

export const priorityLabels = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
};

export const getPriorityLabel = (priority) => {
  return priorityLabels[priority] || priority;
};

export const priorityColors = {
  basse: 'bg-slate-100 text-slate-700',
  normale: 'bg-blue-100 text-blue-700',
  haute: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700',
};
