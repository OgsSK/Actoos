/**
 * Supabase API Service - Complete replacement for Railway backend
 * All CRUD operations go directly to Supabase PostgREST
 */
import { supabase } from './supabase';

// ==================== INTERVENTIONS ====================
export const interventionsApi = {
  list: async (entrepriseId, filters = {}) => {
    let query = supabase
      .from('interventions')
      .select(`*, client:clients(id, nom, prenom, telephone, adresse, ville, code_postal), technicien:users(id, nom, prenom, telephone)`)
      .eq('entreprise_id', entrepriseId);

    if (filters.statut && filters.statut !== 'all') {
      query = query.eq('statut', filters.statut);
    }
    if (filters.technicien_id) {
      query = query.eq('technicien_id', filters.technicien_id);
    }

    const { data, error } = await query.order('date_prevue', { ascending: false }).limit(filters.limit || 200);
    if (error) throw error;
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('interventions')
      .select(`*, client:clients(*), technicien:users(id, nom, prenom, telephone, email)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (intervention) => {
    const { data, error } = await supabase
      .from('interventions')
      .insert({
        ...intervention,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('interventions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('interventions').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  updateStatut: async (id, statut, extras = {}) => {
    const updates = { statut, updated_at: new Date().toISOString(), ...extras };
    if (statut === 'terminee') {
      updates.date_fin = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('interventions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ==================== CLIENTS ====================
export const clientsApi = {
  list: async (entrepriseId, options = {}) => {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('entreprise_id', entrepriseId);

    if (options.archivedOnly) {
      query = query.eq('statut', 'archive');
    } else {
      query = query.neq('statut', 'archive');
    }

    if (options.search) {
      query = query.or(`nom.ilike.%${options.search}%,prenom.ilike.%${options.search}%,email.ilike.%${options.search}%,telephone.ilike.%${options.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (client) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...client,
        statut: 'actif',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  archive: async (id) => {
    const { data, error } = await supabase
      .from('clients')
      .update({ statut: 'archive', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  restore: async (id) => {
    const { data, error } = await supabase
      .from('clients')
      .update({ statut: 'actif', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getArchivedCount: async (entrepriseId) => {
    const { count, error } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('entreprise_id', entrepriseId)
      .eq('statut', 'archive');
    if (error) throw error;
    return count || 0;
  }
};

// ==================== DEVIS ====================
export const devisApi = {
  list: async (entrepriseId, filters = {}) => {
    let query = supabase
      .from('devis')
      .select(`*, client:clients(id, nom, prenom, email, telephone)`)
      .eq('entreprise_id', entrepriseId);

    if (filters.statut && filters.statut !== 'all') {
      query = query.eq('statut', filters.statut);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(filters.limit || 200);
    if (error) throw error;
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('devis')
      .select(`*, client:clients(*), lignes:devis_lignes(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (devis) => {
    // Generate numero
    const { count } = await supabase
      .from('devis')
      .select('id', { count: 'exact', head: true })
      .eq('entreprise_id', devis.entreprise_id);
    
    const numero = `D-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
    
    const { data, error } = await supabase
      .from('devis')
      .insert({
        ...devis,
        numero,
        statut: 'brouillon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('devis')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('devis').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  updateStatut: async (id, statut) => {
    const { data, error } = await supabase
      .from('devis')
      .update({ statut, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  sign: async (id, signatureData) => {
    const { data, error } = await supabase
      .from('devis')
      .update({
        statut: 'signe',
        signature: signatureData.signature,
        signature_nom: signatureData.nom,
        signature_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ==================== FACTURES ====================
export const facturesApi = {
  list: async (entrepriseId, filters = {}) => {
    let query = supabase
      .from('factures')
      .select(`*, client:clients(id, nom, prenom, email, telephone)`)
      .eq('entreprise_id', entrepriseId);

    if (filters.statut && filters.statut !== 'all') {
      query = query.eq('statut', filters.statut);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(filters.limit || 200);
    if (error) throw error;
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('factures')
      .select(`*, client:clients(*), lignes:facture_lignes(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (facture) => {
    // Generate numero
    const { count } = await supabase
      .from('factures')
      .select('id', { count: 'exact', head: true })
      .eq('entreprise_id', facture.entreprise_id);
    
    const numero = `F-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
    
    const { data, error } = await supabase
      .from('factures')
      .insert({
        ...facture,
        numero,
        statut: 'brouillon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('factures')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('factures').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  updateStatut: async (id, statut) => {
    const updates = { statut, updated_at: new Date().toISOString() };
    if (statut === 'payee') {
      updates.date_paiement = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('factures')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  createFromDevis: async (devisId, entrepriseId) => {
    // Get devis
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select(`*, lignes:devis_lignes(*)`)
      .eq('id', devisId)
      .single();
    if (devisError) throw devisError;

    // Create facture
    const facture = await facturesApi.create({
      entreprise_id: entrepriseId,
      client_id: devis.client_id,
      montant_ht: devis.montant_ht,
      montant_tva: devis.montant_tva,
      montant_total: devis.montant_total,
      devis_id: devisId
    });

    return facture;
  }
};

// ==================== USERS / TECHNICIENS ====================
export const usersApi = {
  list: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  getTechniciens: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .in('role', ['tech', 'technicien'])
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateSkills: async (id, skills) => {
    const { data, error } = await supabase
      .from('users')
      .update({ skills, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ==================== CATEGORIES ====================
export const categoriesApi = {
  list: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  create: async (category) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ==================== ENTREPRISE ====================
export const entrepriseApi = {
  get: async (id) => {
    const { data, error } = await supabase
      .from('entreprises')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('entreprises')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ==================== SITES ====================
export const sitesApi = {
  list: async (clientId) => {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('client_id', clientId)
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  create: async (site) => {
    const { data, error } = await supabase
      .from('sites')
      .insert({
        ...site,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('sites').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ==================== DASHBOARD ====================
export const dashboardApi = {
  getStats: async (entrepriseId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [
      interventionsToday,
      interventionsRetard,
      devisAttente,
      facturesImpayees,
      clients,
      techniciens,
      facturesMois
    ] = await Promise.all([
      supabase.from('interventions').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).gte('date_prevue', todayISO)
        .lt('date_prevue', new Date(today.getTime() + 86400000).toISOString()),
      supabase.from('interventions').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).eq('statut', 'planifiee').lt('date_prevue', todayISO),
      supabase.from('devis').select('id, montant_total', { count: 'exact' })
        .eq('entreprise_id', entrepriseId).eq('statut', 'envoye'),
      supabase.from('factures').select('id, montant_total', { count: 'exact' })
        .eq('entreprise_id', entrepriseId).eq('statut', 'envoyee'),
      supabase.from('clients').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).neq('statut', 'archive'),
      supabase.from('users').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).in('role', ['tech', 'technicien']),
      supabase.from('factures').select('montant_total')
        .eq('entreprise_id', entrepriseId).eq('statut', 'payee').gte('date_paiement', startOfMonth)
    ]);

    return {
      interventions_today: interventionsToday.count || 0,
      interventions_en_retard: interventionsRetard.count || 0,
      devis_en_attente: devisAttente.count || 0,
      montant_devis_attente: devisAttente.data?.reduce((sum, d) => sum + (d.montant_total || 0), 0) || 0,
      factures_impayees: facturesImpayees.count || 0,
      montant_factures_impayees: facturesImpayees.data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0,
      total_clients: clients.count || 0,
      total_techniciens: techniciens.count || 0,
      ca_mois: facturesMois.data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0
    };
  },

  getRecent: async (entrepriseId, limit = 5) => {
    const [interventions, devis, factures] = await Promise.all([
      supabase.from('interventions')
        .select(`id, titre, statut, date_prevue, created_at, client:clients(id, nom, prenom)`)
        .eq('entreprise_id', entrepriseId).order('created_at', { ascending: false }).limit(limit),
      supabase.from('devis')
        .select(`id, numero, statut, montant_total, created_at, client:clients(id, nom, prenom)`)
        .eq('entreprise_id', entrepriseId).order('created_at', { ascending: false }).limit(limit),
      supabase.from('factures')
        .select(`id, numero, statut, montant_total, created_at, client:clients(id, nom, prenom)`)
        .eq('entreprise_id', entrepriseId).order('created_at', { ascending: false }).limit(limit)
    ]);
    
    return {
      interventions: interventions.data || [],
      devis: devis.data || [],
      factures: factures.data || []
    };
  },

  getAlerts: async (entrepriseId) => {
    const today = new Date().toISOString();
    const alerts = [];

    const [facturesRetard, interventionsRetard] = await Promise.all([
      supabase.from('factures')
        .select('id, numero, montant_total, date_echeance')
        .eq('entreprise_id', entrepriseId).eq('statut', 'envoyee').lt('date_echeance', today).limit(5),
      supabase.from('interventions')
        .select('id, titre, date_prevue')
        .eq('entreprise_id', entrepriseId).eq('statut', 'planifiee').lt('date_prevue', today).limit(5)
    ]);

    facturesRetard.data?.forEach(f => {
      alerts.push({ id: `f-${f.id}`, type: 'facture_retard', message: `Facture ${f.numero} en retard`, priority: 'high' });
    });
    interventionsRetard.data?.forEach(i => {
      alerts.push({ id: `i-${i.id}`, type: 'intervention_retard', message: `Intervention "${i.titre}" en retard`, priority: 'medium' });
    });

    return alerts;
  }
};

// ==================== PLANNING ====================
export const planningApi = {
  getInterventions: async (entrepriseId, dateRange = {}) => {
    let query = supabase
      .from('interventions')
      .select(`*, client:clients(id, nom, prenom, adresse, ville), technicien:users(id, nom, prenom)`)
      .eq('entreprise_id', entrepriseId)
      .in('statut', ['planifiee', 'en_cours', 'terminee']);

    if (dateRange.start) {
      query = query.gte('date_prevue', dateRange.start);
    }
    if (dateRange.end) {
      query = query.lte('date_prevue', dateRange.end);
    }

    const { data, error } = await query.order('date_prevue', { ascending: true });
    if (error) throw error;
    return data || [];
  }
};

// Export all APIs
export default {
  interventions: interventionsApi,
  clients: clientsApi,
  devis: devisApi,
  factures: facturesApi,
  users: usersApi,
  categories: categoriesApi,
  entreprise: entrepriseApi,
  sites: sitesApi,
  dashboard: dashboardApi,
  planning: planningApi
};
