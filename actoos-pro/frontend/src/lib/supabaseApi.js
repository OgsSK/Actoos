/**
 * Supabase-only API Service
 * All functionality via Supabase - No Railway/MongoDB
 * 
 * Reference: /app/actoos-pro/docs/SCHEMA_SUPABASE.md
 */
import { supabase } from './supabase';
import { cachedFetch, cacheService } from './cacheService';

// Cache keys
const CACHE_KEYS = {
  interventions: (id) => `interventions_${id}`,
  clients: (id) => `clients_${id}`,
  techniciens: (id) => `techniciens_${id}`,
  devis: (id) => `devis_${id}`,
  factures: (id) => `factures_${id}`,
  categories: (id) => `categories_${id}`,
  dashboard: (id) => `dashboard_${id}`,
};

// ==================== INTERVENTIONS ====================
export const interventionsApi = {
  list: async (entrepriseId, filters = {}) => {
    const cacheKey = `${CACHE_KEYS.interventions(entrepriseId)}_${JSON.stringify(filters)}`;
    
    return cachedFetch(cacheKey, async () => {
      let query = supabase
        .from('interventions')
        .select(`id, titre, description, statut, date_prevue, duree_estimee, priorite, created_at, 
          client:clients!interventions_client_id_fkey(id, nom, prenom, telephone), 
          technicien:users!interventions_technicien_id_fkey(id, nom, prenom)`)
        .eq('entreprise_id', entrepriseId);

      if (filters.statut && filters.statut !== 'all') {
        query = query.eq('statut', filters.statut);
      }
      if (filters.technicien_id) {
        query = query.eq('technicien_id', filters.technicien_id);
      }

      const { data, error } = await query.order('date_prevue', { ascending: false }).limit(filters.limit || 100);
      if (error) throw error;
      return data || [];
    }, 60000);
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('interventions')
      .select(`*, client:clients(*), technicien:users!interventions_technicien_id_fkey(id, nom, prenom, telephone, email)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (intervention) => {
    cacheService.invalidate(/^interventions_/);
    
    const sanitizedIntervention = { ...intervention };
    const uuidFields = ['client_id', 'technicien_id', 'categorie_id', 'site_id'];
    uuidFields.forEach(field => {
      if (sanitizedIntervention[field] === '' || sanitizedIntervention[field] === undefined) {
        sanitizedIntervention[field] = null;
      }
    });
    delete sanitizedIntervention.devis_id;
    
    const { data, error } = await supabase
      .from('interventions')
      .insert({
        ...sanitizedIntervention,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    cacheService.invalidate(/^interventions_/);
    
    const sanitizedUpdates = { ...updates };
    const uuidFields = ['client_id', 'technicien_id', 'categorie_id', 'site_id'];
    uuidFields.forEach(field => {
      if (sanitizedUpdates[field] === '' || sanitizedUpdates[field] === undefined) {
        sanitizedUpdates[field] = null;
      }
    });
    delete sanitizedUpdates.devis_id;
    
    const { data, error } = await supabase
      .from('interventions')
      .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    cacheService.invalidate(/^interventions_/);
    const { error } = await supabase.from('interventions').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  updateStatut: async (id, statut) => {
    cacheService.invalidate(/^interventions_/);
    const updates = { statut, updated_at: new Date().toISOString() };
    
    if (statut === 'en_cours') {
      updates.date_debut_reelle = new Date().toISOString();
    } else if (statut === 'termine') {
      updates.date_fin_reelle = new Date().toISOString();
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
  list: async (entrepriseId, includeArchived = false) => {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('entreprise_id', entrepriseId);
    
    if (!includeArchived) {
      query = query.neq('statut', 'archive');
    }
    
    const { data, error } = await query.order('nom');
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

  getByPortalToken: async (token) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*, entreprise:entreprises(*)')
      .eq('portal_token', token)
      .single();
    if (error) throw error;
    return data;
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
      .select(`*, client:clients(*), entreprise:entreprises(*), lignes:devis_lignes(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (devisData) => {
    const lignes = devisData.lignes || [];
    delete devisData.lignes;
    
    // Calculate totals
    let total_ht = 0;
    let total_ttc = 0;
    lignes.forEach(ligne => {
      const lineTotal = (ligne.quantite || 1) * (ligne.prix_unitaire || 0);
      total_ht += lineTotal;
      total_ttc += lineTotal * (1 + (ligne.tva || 0) / 100);
    });
    
    // Generate numero_devis
    const { count } = await supabase
      .from('devis')
      .select('id', { count: 'exact', head: true })
      .eq('entreprise_id', devisData.entreprise_id);
    
    const numero_devis = `D-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
    const token_client = crypto.randomUUID();
    
    const payload = {
      client_id: devisData.client_id,
      entreprise_id: devisData.entreprise_id,
      numero_devis,
      total_ht,
      total_ttc,
      total_tva: total_ttc - total_ht,
      statut: 'brouillon',
      token_client,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (devisData.intervention_id) payload.intervention_id = devisData.intervention_id;
    if (devisData.validite_jours) payload.validite_jours = devisData.validite_jours;
    if (devisData.conditions) payload.conditions = devisData.conditions;
    if (devisData.message_client) payload.message_client = devisData.message_client;
    
    const { data: newDevis, error } = await supabase
      .from('devis')
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    
    // Create devis_lignes
    if (newDevis && lignes.length > 0) {
      const lignesData = lignes.map((ligne) => ({
        devis_id: newDevis.id,
        description: ligne.description,
        quantite: ligne.quantite || 1,
        prix_unitaire: ligne.prix_unitaire || 0,
        tva: ligne.tva || 0
      }));
      
      await supabase.from('devis_lignes').insert(lignesData);
    }
    
    return newDevis;
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
    await supabase.from('devis_lignes').delete().eq('devis_id', id);
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
        signature_client: signatureData.signature,
        nom_signataire: signatureData.nom,
        date_signature: new Date().toISOString(),
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
    const { count } = await supabase
      .from('factures')
      .select('id', { count: 'exact', head: true })
      .eq('entreprise_id', facture.entreprise_id);
    
    const numero_facture = `F-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
    const token_client = crypto.randomUUID();
    
    // Clean payload - only use columns that exist in factures table
    const payload = {
      entreprise_id: facture.entreprise_id,
      client_id: facture.client_id,
      numero_facture,
      token_client,
      statut: facture.statut || 'brouillon',
      total_ht: facture.total_ht || 0,
      total_tva: facture.total_tva || 0,
      total_ttc: facture.total_ttc || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add optional fields
    if (facture.devis_id) payload.devis_id = facture.devis_id;
    if (facture.intervention_id) payload.intervention_id = facture.intervention_id;
    if (facture.conditions_paiement) payload.conditions_paiement = facture.conditions_paiement;
    if (facture.echeance_jours) payload.echeance_jours = facture.echeance_jours;
    if (facture.notes) payload.notes = facture.notes;
    if (facture.lignes) payload.lignes = facture.lignes;
    
    const { data, error } = await supabase
      .from('factures')
      .insert(payload)
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
      updates.paye = true;
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
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select(`*, lignes:devis_lignes(*)`)
      .eq('id', devisId)
      .single();
    if (devisError) throw devisError;

    const facture = await facturesApi.create({
      entreprise_id: entrepriseId,
      client_id: devis.client_id,
      total_ht: devis.total_ht,
      total_tva: devis.total_tva,
      total_ttc: devis.total_ttc,
      devis_id: devisId,
      lignes: devis.lignes,
      conditions_paiement: devis.conditions || ''
    });

    // Update devis status
    await devisApi.updateStatut(devisId, 'facture');

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
      .in('role', ['technicien', 'tech'])
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
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

export const techniciensApi = usersApi;

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

// ==================== SETTINGS / ENTREPRISE ====================
export const settingsApi = {
  get: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('entreprises')
      .select('*')
      .eq('id', entrepriseId)
      .single();
    if (error) throw error;
    return data;
  },

  getById: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('entreprises')
      .select('*')
      .eq('id', entrepriseId)
      .single();
    if (error) throw error;
    return data;
  },

  update: async (entrepriseId, updates) => {
    const { data, error } = await supabase
      .from('entreprises')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', entrepriseId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getDocumentDefaults: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('entreprises')
      .select('conditions_generales, message_client_devis, message_client_facture, validite_devis_jours, devis_footer, facture_footer, conditions_paiement, delai_paiement_jours, mentions_legales, prefixe_devis, prefixe_facture')
      .eq('id', entrepriseId)
      .single();
    if (error) throw error;
    return data;
  },

  uploadLogo: async (entrepriseId, file) => {
    const fileName = `${entrepriseId}/logo_${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabase.storage
      .from('entreprise-assets')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });
    
    if (uploadError) throw new Error('Erreur lors du téléchargement du logo');

    const { data: { publicUrl } } = supabase.storage
      .from('entreprise-assets')
      .getPublicUrl(fileName);

    await supabase
      .from('entreprises')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', entrepriseId);

    return publicUrl;
  }
};

// Alias for backwards compatibility
export const entrepriseApi = settingsApi;

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
      .insert({ ...site, created_at: new Date().toISOString() })
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

// ==================== PHOTOS ====================
export const photosApi = {
  upload: async (interventionId, file, typePhoto = 'autre') => {
    const fileName = `interventions/${interventionId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

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

  list: async (interventionId) => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  delete: async (id) => {
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ==================== DASHBOARD ====================
export const dashboardApi = {
  getStats: async (entrepriseId) => {
    const cacheKey = CACHE_KEYS.dashboard(entrepriseId) + '_stats';
    
    return cachedFetch(cacheKey, async () => {
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
          .eq('entreprise_id', entrepriseId).eq('statut', 'planifie').lt('date_prevue', todayISO),
        supabase.from('devis').select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId).eq('statut', 'envoye'),
        supabase.from('factures').select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId).eq('statut', 'envoyee'),
        supabase.from('clients').select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId).neq('statut', 'archive'),
        supabase.from('users').select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId).in('role', ['technicien', 'tech']),
        supabase.from('factures').select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId).eq('statut', 'payee').gte('date_paiement', startOfMonth)
      ]);

      return {
        interventions_today: interventionsToday.count || 0,
        interventions_en_retard: interventionsRetard.count || 0,
        devis_en_attente: devisAttente.count || 0,
        factures_impayees: facturesImpayees.count || 0,
        total_clients: clients.count || 0,
        total_techniciens: techniciens.count || 0
      };
    }, 30000);
  },

  getRecent: async (entrepriseId, limit = 5) => {
    const [interventions, devis, factures] = await Promise.all([
      supabase.from('interventions')
        .select(`id, titre, statut, date_prevue, created_at, client:clients!interventions_client_id_fkey(id, nom, prenom)`)
        .eq('entreprise_id', entrepriseId).order('created_at', { ascending: false }).limit(limit),
      supabase.from('devis')
        .select(`id, numero_devis, statut, total_ttc, created_at, client:clients(id, nom, prenom)`)
        .eq('entreprise_id', entrepriseId).order('created_at', { ascending: false }).limit(limit),
      supabase.from('factures')
        .select(`id, numero_facture, statut, total_ttc, created_at, client:clients(id, nom, prenom)`)
        .eq('entreprise_id', entrepriseId).order('created_at', { ascending: false }).limit(limit)
    ]);

    return {
      interventions: interventions.data || [],
      devis: devis.data || [],
      factures: factures.data || []
    };
  }
};

// ==================== TECHNICIAN API ====================
export const technicianApi = {
  getMyInterventions: async (technicienId, entrepriseId) => {
    const { data, error } = await supabase
      .from('interventions')
      .select(`*, client:clients(id, nom, prenom, telephone, adresse, ville, code_postal)`)
      .eq('entreprise_id', entrepriseId)
      .eq('technicien_id', technicienId)
      .in('statut', ['planifie', 'accepte', 'en_cours'])
      .order('date_prevue', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  getAvailableInterventions: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('interventions')
      .select(`*, client:clients(id, nom, prenom, telephone, adresse, ville, code_postal)`)
      .eq('entreprise_id', entrepriseId)
      .is('technicien_id', null)
      .eq('statut', 'planifie')
      .order('date_prevue', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  claimIntervention: async (interventionId, technicienId) => {
    const { data, error } = await supabase
      .from('interventions')
      .update({ 
        technicien_id: technicienId, 
        statut: 'accepte',
        updated_at: new Date().toISOString() 
      })
      .eq('id', interventionId)
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
        statut: 'planifie',
        updated_at: new Date().toISOString() 
      })
      .eq('id', interventionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  startIntervention: async (interventionId) => {
    const { data, error } = await supabase
      .from('interventions')
      .update({ 
        statut: 'en_cours',
        date_debut_reelle: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', interventionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  completeIntervention: async (interventionId, completionData) => {
    const updates = {
      statut: 'termine',
      date_fin_reelle: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (completionData.rapport) updates.rapport = completionData.rapport;
    if (completionData.notes_technicien) updates.notes_technicien = completionData.notes_technicien;
    if (completionData.signature) updates.signature_client = completionData.signature;
    if (completionData.signature_nom || completionData.nom_signataire) {
      updates.nom_signataire = completionData.signature_nom || completionData.nom_signataire;
    }
    if (completionData.signature) updates.date_signature = new Date().toISOString();

    const { data, error } = await supabase
      .from('interventions')
      .update(updates)
      .eq('id', interventionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateNotes: async (interventionId, notes) => {
    const { data, error } = await supabase
      .from('interventions')
      .update({ 
        notes_technicien: notes,
        updated_at: new Date().toISOString() 
      })
      .eq('id', interventionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ==================== OFFLINE SYNC API ====================
export const offlineSyncApi = {
  syncClient: async (clientData) => {
    if (clientData.id) {
      return clientsApi.update(clientData.id, clientData);
    }
    return clientsApi.create(clientData);
  },

  syncDevis: async (devisData) => {
    if (devisData.id && !devisData.tempId) {
      return devisApi.update(devisData.id, devisData);
    }
    return devisApi.create(devisData);
  },

  signDevis: async (devisId, signatureData) => {
    return devisApi.sign(devisId, signatureData);
  }
};

// ==================== PDF & EMAIL (Supabase Edge Functions) ====================
export const edgeFunctionsApi = {
  generatePDF: async ({ type, id, entreprise_id }) => {
    // Call Supabase Edge Function for PDF generation
    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: { type, id, entreprise_id }
    });
    
    if (error) {
      console.error('PDF generation error:', error);
      throw new Error('Erreur lors de la génération du PDF');
    }
    
    return data;
  },

  downloadPDF: async ({ type, id, entreprise_id, filename }) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: { type, id, entreprise_id }
      });
      
      if (error) throw error;
      
      // If we get base64 PDF data
      if (data?.pdf) {
        const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `${type}_${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      }
      
      throw new Error('Format PDF invalide');
    } catch (err) {
      console.error('PDF download error:', err);
      throw new Error('Erreur lors du téléchargement du PDF');
    }
  },

  sendEmail: async ({ to, subject, html, attachments }) => {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, attachments }
    });
    
    if (error) throw error;
    return data;
  },

  sendDevisEmail: async (devisId) => {
    const { data, error } = await supabase.functions.invoke('send-devis-email', {
      body: { devis_id: devisId }
    });
    
    if (error) throw error;
    return data;
  },

  sendFactureEmail: async (factureId) => {
    const { data, error } = await supabase.functions.invoke('send-facture-email', {
      body: { facture_id: factureId }
    });
    
    if (error) throw error;
    return data;
  }
};

// ==================== ANALYTICS ====================
export const analyticsApi = {
  getStats: async (entrepriseId, startDate, endDate) => {
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const [interventions, devis, factures, techniciens] = await Promise.all([
      supabase.from('interventions').select('*').eq('entreprise_id', entrepriseId)
        .gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('devis').select('*').eq('entreprise_id', entrepriseId)
        .gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('factures').select('*').eq('entreprise_id', entrepriseId)
        .gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('users').select('*').eq('entreprise_id', entrepriseId)
        .in('role', ['tech', 'technicien'])
    ]);

    return {
      interventions: interventions.data || [],
      devis: devis.data || [],
      factures: factures.data || [],
      techniciens: techniciens.data || []
    };
  }
};

// ==================== STATS API (for Rapports) ====================
export const statsApi = {
  getStats: async (entrepriseId) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();
    
    const [
      devisEnAttente,
      devisSignesMois,
      facturesEnAttente,
      facturesEnRetard,
      facturesPayeesMois,
      totalDevisMois,
      caTotal
    ] = await Promise.all([
      supabase.from('devis').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).eq('statut', 'envoye'),
      supabase.from('devis').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).eq('statut', 'signe').gte('date_signature', startOfMonthISO),
      supabase.from('factures').select('total_ttc')
        .eq('entreprise_id', entrepriseId).in('statut', ['envoyee', 'brouillon']),
      supabase.from('factures').select('total_ttc')
        .eq('entreprise_id', entrepriseId).eq('statut', 'en_retard'),
      supabase.from('factures').select('total_ttc')
        .eq('entreprise_id', entrepriseId).eq('statut', 'payee').gte('date_paiement', startOfMonthISO),
      supabase.from('devis').select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId).gte('created_at', startOfMonthISO),
      supabase.from('factures').select('total_ttc')
        .eq('entreprise_id', entrepriseId).eq('statut', 'payee')
    ]);
    
    const pendingAmount = (facturesEnAttente.data || []).reduce((sum, f) => sum + (f.total_ttc || 0), 0);
    const retardAmount = (facturesEnRetard.data || []).reduce((sum, f) => sum + (f.total_ttc || 0), 0);
    const caMois = (facturesPayeesMois.data || []).reduce((sum, f) => sum + (f.total_ttc || 0), 0);
    const caAnnuel = (caTotal.data || []).reduce((sum, f) => sum + (f.total_ttc || 0), 0);
    
    const tauxConversion = totalDevisMois.count > 0 
      ? Math.round((devisSignesMois.count / totalDevisMois.count) * 100) 
      : 0;
    
    return {
      devis: {
        en_attente: devisEnAttente.count || 0,
        signes_mois: devisSignesMois.count || 0
      },
      factures: {
        en_attente: facturesEnAttente.data?.length || 0,
        pending_amount: pendingAmount,
        en_retard: facturesEnRetard.data?.length || 0,
        retard_amount: retardAmount
      },
      taux_conversion: tauxConversion,
      ca_mois: caMois,
      ca_annuel: caAnnuel
    };
  },

  getMonthlyRevenue: async (entrepriseId) => {
    const months = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      const { data } = await supabase
        .from('factures')
        .select('total_ttc')
        .eq('entreprise_id', entrepriseId)
        .eq('statut', 'payee')
        .gte('date_paiement', date.toISOString())
        .lt('date_paiement', endDate.toISOString());
      
      const total = (data || []).reduce((sum, f) => sum + (f.total_ttc || 0), 0);
      
      months.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short' }),
        year: date.getFullYear(),
        revenue: total
      });
    }
    
    return months;
  },

  getTopClients: async (entrepriseId, limit = 10) => {
    const { data: factures } = await supabase
      .from('factures')
      .select('client_id, total_ttc, client:clients(id, nom, prenom)')
      .eq('entreprise_id', entrepriseId)
      .eq('statut', 'payee');
    
    // Group by client
    const clientTotals = {};
    (factures || []).forEach(f => {
      const clientId = f.client_id;
      if (!clientTotals[clientId]) {
        clientTotals[clientId] = {
          client_id: clientId,
          nom: f.client?.nom || 'Client',
          prenom: f.client?.prenom || '',
          total: 0,
          count: 0
        };
      }
      clientTotals[clientId].total += f.total_ttc || 0;
      clientTotals[clientId].count++;
    });
    
    // Sort by total and return top N
    return Object.values(clientTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }
};

// ==================== PRICEBOOK ====================
export const pricebookApi = {
  list: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('pricebook_items')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('pricebook_items')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (item) => {
    const { data, error } = await supabase
      .from('pricebook_items')
      .insert({
        ...item,
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
      .from('pricebook_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('pricebook_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ==================== PRICEBOOK CATEGORIES ====================
export const pricebookCategoriesApi = {
  list: async (entrepriseId) => {
    const { data, error } = await supabase
      .from('pricebook_categories')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  create: async (category) => {
    const { data, error } = await supabase
      .from('pricebook_categories')
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
      .from('pricebook_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('pricebook_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Export all APIs
export default {
  interventions: interventionsApi,
  clients: clientsApi,
  devis: devisApi,
  factures: facturesApi,
  users: usersApi,
  techniciens: techniciensApi,
  categories: categoriesApi,
  settings: settingsApi,
  sites: sitesApi,
  photos: photosApi,
  dashboard: dashboardApi,
  technician: technicianApi,
  offlineSync: offlineSyncApi,
  edge: edgeFunctionsApi,
  analytics: analyticsApi,
  stats: statsApi,
  pricebook: pricebookApi,
  pricebookCategories: pricebookCategoriesApi
};
