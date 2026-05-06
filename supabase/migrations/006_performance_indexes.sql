-- =====================================================
-- ACTOOS PRO - Index de Performance
-- =====================================================
-- Ce script ajoute des index pour optimiser les requêtes
-- et réduire la latence à ~200ms
-- =====================================================

-- Index sur entreprise_id (le plus important pour le multi-tenant)
CREATE INDEX IF NOT EXISTS idx_interventions_entreprise_date ON public.interventions(entreprise_id, date_prevue DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_entreprise_statut ON public.interventions(entreprise_id, statut);
CREATE INDEX IF NOT EXISTS idx_clients_entreprise_statut ON public.clients(entreprise_id, statut);
CREATE INDEX IF NOT EXISTS idx_devis_entreprise_statut ON public.devis(entreprise_id, statut);
CREATE INDEX IF NOT EXISTS idx_factures_entreprise_statut ON public.factures(entreprise_id, statut);
CREATE INDEX IF NOT EXISTS idx_users_entreprise_role ON public.users(entreprise_id, role);

-- Index pour les lookups par created_at (pour les listes triées)
CREATE INDEX IF NOT EXISTS idx_interventions_created ON public.interventions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_created ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devis_created ON public.devis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_factures_created ON public.factures(created_at DESC);

-- Index pour les filtres fréquents
CREATE INDEX IF NOT EXISTS idx_interventions_technicien ON public.interventions(technicien_id);
CREATE INDEX IF NOT EXISTS idx_interventions_client ON public.interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_client ON public.devis(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_client ON public.factures(client_id);

-- Index pour les recherches texte sur clients
CREATE INDEX IF NOT EXISTS idx_clients_nom ON public.clients(nom);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- Index composite pour le dashboard (requêtes les plus fréquentes)
CREATE INDEX IF NOT EXISTS idx_interventions_dashboard ON public.interventions(entreprise_id, statut, date_prevue);
CREATE INDEX IF NOT EXISTS idx_factures_dashboard ON public.factures(entreprise_id, statut, date_paiement);
