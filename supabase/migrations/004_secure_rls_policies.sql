-- =====================================================
-- ACTOOS PRO - Politiques RLS Sécurisées
-- =====================================================
-- Ce script remplace les politiques temporaires USING (true)
-- par des politiques multi-tenant sécurisées.
--
-- IMPORTANT: Exécuter ce script dans le Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTION: Get user's entreprise_id from JWT
-- =====================================================
-- Cette fonction extrait l'entreprise_id du JWT custom claim

CREATE OR REPLACE FUNCTION public.get_user_entreprise_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    -- Try to get from JWT claim first
    (current_setting('request.jwt.claims', true)::json->>'entreprise_id')::uuid,
    -- Fallback: get from users table using auth.uid()
    (SELECT entreprise_id FROM public.users WHERE id = auth.uid())
  );
$$;

-- =====================================================
-- 2. HELPER FUNCTION: Check if user is super_admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin',
    (SELECT role = 'super_admin' FROM public.users WHERE id = auth.uid())
  );
$$;

-- =====================================================
-- 3. DROP EXISTING POLICIES
-- =====================================================

-- Users table
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- Entreprises table
DROP POLICY IF EXISTS "entreprises_select_policy" ON public.entreprises;
DROP POLICY IF EXISTS "entreprises_update_policy" ON public.entreprises;

-- Clients table
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- Interventions table
DROP POLICY IF EXISTS "interventions_select_policy" ON public.interventions;
DROP POLICY IF EXISTS "interventions_insert_policy" ON public.interventions;
DROP POLICY IF EXISTS "interventions_update_policy" ON public.interventions;
DROP POLICY IF EXISTS "interventions_delete_policy" ON public.interventions;

-- Devis table
DROP POLICY IF EXISTS "devis_select_policy" ON public.devis;
DROP POLICY IF EXISTS "devis_insert_policy" ON public.devis;
DROP POLICY IF EXISTS "devis_update_policy" ON public.devis;
DROP POLICY IF EXISTS "devis_delete_policy" ON public.devis;

-- Factures table
DROP POLICY IF EXISTS "factures_select_policy" ON public.factures;
DROP POLICY IF EXISTS "factures_insert_policy" ON public.factures;
DROP POLICY IF EXISTS "factures_update_policy" ON public.factures;
DROP POLICY IF EXISTS "factures_delete_policy" ON public.factures;

-- Categories table
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;

-- Sites table
DROP POLICY IF EXISTS "sites_select_policy" ON public.sites;
DROP POLICY IF EXISTS "sites_insert_policy" ON public.sites;
DROP POLICY IF EXISTS "sites_update_policy" ON public.sites;
DROP POLICY IF EXISTS "sites_delete_policy" ON public.sites;

-- User invites table
DROP POLICY IF EXISTS "user_invites_select_policy" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_insert_policy" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_update_policy" ON public.user_invites;
DROP POLICY IF EXISTS "user_invites_delete_policy" ON public.user_invites;

-- Platform config table
DROP POLICY IF EXISTS "platform_config_select_policy" ON public.platform_config;
DROP POLICY IF EXISTS "platform_config_insert_policy" ON public.platform_config;
DROP POLICY IF EXISTS "platform_config_update_policy" ON public.platform_config;

-- Photos table
DROP POLICY IF EXISTS "photos_select_policy" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_policy" ON public.photos;
DROP POLICY IF EXISTS "photos_delete_policy" ON public.photos;

-- =====================================================
-- 4. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. USERS TABLE POLICIES
-- =====================================================
-- Users can see other users in their entreprise
-- Super admins can see all users

CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  USING (
    public.is_super_admin() 
    OR entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  WITH CHECK (
    public.is_super_admin() 
    OR entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (
    public.is_super_admin() 
    OR id = auth.uid() 
    OR entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  USING (
    public.is_super_admin()
  );

-- =====================================================
-- 6. ENTREPRISES TABLE POLICIES
-- =====================================================
-- Users can only see/update their own entreprise
-- Super admins can see all

CREATE POLICY "entreprises_select_policy" ON public.entreprises
  FOR SELECT
  USING (
    public.is_super_admin() 
    OR id = public.get_user_entreprise_id()
  );

CREATE POLICY "entreprises_update_policy" ON public.entreprises
  FOR UPDATE
  USING (
    public.is_super_admin() 
    OR id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 7. CLIENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT
  USING (
    public.is_super_admin() 
    OR entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "clients_insert_policy" ON public.clients
  FOR INSERT
  WITH CHECK (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "clients_update_policy" ON public.clients
  FOR UPDATE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "clients_delete_policy" ON public.clients
  FOR DELETE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 8. INTERVENTIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "interventions_select_policy" ON public.interventions
  FOR SELECT
  USING (
    public.is_super_admin() 
    OR entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "interventions_insert_policy" ON public.interventions
  FOR INSERT
  WITH CHECK (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "interventions_update_policy" ON public.interventions
  FOR UPDATE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "interventions_delete_policy" ON public.interventions
  FOR DELETE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 9. DEVIS TABLE POLICIES
-- =====================================================
-- Includes public access via token for client signature

CREATE POLICY "devis_select_policy" ON public.devis
  FOR SELECT
  USING (
    public.is_super_admin() 
    OR entreprise_id = public.get_user_entreprise_id()
    -- Allow public access if accessing via signed token (for client portal)
    OR (current_setting('request.jwt.claims', true)::json->>'devis_id')::uuid = id
  );

CREATE POLICY "devis_insert_policy" ON public.devis
  FOR INSERT
  WITH CHECK (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "devis_update_policy" ON public.devis
  FOR UPDATE
  USING (
    entreprise_id = public.get_user_entreprise_id()
    -- Allow signature update via public token
    OR (current_setting('request.jwt.claims', true)::json->>'devis_id')::uuid = id
  );

CREATE POLICY "devis_delete_policy" ON public.devis
  FOR DELETE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 10. FACTURES TABLE POLICIES
-- =====================================================

CREATE POLICY "factures_select_policy" ON public.factures
  FOR SELECT
  USING (
    public.is_super_admin() 
    OR entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "factures_insert_policy" ON public.factures
  FOR INSERT
  WITH CHECK (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "factures_update_policy" ON public.factures
  FOR UPDATE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "factures_delete_policy" ON public.factures
  FOR DELETE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 11. CATEGORIES TABLE POLICIES
-- =====================================================

CREATE POLICY "categories_select_policy" ON public.categories
  FOR SELECT
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "categories_insert_policy" ON public.categories
  FOR INSERT
  WITH CHECK (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "categories_update_policy" ON public.categories
  FOR UPDATE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "categories_delete_policy" ON public.categories
  FOR DELETE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 12. SITES TABLE POLICIES
-- =====================================================
-- Sites are linked to clients, which are linked to entreprises

CREATE POLICY "sites_select_policy" ON public.sites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND c.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "sites_insert_policy" ON public.sites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND c.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "sites_update_policy" ON public.sites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND c.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "sites_delete_policy" ON public.sites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND c.entreprise_id = public.get_user_entreprise_id()
    )
  );

-- =====================================================
-- 13. USER_INVITES TABLE POLICIES
-- =====================================================

CREATE POLICY "user_invites_select_policy" ON public.user_invites
  FOR SELECT
  USING (
    public.is_super_admin() 
    OR entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "user_invites_insert_policy" ON public.user_invites
  FOR INSERT
  WITH CHECK (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "user_invites_update_policy" ON public.user_invites
  FOR UPDATE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "user_invites_delete_policy" ON public.user_invites
  FOR DELETE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 14. PLATFORM_CONFIG TABLE POLICIES
-- =====================================================
-- Only super_admin can access platform configuration

CREATE POLICY "platform_config_select_policy" ON public.platform_config
  FOR SELECT
  USING (
    public.is_super_admin()
  );

CREATE POLICY "platform_config_insert_policy" ON public.platform_config
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
  );

CREATE POLICY "platform_config_update_policy" ON public.platform_config
  FOR UPDATE
  USING (
    public.is_super_admin()
  );

-- =====================================================
-- 15. PHOTOS TABLE POLICIES
-- =====================================================
-- Photos are linked to interventions

CREATE POLICY "photos_select_policy" ON public.photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interventions i 
      WHERE i.id = intervention_id 
      AND i.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "photos_insert_policy" ON public.photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interventions i 
      WHERE i.id = intervention_id 
      AND i.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "photos_delete_policy" ON public.photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.interventions i 
      WHERE i.id = intervention_id 
      AND i.entreprise_id = public.get_user_entreprise_id()
    )
  );

-- =====================================================
-- 16. CHAT_MESSAGES TABLE POLICIES
-- =====================================================
-- Users can see messages they sent or received

DROP POLICY IF EXISTS "chat_messages_temp_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_policy" ON public.chat_messages;

CREATE POLICY "chat_messages_select_policy" ON public.chat_messages
  FOR SELECT
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "chat_messages_insert_policy" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "chat_messages_update_policy" ON public.chat_messages
  FOR UPDATE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

CREATE POLICY "chat_messages_delete_policy" ON public.chat_messages
  FOR DELETE
  USING (
    entreprise_id = public.get_user_entreprise_id()
  );

-- =====================================================
-- 17. DEVIS_LIGNES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "devis_lignes_temp_policy" ON public.devis_lignes;
DROP POLICY IF EXISTS "devis_lignes_select_policy" ON public.devis_lignes;
DROP POLICY IF EXISTS "devis_lignes_insert_policy" ON public.devis_lignes;
DROP POLICY IF EXISTS "devis_lignes_update_policy" ON public.devis_lignes;
DROP POLICY IF EXISTS "devis_lignes_delete_policy" ON public.devis_lignes;

CREATE POLICY "devis_lignes_select_policy" ON public.devis_lignes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.devis d 
      WHERE d.id = devis_id 
      AND d.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "devis_lignes_insert_policy" ON public.devis_lignes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devis d 
      WHERE d.id = devis_id 
      AND d.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "devis_lignes_update_policy" ON public.devis_lignes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.devis d 
      WHERE d.id = devis_id 
      AND d.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "devis_lignes_delete_policy" ON public.devis_lignes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.devis d 
      WHERE d.id = devis_id 
      AND d.entreprise_id = public.get_user_entreprise_id()
    )
  );

-- =====================================================
-- 18. FACTURE_LIGNES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "facture_lignes_temp_policy" ON public.facture_lignes;
DROP POLICY IF EXISTS "facture_lignes_select_policy" ON public.facture_lignes;
DROP POLICY IF EXISTS "facture_lignes_insert_policy" ON public.facture_lignes;
DROP POLICY IF EXISTS "facture_lignes_update_policy" ON public.facture_lignes;
DROP POLICY IF EXISTS "facture_lignes_delete_policy" ON public.facture_lignes;

CREATE POLICY "facture_lignes_select_policy" ON public.facture_lignes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.factures f 
      WHERE f.id = facture_id 
      AND f.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "facture_lignes_insert_policy" ON public.facture_lignes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.factures f 
      WHERE f.id = facture_id 
      AND f.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "facture_lignes_update_policy" ON public.facture_lignes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.factures f 
      WHERE f.id = facture_id 
      AND f.entreprise_id = public.get_user_entreprise_id()
    )
  );

CREATE POLICY "facture_lignes_delete_policy" ON public.facture_lignes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.factures f 
      WHERE f.id = facture_id 
      AND f.entreprise_id = public.get_user_entreprise_id()
    )
  );

-- =====================================================
-- 19. GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_entreprise_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
-- Toutes les politiques RLS sont maintenant sécurisées.
-- Les utilisateurs ne peuvent accéder qu'aux données
-- de leur propre entreprise.
-- =====================================================
