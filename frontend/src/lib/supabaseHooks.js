/**
 * Supabase Data Hooks - Direct PostgREST access for ultra-fast data fetching
 * Replaces slow Railway API calls with direct Supabase queries (~50ms vs ~500ms+)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ==================== DASHBOARD ====================
export function useDashboardStats(entrepriseId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthISO = startOfMonth.toISOString();

      // Parallel queries for speed
      const [
        interventionsToday,
        interventionsRetard,
        devisAttente,
        facturesImpayees,
        clients,
        techniciens,
        devisSignesMois,
        facturesMois
      ] = await Promise.all([
        // Interventions today
        supabase
          .from('interventions')
          .select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)
          .gte('date_prevue', todayISO)
          .lt('date_prevue', new Date(today.getTime() + 86400000).toISOString()),
        
        // Interventions en retard
        supabase
          .from('interventions')
          .select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)
          .eq('statut', 'planifiee')
          .lt('date_prevue', todayISO),
        
        // Devis en attente
        supabase
          .from('devis')
          .select('id, montant_total', { count: 'exact' })
          .eq('entreprise_id', entrepriseId)
          .eq('statut', 'envoye'),
        
        // Factures impayées
        supabase
          .from('factures')
          .select('id, montant_total', { count: 'exact' })
          .eq('entreprise_id', entrepriseId)
          .eq('statut', 'envoyee'),
        
        // Total clients
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId),
        
        // Total techniciens
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)
          .in('role', ['tech', 'technicien']),
        
        // Devis signés ce mois
        supabase
          .from('devis')
          .select('id', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)
          .eq('statut', 'signe')
          .gte('updated_at', startOfMonthISO),
        
        // CA du mois (factures payées)
        supabase
          .from('factures')
          .select('montant_total')
          .eq('entreprise_id', entrepriseId)
          .eq('statut', 'payee')
          .gte('date_paiement', startOfMonthISO)
      ]);

      // Calculate totals
      const montantDevisAttente = devisAttente.data?.reduce((sum, d) => sum + (d.montant_total || 0), 0) || 0;
      const montantFacturesImpayees = facturesImpayees.data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;
      const caMois = facturesMois.data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;

      setStats({
        interventions_today: interventionsToday.count || 0,
        interventions_en_retard: interventionsRetard.count || 0,
        devis_en_attente: devisAttente.count || 0,
        montant_devis_attente: montantDevisAttente,
        factures_impayees: facturesImpayees.count || 0,
        montant_factures_impayees: montantFacturesImpayees,
        total_clients: clients.count || 0,
        total_techniciens: techniciens.count || 0,
        devis_signes_mois: devisSignesMois.count || 0,
        ca_mois: caMois
      });
      setError(null);
    } catch (err) {
      console.error('Dashboard stats error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// ==================== RECENT ACTIVITY ====================
export function useRecentActivity(entrepriseId, limit = 10) {
  const [data, setData] = useState({ interventions: [], devis: [], factures: [] });
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      
      const [interventions, devis, factures] = await Promise.all([
        supabase
          .from('interventions')
          .select(`
            id, titre, statut, date_prevue, created_at,
            client:clients(id, nom, prenom)
          `)
          .eq('entreprise_id', entrepriseId)
          .order('created_at', { ascending: false })
          .limit(limit),
        
        supabase
          .from('devis')
          .select(`
            id, numero, statut, montant_total, created_at,
            client:clients(id, nom, prenom)
          `)
          .eq('entreprise_id', entrepriseId)
          .order('created_at', { ascending: false })
          .limit(limit),
        
        supabase
          .from('factures')
          .select(`
            id, numero, statut, montant_total, created_at,
            client:clients(id, nom, prenom)
          `)
          .eq('entreprise_id', entrepriseId)
          .order('created_at', { ascending: false })
          .limit(limit)
      ]);

      setData({
        interventions: interventions.data || [],
        devis: devis.data || [],
        factures: factures.data || []
      });
    } catch (err) {
      console.error('Recent activity error:', err);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId, limit]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return { data, loading, refetch: fetchRecent };
}

// ==================== ALERTS ====================
export function useAlerts(entrepriseId) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      const today = new Date().toISOString();
      const alertsList = [];

      // Factures en retard
      const { data: facturesRetard } = await supabase
        .from('factures')
        .select('id, numero, montant_total, date_echeance')
        .eq('entreprise_id', entrepriseId)
        .eq('statut', 'envoyee')
        .lt('date_echeance', today)
        .limit(5);

      facturesRetard?.forEach(f => {
        alertsList.push({
          id: `facture-${f.id}`,
          type: 'facture_retard',
          message: `Facture ${f.numero} en retard`,
          link: `/dashboard/factures/${f.id}`,
          priority: 'high'
        });
      });

      // Interventions en retard
      const { data: interventionsRetard } = await supabase
        .from('interventions')
        .select('id, titre, date_prevue')
        .eq('entreprise_id', entrepriseId)
        .eq('statut', 'planifiee')
        .lt('date_prevue', today)
        .limit(5);

      interventionsRetard?.forEach(i => {
        alertsList.push({
          id: `intervention-${i.id}`,
          type: 'intervention_retard',
          message: `Intervention "${i.titre}" en retard`,
          link: `/dashboard/interventions/${i.id}`,
          priority: 'medium'
        });
      });

      setAlerts(alertsList);
    } catch (err) {
      console.error('Alerts error:', err);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, refetch: fetchAlerts };
}

// ==================== INTERVENTIONS ====================
export function useInterventions(entrepriseId, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInterventions = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('interventions')
        .select(`
          *,
          client:clients(id, nom, prenom, telephone, adresse, ville),
          technicien:users(id, nom, prenom, telephone)
        `)
        .eq('entreprise_id', entrepriseId);

      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }
      if (filters.technicien_id) {
        query = query.eq('technicien_id', filters.technicien_id);
      }
      if (filters.date_from) {
        query = query.gte('date_prevue', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('date_prevue', filters.date_to);
      }

      const { data: interventions, error } = await query
        .order('date_prevue', { ascending: false })
        .limit(filters.limit || 100);

      if (error) throw error;
      setData(interventions || []);
    } catch (err) {
      console.error('Interventions error:', err);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId, filters.statut, filters.technicien_id, filters.date_from, filters.date_to, filters.limit]);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  return { data, loading, refetch: fetchInterventions };
}

// ==================== CLIENTS ====================
export function useClients(entrepriseId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(clients || []);
    } catch (err) {
      console.error('Clients error:', err);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { data, loading, refetch: fetchClients };
}

// ==================== TECHNICIENS ====================
export function useTechniciens(entrepriseId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTechniciens = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      
      const { data: techs, error } = await supabase
        .from('users')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .in('role', ['tech', 'technicien'])
        .order('nom');

      if (error) throw error;
      setData(techs || []);
    } catch (err) {
      console.error('Techniciens error:', err);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    fetchTechniciens();
  }, [fetchTechniciens]);

  return { data, loading, refetch: fetchTechniciens };
}

// ==================== DEVIS ====================
export function useDevis(entrepriseId, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevis = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('devis')
        .select(`
          *,
          client:clients(id, nom, prenom, email, telephone)
        `)
        .eq('entreprise_id', entrepriseId);

      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }

      const { data: devis, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

      if (error) throw error;
      setData(devis || []);
    } catch (err) {
      console.error('Devis error:', err);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId, filters.statut, filters.limit]);

  useEffect(() => {
    fetchDevis();
  }, [fetchDevis]);

  return { data, loading, refetch: fetchDevis };
}

// ==================== FACTURES ====================
export function useFactures(entrepriseId, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFactures = useCallback(async () => {
    if (!entrepriseId) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('factures')
        .select(`
          *,
          client:clients(id, nom, prenom, email, telephone)
        `)
        .eq('entreprise_id', entrepriseId);

      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }

      const { data: factures, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

      if (error) throw error;
      setData(factures || []);
    } catch (err) {
      console.error('Factures error:', err);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId, filters.statut, filters.limit]);

  useEffect(() => {
    fetchFactures();
  }, [fetchFactures]);

  return { data, loading, refetch: fetchFactures };
}

export default {
  useDashboardStats,
  useRecentActivity,
  useAlerts,
  useInterventions,
  useClients,
  useTechniciens,
  useDevis,
  useFactures
};
