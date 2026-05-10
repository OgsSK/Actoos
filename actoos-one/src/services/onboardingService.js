/**
 * ACTOOS ONE - Onboarding Service
 * 
 * Service pour les inscriptions livreurs et partenaires.
 * PRODUCTION MODE - Toutes les données sont enregistrées dans Supabase.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Soumettre une demande d'inscription livreur
 */
export async function submitDriverOnboarding(data) {
  const payload = {
    type: 'driver',
    payload: {
      full_name: data.fullName,
      phone: data.phone,
      vehicle_type: data.vehicle,
      id_number: data.idNumber || null,
      neighborhood: data.neighborhood,
      consent_caution: data.consentCaution,
    },
    status: 'pending',
  };

  if (!isSupabaseConfigured()) {
    console.error('Supabase non configuré');
    return { data: null, error: { message: 'Configuration Supabase manquante' } };
  }

  try {
    const { data: result, error } = await supabase
      .from('onboarding_requests')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Demande livreur enregistrée:', result.id);
    return { data: result, error: null };
  } catch (error) {
    console.error('Erreur submitDriverOnboarding:', error);
    return { data: null, error };
  }
}

/**
 * Soumettre une demande d'inscription partenaire
 */
export async function submitPartnerOnboarding(data) {
  const payload = {
    type: 'partner',
    payload: {
      establishment_name: data.establishmentName,
      category: data.category,
      city_neighborhood: data.cityNeighborhood,
      manager_name: data.managerName,
      phone: data.phone,
      legal_id: data.legalId || null,
      delivery_model: data.deliveryModel,
      consent_representative: data.consentRepresentative,
    },
    status: 'pending',
  };

  if (!isSupabaseConfigured()) {
    console.error('Supabase non configuré');
    return { data: null, error: { message: 'Configuration Supabase manquante' } };
  }

  try {
    const { data: result, error } = await supabase
      .from('onboarding_requests')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Demande partenaire enregistrée:', result.id);
    return { data: result, error: null };
  } catch (error) {
    console.error('Erreur submitPartnerOnboarding:', error);
    return { data: null, error };
  }
}

/**
 * Récupérer les demandes d'inscription (Admin)
 */
export async function getOnboardingRequests(options = {}) {
  const { type = null, status = null, limit = 50 } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: { message: 'Supabase non configuré' } };
  }

  try {
    let query = supabase
      .from('onboarding_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur getOnboardingRequests:', error);
    return { data: [], error };
  }
}

/**
 * Approuver une demande d'inscription (Admin)
 */
export async function approveOnboardingRequest(requestId, adminId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('onboarding_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur approveOnboardingRequest:', error);
    return { data: null, error };
  }
}

/**
 * Rejeter une demande d'inscription (Admin)
 */
export async function rejectOnboardingRequest(requestId, adminId, reason) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase non configuré' } };
  }

  try {
    const { data, error } = await supabase
      .from('onboarding_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        admin_note: reason,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur rejectOnboardingRequest:', error);
    return { data: null, error };
  }
}

export default {
  submitDriverOnboarding,
  submitPartnerOnboarding,
  getOnboardingRequests,
  approveOnboardingRequest,
  rejectOnboardingRequest,
};
