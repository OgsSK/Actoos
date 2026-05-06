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

  delete: async (id) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
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
  },

  getInvites: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('user_invites')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  invite: async (inviteData) => {
    // Generate invite token
    const inviteToken = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('user_invites')
      .insert({
        ...inviteData,
        invite_token: inviteToken,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Note: Actual SMS/Email sending requires Edge Function
    return { ...data, invite_token: inviteToken };
  },

  resendInvite: async (inviteId) => {
    // Update invite timestamp and trigger resend
    const { data, error } = await supabase
      .from('user_invites')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', inviteId)
      .select()
      .single();
    
    if (error) throw error;
    // Note: Actual SMS sending requires Edge Function
    return data;
  },

  cancelInvite: async (inviteId) => {
    const { error } = await supabase
      .from('user_invites')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', inviteId);
    
    if (error) throw error;
    return true;
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

  getById: async (id) => {
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
  },

  uploadLogo: async (entrepriseId, file) => {
    const fileName = `logos/${entrepriseId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('entreprise-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      // Try to create bucket and retry
      console.error('Upload error:', uploadError);
      throw new Error('Erreur lors du téléchargement du logo');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('entreprise-assets')
      .getPublicUrl(fileName);

    // Update entreprise with new logo URL
    await supabase
      .from('entreprises')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', entrepriseId);

    return publicUrl;
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

// ==================== STATS / RAPPORTS ====================
export const statsApi = {
  getStats: async (entrepriseId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [
      interventionsToday,
      interventionsTerminees,
      interventionsEnRetard,
      devisAttente,
      devisSignesMois,
      facturesEnAttente,
      facturesPayeesMois,
      facturesEnRetard,
      clientsTotal,
      techniciensActifs
    ] = await Promise.all([
      supabase.from('interventions').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).gte('date_prevue', todayISO)
        .lt('date_prevue', new Date(today.getTime() + 86400000).toISOString()),
      supabase.from('interventions').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).eq('statut', 'terminee')
        .gte('date_fin', startOfMonth).lte('date_fin', endOfMonth),
      supabase.from('interventions').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).eq('statut', 'planifiee').lt('date_prevue', todayISO),
      supabase.from('devis').select('id, montant_total', { count: 'exact' })
        .eq('entreprise_id', entrepriseId).eq('statut', 'envoye'),
      supabase.from('devis').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).eq('statut', 'signe').gte('updated_at', startOfMonth),
      supabase.from('factures').select('id, montant_total', { count: 'exact' })
        .eq('entreprise_id', entrepriseId).in('statut', ['envoyee', 'partiel']),
      supabase.from('factures').select('montant_total')
        .eq('entreprise_id', entrepriseId).eq('statut', 'payee').gte('date_paiement', startOfMonth),
      supabase.from('factures').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).eq('statut', 'envoyee').lt('date_echeance', todayISO),
      supabase.from('clients').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).neq('statut', 'archive'),
      supabase.from('users').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).in('role', ['tech', 'technicien'])
    ]);

    const montantDevisAttente = devisAttente.data?.reduce((sum, d) => sum + (d.montant_total || 0), 0) || 0;
    const montantFacturesImpayees = facturesEnAttente.data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;
    const caMois = facturesPayeesMois.data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;
    const totalDevis = (devisAttente.count || 0) + (devisSignesMois.count || 0);
    const tauxConversion = totalDevis > 0 ? Math.round(((devisSignesMois.count || 0) / totalDevis) * 100) : 0;

    return {
      interventions: {
        today: interventionsToday.count || 0,
        terminees: interventionsTerminees.count || 0,
        en_retard: interventionsEnRetard.count || 0
      },
      devis: {
        en_attente: devisAttente.count || 0,
        signes_mois: devisSignesMois.count || 0,
        total: totalDevis,
        montant_total: montantDevisAttente
      },
      factures: {
        en_attente: facturesEnAttente.count || 0,
        pending_amount: montantFacturesImpayees,
        en_retard: facturesEnRetard.count || 0,
        payees_mois: facturesPayeesMois.data?.length || 0
      },
      clients: clientsTotal.count || 0,
      techniciens_actifs: techniciensActifs.count || 0,
      ca_mois: caMois,
      taux_conversion: tauxConversion
    };
  },

  getMonthlyRevenue: async (entrepriseId) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = date.toISOString();
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      const { data } = await supabase
        .from('factures')
        .select('montant_total')
        .eq('entreprise_id', entrepriseId)
        .eq('statut', 'payee')
        .gte('date_paiement', startOfMonth)
        .lte('date_paiement', endOfMonth);
      
      const revenue = data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;
      months.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue
      });
    }
    
    return months;
  },

  getTopClients: async (entrepriseId) => {
    // Get clients with their total revenue from paid invoices
    const { data: factures } = await supabase
      .from('factures')
      .select('client_id, montant_total')
      .eq('entreprise_id', entrepriseId)
      .eq('statut', 'payee');

    if (!factures || factures.length === 0) return [];

    // Group by client
    const clientRevenue = {};
    factures.forEach(f => {
      if (f.client_id) {
        clientRevenue[f.client_id] = (clientRevenue[f.client_id] || 0) + (f.montant_total || 0);
      }
    });

    // Get top 5 client IDs sorted by revenue
    const topClientIds = Object.entries(clientRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    if (topClientIds.length === 0) return [];

    // Fetch client details
    const { data: clients } = await supabase
      .from('clients')
      .select('id, nom, prenom')
      .in('id', topClientIds);

    // Count interventions per client
    const { data: interventionCounts } = await supabase
      .from('interventions')
      .select('client_id')
      .eq('entreprise_id', entrepriseId)
      .in('client_id', topClientIds);

    const interventionsByClient = {};
    interventionCounts?.forEach(i => {
      interventionsByClient[i.client_id] = (interventionsByClient[i.client_id] || 0) + 1;
    });

    // Build result
    return topClientIds.map(clientId => {
      const client = clients?.find(c => c.id === clientId) || {};
      return {
        id: clientId,
        nom: client.nom || 'Client',
        prenom: client.prenom || '',
        total_ca: clientRevenue[clientId],
        interventions: interventionsByClient[clientId] || 0
      };
    });
  }
};

// ==================== DOCUMENT SETTINGS ====================
export const settingsApi = {
  getDocumentSettings: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('entreprises')
      .select('conditions_generales, message_client_devis, message_client_facture, validite_devis_jours, devis_footer, facture_footer, conditions_paiement, delai_paiement_jours, mentions_legales, prefixe_devis, prefixe_facture')
      .eq('id', entrepriseId)
      .single();
    if (error) throw error;
    return data || {};
  },

  updateDocumentSettings: async (entrepriseId, settings) => {
    const { data, error } = await supabase
      .from('entreprises')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', entrepriseId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getCurrencies: () => {
    return Promise.resolve([
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'USD', symbol: '$', name: 'Dollar US' },
      { code: 'GBP', symbol: '£', name: 'Livre sterling' },
      { code: 'CHF', symbol: 'CHF', name: 'Franc suisse' }
    ]);
  },

  getLocales: () => {
    return Promise.resolve([
      { code: 'fr-FR', name: 'Français (France)' },
      { code: 'fr-BE', name: 'Français (Belgique)' },
      { code: 'fr-CH', name: 'Français (Suisse)' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'nl-BE', name: 'Nederlands (België)' }
    ]);
  },

  getSmsStatus: async (entrepriseId) => {
    const { data } = await supabase
      .from('entreprises')
      .select('sms_config')
      .eq('id', entrepriseId)
      .single();
    
    const config = data?.sms_config || {};
    return {
      configured: !!config.twilio_account_sid || config.use_shared === true,
      use_shared: config.use_shared !== false,
      shared_available: true,
      has_custom_config: !!config.twilio_account_sid,
      phone_number: config.twilio_phone_number,
      mode: config.use_shared !== false ? 'shared' : 'custom'
    };
  },

  getIntegrationsStatus: async (entrepriseId) => {
    const { data } = await supabase
      .from('entreprises')
      .select('integrations_config, messaging_preference')
      .eq('id', entrepriseId)
      .single();
    
    const config = data?.integrations_config || {};
    return {
      whatsapp: {
        configured: !!config.whatsapp?.access_token || config.whatsapp?.use_shared === true,
        use_shared: config.whatsapp?.use_shared !== false,
        shared_available: true,
        has_custom_config: !!config.whatsapp?.access_token,
        mode: config.whatsapp?.use_shared !== false ? 'shared' : 'custom'
      },
      google_calendar: {
        connected: !!config.google_calendar?.refresh_token,
        shared_available: true,
        has_custom_config: !!config.google_calendar?.client_id
      },
      messaging_preference: data?.messaging_preference || 'email'
    };
  }
};

// ==================== TECHNICIAN APP SPECIFIC ====================
export const technicianApi = {
  getTodayInterventions: async (entrepriseId, technicienId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const tomorrowISO = new Date(today.getTime() + 86400000).toISOString();

    const { data, error } = await supabase
      .from('interventions')
      .select(`*, client:clients(id, nom, prenom, telephone, adresse, ville, code_postal), technicien:users(id, nom, prenom)`)
      .eq('entreprise_id', entrepriseId)
      .eq('technicien_id', technicienId)
      .gte('date_prevue', todayISO)
      .lt('date_prevue', tomorrowISO)
      .order('date_prevue', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  getWeekInterventions: async (entrepriseId, technicienId, startDate, endDate) => {
    let query = supabase
      .from('interventions')
      .select(`*, client:clients(id, nom, prenom, telephone, adresse, ville, code_postal), technicien:users(id, nom, prenom)`)
      .eq('entreprise_id', entrepriseId)
      .eq('technicien_id', technicienId)
      .gte('date_prevue', startDate)
      .lte('date_prevue', endDate)
      .order('date_prevue', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  getAvailableInterventions: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('interventions')
      .select(`*, client:clients(id, nom, prenom, adresse, ville), categorie:categories(id, nom, couleur)`)
      .eq('entreprise_id', entrepriseId)
      .is('technicien_id', null)
      .eq('statut', 'planifiee')
      .order('date_prevue', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  getAvailableCount: async (entrepriseId) => {
    const { count, error } = await supabase
      .from('interventions')
      .select('id', { count: 'exact', head: true })
      .eq('entreprise_id', entrepriseId)
      .is('technicien_id', null)
      .eq('statut', 'planifiee');
    
    if (error) throw error;
    return count || 0;
  },

  claimIntervention: async (interventionId, technicienId) => {
    const { data, error } = await supabase
      .from('interventions')
      .update({ 
        technicien_id: technicienId,
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)
      .is('technicien_id', null)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  unclaimIntervention: async (interventionId) => {
    const { data, error } = await supabase
      .from('interventions')
      .update({ 
        technicien_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  startIntervention: async (interventionId, geoData = null) => {
    const updates = {
      statut: 'en_cours',
      date_debut: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (geoData) {
      updates.geo_start = geoData;
    }
    
    const { data, error } = await supabase
      .from('interventions')
      .update(updates)
      .eq('id', interventionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  completeIntervention: async (interventionId, completionData = {}) => {
    const { data, error } = await supabase
      .from('interventions')
      .update({
        statut: 'terminee',
        date_fin: new Date().toISOString(),
        rapport: completionData.rapport,
        signature_client: completionData.signature,
        signature_nom: completionData.signature_nom,
        checklist_responses: completionData.checklist_responses,
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getDevisForTech: async (entrepriseId, technicienId) => {
    const { data, error } = await supabase
      .from('devis')
      .select(`*, client:clients(id, nom, prenom, email, telephone)`)
      .eq('entreprise_id', entrepriseId)
      .eq('created_by', technicienId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  },

  signDevis: async (devisId, signatureData) => {
    const { data, error } = await supabase
      .from('devis')
      .update({
        statut: 'signe',
        signature: signatureData.signature,
        signature_nom: signatureData.nom,
        signature_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', devisId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ==================== PHOTOS ====================
export const photosApi = {
  getForIntervention: async (interventionId) => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  upload: async (interventionId, file, typePhoto = 'pendant') => {
    // For now, we'll store photos directly in Supabase Storage
    const fileName = `${interventionId}/${Date.now()}_${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    // Create photo record
    const { data, error } = await supabase
      .from('photos')
      .insert({
        intervention_id: interventionId,
        url: publicUrl,
        type_photo: typePhoto,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (photoId) => {
    // Get photo to get file path
    const { data: photo } = await supabase
      .from('photos')
      .select('url')
      .eq('id', photoId)
      .single();

    // Delete from storage if URL exists
    if (photo?.url) {
      const path = photo.url.split('/photos/')[1];
      if (path) {
        await supabase.storage.from('photos').remove([path]);
      }
    }

    // Delete record
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);
    
    if (error) throw error;
    return true;
  }
};

// ==================== AUTH HELPER ====================
export const authApi = {
  activateAccount: async (token, password) => {
    // This will be handled by Edge Function
    const response = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/activate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      }
    );
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Activation failed');
    }
    return response.json();
  },

  changePassword: async (currentPassword, newPassword) => {
    // Use Supabase Auth to change password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return { success: true };
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
  planning: planningApi,
  stats: statsApi,
  settings: settingsApi,
  technician: technicianApi,
  photos: photosApi,
  auth: authApi
};
