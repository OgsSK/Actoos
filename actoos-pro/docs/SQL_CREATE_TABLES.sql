-- ============================================
-- ACTOOS PRO - Création des tables manquantes
-- À exécuter dans Supabase > SQL Editor
-- ============================================

-- ============================================
-- 1. TABLE: users (profils utilisateurs étendus)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    telephone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'tech' CHECK (role IN ('admin', 'tech', 'manager', 'super_admin')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_users_entreprise ON public.users(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================
-- 2. TABLE: interventions
-- ============================================
CREATE TABLE IF NOT EXISTS public.interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    technicien_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    
    -- Informations de base
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    
    -- Statut
    statut VARCHAR(50) DEFAULT 'planifie' CHECK (statut IN ('planifie', 'accepte', 'en_cours', 'termine', 'annule', 'facture')),
    priorite VARCHAR(20) DEFAULT 'normale' CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente')),
    
    -- Dates et horaires
    date_intervention DATE,
    heure_debut TIME,
    heure_fin TIME,
    date_debut_reelle TIMESTAMP WITH TIME ZONE,
    date_fin_reelle TIMESTAMP WITH TIME ZONE,
    duree_estimee INTEGER, -- en minutes
    
    -- Adresse (si différente du client)
    adresse TEXT,
    ville VARCHAR(255),
    code_postal VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Rapport et notes
    rapport TEXT,
    notes_internes TEXT,
    notes_terrain TEXT,
    checklist JSONB,
    
    -- Signature client
    signature_client TEXT,
    nom_signataire VARCHAR(255),
    date_signature TIMESTAMP WITH TIME ZONE,
    
    -- Tarification
    montant_ht DECIMAL(10, 2),
    montant_tva DECIMAL(10, 2),
    montant_ttc DECIMAL(10, 2),
    
    -- Métadonnées
    source VARCHAR(50), -- 'admin', 'technicien', 'portail_client', 'api'
    tags JSONB,
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_interventions_entreprise ON public.interventions(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_interventions_client ON public.interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_technicien ON public.interventions(technicien_id);
CREATE INDEX IF NOT EXISTS idx_interventions_statut ON public.interventions(statut);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON public.interventions(date_intervention);
CREATE INDEX IF NOT EXISTS idx_interventions_created ON public.interventions(created_at);

-- ============================================
-- 3. TABLE: photos
-- ============================================
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
    intervention_id UUID REFERENCES public.interventions(id) ON DELETE CASCADE,
    devis_id UUID REFERENCES public.devis(id) ON DELETE CASCADE,
    
    -- Informations photo
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    filename VARCHAR(255),
    type_photo VARCHAR(50) DEFAULT 'autre' CHECK (type_photo IN ('avant', 'pendant', 'apres', 'signature', 'autre')),
    description TEXT,
    
    -- Métadonnées
    taille INTEGER, -- en bytes
    mime_type VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_photos_intervention ON public.photos(intervention_id);
CREATE INDEX IF NOT EXISTS idx_photos_devis ON public.photos(devis_id);
CREATE INDEX IF NOT EXISTS idx_photos_type ON public.photos(type_photo);

-- ============================================
-- 4. TABLE: factures
-- ============================================
CREATE TABLE IF NOT EXISTS public.factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    intervention_id UUID REFERENCES public.interventions(id) ON DELETE SET NULL,
    devis_id UUID REFERENCES public.devis(id) ON DELETE SET NULL,
    
    -- Numérotation
    numero_facture VARCHAR(50) NOT NULL,
    
    -- Statut
    statut VARCHAR(50) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoyee', 'payee', 'partielle', 'annulee', 'impayee')),
    
    -- Dates
    date_facture DATE DEFAULT CURRENT_DATE,
    date_echeance DATE,
    date_paiement TIMESTAMP WITH TIME ZONE,
    
    -- Montants
    total_ht DECIMAL(10, 2) DEFAULT 0,
    total_tva DECIMAL(10, 2) DEFAULT 0,
    total_ttc DECIMAL(10, 2) DEFAULT 0,
    montant_paye DECIMAL(10, 2) DEFAULT 0,
    montant_restant DECIMAL(10, 2) DEFAULT 0,
    
    -- Remise
    remise_type VARCHAR(20), -- 'pourcentage' ou 'montant'
    remise_valeur DECIMAL(10, 2),
    
    -- Paiement
    mode_paiement VARCHAR(50), -- 'carte', 'virement', 'cheque', 'especes'
    reference_paiement VARCHAR(255),
    
    -- Contenu
    conditions TEXT,
    notes TEXT,
    mentions_legales TEXT,
    
    -- Envoi
    email_envoye BOOLEAN DEFAULT false,
    date_envoi TIMESTAMP WITH TIME ZONE,
    
    -- Token pour accès client
    token_client UUID DEFAULT gen_random_uuid(),
    
    -- Stripe
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_factures_entreprise ON public.factures(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_factures_client ON public.factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON public.factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_numero ON public.factures(numero_facture);
CREATE INDEX IF NOT EXISTS idx_factures_date ON public.factures(date_facture);

-- Contrainte unique sur le numéro de facture par entreprise
ALTER TABLE public.factures ADD CONSTRAINT unique_numero_facture_entreprise UNIQUE (entreprise_id, numero_facture);

-- ============================================
-- 5. TABLE: facture_lignes
-- ============================================
CREATE TABLE IF NOT EXISTS public.facture_lignes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
    
    -- Contenu
    description TEXT NOT NULL,
    quantite DECIMAL(10, 2) DEFAULT 1,
    prix_unitaire DECIMAL(10, 2) NOT NULL,
    tva DECIMAL(5, 2) DEFAULT 20, -- Pourcentage TVA
    
    -- Calculs
    montant_ht DECIMAL(10, 2),
    montant_tva DECIMAL(10, 2),
    montant_ttc DECIMAL(10, 2),
    
    -- Remise ligne
    remise_type VARCHAR(20),
    remise_valeur DECIMAL(10, 2),
    
    -- Ordre d'affichage
    ordre INTEGER DEFAULT 0,
    
    -- Référence produit/service (pour le Pricebook futur)
    produit_id UUID,
    reference VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_facture_lignes_facture ON public.facture_lignes(facture_id);

-- ============================================
-- 6. TRIGGER: Mise à jour automatique updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger aux tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interventions_updated_at ON public.interventions;
CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_factures_updated_at ON public.factures;
CREATE TRIGGER update_factures_updated_at BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. RLS (Row Level Security) - Politiques de base
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facture_lignes ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs voient uniquement les données de leur entreprise
CREATE POLICY "Users can view own enterprise data" ON public.users
    FOR ALL USING (
        entreprise_id IN (
            SELECT entreprise_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view own enterprise interventions" ON public.interventions
    FOR ALL USING (
        entreprise_id IN (
            SELECT entreprise_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view own enterprise photos" ON public.photos
    FOR ALL USING (
        entreprise_id IN (
            SELECT entreprise_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view own enterprise factures" ON public.factures
    FOR ALL USING (
        entreprise_id IN (
            SELECT entreprise_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view facture_lignes" ON public.facture_lignes
    FOR ALL USING (
        facture_id IN (
            SELECT id FROM public.factures WHERE entreprise_id IN (
                SELECT entreprise_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

-- ============================================
-- 8. Données de test (optionnel - à commenter si non désiré)
-- ============================================

-- Décommentez les lignes suivantes si vous voulez des données de test
-- INSERT INTO public.users (id, entreprise_id, email, nom, prenom, role) 
-- VALUES ('VOTRE_USER_ID', 'VOTRE_ENTREPRISE_ID', 'contact@actoos.com', 'Kane', 'Salif', 'super_admin');

-- ============================================
-- FIN DU SCRIPT
-- ============================================

-- Vérification: Afficher les tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
