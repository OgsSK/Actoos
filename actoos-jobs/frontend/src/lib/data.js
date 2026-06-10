import { supabase } from './supabase';

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

  // On place "Autre" à la fin
  const autres = data.filter(cat => cat.slug === 'autre');
  const autresSansAutre = data.filter(cat => cat.slug !== 'autre');
  return [...autresSansAutre, ...autres];
}

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

export async function fetchActiveJobsCount() {
  const { count, error } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  if (error) {
    console.error('fetchActiveJobsCount error:', error);
    return 0;
  }
  return count || 0;
}

export async function fetchVerifiedCompaniesCount() {
  const { count, error } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_verified', true);
  if (error) { console.error(error); return 0; }
  return count || 0;
}

export async function fetchCandidatesCount() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'candidate');
  if (error) {
    console.error('fetchCandidatesCount error:', error);
    return 0;
  }
  return count || 0;
}