-- =====================================================
-- ACTOOS PRO - Tables Manquantes
-- =====================================================
-- Ce script crée les tables et colonnes manquantes
-- identifiées lors des tests E2E
--
-- IMPORTANT: Exécuter ce script dans le Supabase SQL Editor
-- AVANT le script 004_secure_rls_policies.sql
-- =====================================================

-- =====================================================
-- 1. TABLE: chat_messages
-- =====================================================
-- Table pour le chat interne entre Admin et Techniciens

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_chat_messages_entreprise ON public.chat_messages(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON public.chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(recipient_id, is_read) WHERE is_read = false;

-- =====================================================
-- 2. COLONNE: sms_config sur entreprises
-- =====================================================
-- Configuration SMS (Twilio) par entreprise

ALTER TABLE public.entreprises 
ADD COLUMN IF NOT EXISTS sms_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.entreprises.sms_config IS 'Configuration SMS Twilio: {twilio_account_sid, twilio_auth_token, twilio_phone_number, use_shared}';

-- =====================================================
-- 3. COLONNE: integrations_config sur entreprises
-- =====================================================
-- Configuration des intégrations (WhatsApp, Google Calendar, etc.)

ALTER TABLE public.entreprises 
ADD COLUMN IF NOT EXISTS integrations_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.entreprises.integrations_config IS 'Configuration intégrations: {whatsapp: {...}, google_calendar: {...}}';

-- =====================================================
-- 4. COLONNE: messaging_preference sur entreprises
-- =====================================================
-- Préférence de messagerie (email, sms, whatsapp)

ALTER TABLE public.entreprises 
ADD COLUMN IF NOT EXISTS messaging_preference VARCHAR(20) DEFAULT 'email';

-- =====================================================
-- 5. COLONNE: devise sur entreprises
-- =====================================================
-- Devise de l'entreprise

ALTER TABLE public.entreprises 
ADD COLUMN IF NOT EXISTS devise VARCHAR(3) DEFAULT 'EUR';

-- =====================================================
-- 6. TABLE: devis_lignes (si manquante)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.devis_lignes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantite DECIMAL(10,2) DEFAULT 1,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    tva DECIMAL(5,2) DEFAULT 20,
    montant_ht DECIMAL(10,2),
    montant_ttc DECIMAL(10,2),
    ordre INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devis_lignes_devis ON public.devis_lignes(devis_id);

-- =====================================================
-- 7. TABLE: facture_lignes (si manquante)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facture_lignes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantite DECIMAL(10,2) DEFAULT 1,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    tva DECIMAL(5,2) DEFAULT 20,
    montant_ht DECIMAL(10,2),
    montant_ttc DECIMAL(10,2),
    ordre INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facture_lignes_facture ON public.facture_lignes(facture_id);

-- =====================================================
-- 8. TABLE: photos (si manquante)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type_photo VARCHAR(20) DEFAULT 'pendant',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_intervention ON public.photos(intervention_id);

-- =====================================================
-- 9. Activer RLS sur les nouvelles tables
-- =====================================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facture_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. Politiques RLS temporaires (USING true)
-- =====================================================
-- Ces politiques seront remplacées par 004_secure_rls_policies.sql

-- Chat messages
CREATE POLICY "chat_messages_temp_policy" ON public.chat_messages
    FOR ALL USING (true) WITH CHECK (true);

-- Devis lignes
CREATE POLICY "devis_lignes_temp_policy" ON public.devis_lignes
    FOR ALL USING (true) WITH CHECK (true);

-- Facture lignes  
CREATE POLICY "facture_lignes_temp_policy" ON public.facture_lignes
    FOR ALL USING (true) WITH CHECK (true);

-- Photos
CREATE POLICY "photos_temp_policy" ON public.photos
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 11. Accorder les permissions
-- =====================================================

GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.devis_lignes TO authenticated;
GRANT ALL ON public.facture_lignes TO authenticated;
GRANT ALL ON public.photos TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
-- Après avoir exécuté ce script, exécutez:
-- /app/supabase/migrations/004_secure_rls_policies.sql
-- =====================================================
