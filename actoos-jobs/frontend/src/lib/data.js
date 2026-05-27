import { supabase } from './supabase';

/**
 * Récupère toutes les catégories d'emploi actives
 */
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('job_categories')
    .select('id, slug, name, icon')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Séparer "Autre" des autres catégories
  const autres = data.filter(cat => cat.slug === 'autre');
  const autresSansAutre = data.filter(cat => cat.slug !== 'autre');

  // Retourner : toutes les catégories (triées par nom) puis "Autre" à la fin
  return [...autresSansAutre, ...autres];
}

/**
 * Récupère toutes les villes actives
 */
export async function fetchCities() {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
  return data || [];
}

/**
 * Récupère le nombre d'offres actives
 */
export async function fetchActiveJobsCount() {
  const { count, error } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  if (error) return 0;
  return count || 0;
}

/**
 * Récupère le nombre d'entreprises vérifiées
 */
export async function fetchVerifiedCompaniesCount() {
  const { count, error } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true);
  if (error) return 0;
  return count || 0;
}

/**
 * Récupère le nombre de candidats inscrits
 */
export async function fetchCandidatesCount() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'candidate');
  if (error) return 0;
  return count || 0;
}