-- ============================================================
-- SCHÉMA POSTGRESQL - ACTOOS PRO
-- Migration depuis MongoDB
-- Date: 5 Mai 2026
-- ============================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'technicien', 'super_admin');
CREATE TYPE user_statut AS ENUM ('actif', 'inactif', 'en_attente');
CREATE TYPE intervention_statut AS ENUM ('planifiee', 'en_cours', 'terminee', 'annulee', 'disponible', 'reclamee');
CREATE TYPE intervention_priorite AS ENUM ('basse', 'normale', 'haute', 'urgente');
CREATE TYPE devis_statut AS ENUM ('brouillon', 'envoye', 'signe', 'refuse', 'expire');
CREATE TYPE facture_statut AS ENUM ('brouillon', 'envoyee', 'payee', 'partielle', 'en_retard', 'annulee');
CREATE TYPE client_type AS ENUM ('particulier', 'professionnel');
CREATE TYPE plan_type AS ENUM ('free', 'startup', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

-- ============================================================
-- TABLE: entreprises (TENANT PRINCIPAL)
-- ============================================================

CREATE TABLE entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    siret VARCHAR(50),
    tva_intra VARCHAR(50),
    logo_url TEXT,
    couleur_primaire VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Plan & Limites
    plan plan_type DEFAULT 'free',
    plan_limits JSONB DEFAULT '{}',
    
    -- Stripe
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status subscription_status DEFAULT 'active',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Séquences
    sequence_devis INTEGER DEFAULT 1,
    sequence_facture INTEGER DEFAULT 1,
    
    -- Settings
    payment_settings JSONB DEFAULT '{}',
    
    -- Demo
    is_demo BOOLEAN DEFAULT FALSE,
    demo_last_reset TIMESTAMP WITH TIME ZONE,
    demo_session_count INTEGER DEFAULT 0,
    
    -- Discount
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2),
    discount_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_entreprises_stripe_customer ON entreprises(stripe_customer_id);
CREATE INDEX idx_entreprises_plan ON entreprises(plan);

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    telephone VARCHAR(50),
    role user_role DEFAULT 'technicien',
    statut user_statut DEFAULT 'actif',
    
    -- Technicien specific
    skills JSONB DEFAULT '[]',
    specialites JSONB DEFAULT '[]',
    
    -- 2FA
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    
    -- Session
    derniere_connexion TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_entreprise ON users(entreprise_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(entreprise_id, role);

-- ============================================================
-- TABLE: categories
-- ============================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    couleur VARCHAR(7) DEFAULT '#3B82F6',
    icone VARCHAR(50),
    checklist JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_entreprise ON categories(entreprise_id);

-- ============================================================
-- TABLE: clients
-- ============================================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    email VARCHAR(255),
    telephone VARCHAR(50),
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    type_client client_type DEFAULT 'particulier',
    notes TEXT,
    portal_token UUID DEFAULT uuid_generate_v4(),
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_entreprise ON clients(entreprise_id);
CREATE INDEX idx_clients_email ON clients(entreprise_id, email);
CREATE INDEX idx_clients_nom ON clients(entreprise_id, nom);
CREATE INDEX idx_clients_portal_token ON clients(portal_token);

-- ============================================================
-- TABLE: sites (adresses récurrentes)
-- ============================================================

CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    nom VARCHAR(255) NOT NULL,
    adresse TEXT NOT NULL,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    contact_nom VARCHAR(100),
    contact_telephone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sites_entreprise ON sites(entreprise_id);
CREATE INDEX idx_sites_client ON sites(client_id);

-- ============================================================
-- TABLE: interventions
-- ============================================================

CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    technicien_id UUID REFERENCES users(id) ON DELETE SET NULL,
    categorie_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    
    date_prevue TIMESTAMP WITH TIME ZONE,
    heure_debut TIME,
    duree_estimee INTEGER DEFAULT 60, -- minutes
    
    statut intervention_statut DEFAULT 'planifiee',
    priorite intervention_priorite DEFAULT 'normale',
    
    notes_internes TEXT,
    notes_technicien TEXT,
    rapport TEXT,
    
    -- Photos stockées en JSONB ou table séparée
    photos JSONB DEFAULT '[]',
    
    -- Checklist complétée
    checklist_completed JSONB DEFAULT '[]',
    
    -- Signature
    signature_client TEXT,
    nom_signataire VARCHAR(100),
    date_signature TIMESTAMP WITH TIME ZONE,
    
    -- Timing réel
    date_debut_reelle TIMESTAMP WITH TIME ZONE,
    date_fin_reelle TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_interventions_entreprise ON interventions(entreprise_id);
CREATE INDEX idx_interventions_date ON interventions(entreprise_id, date_prevue);
CREATE INDEX idx_interventions_statut ON interventions(entreprise_id, statut);
CREATE INDEX idx_interventions_technicien ON interventions(entreprise_id, technicien_id);
CREATE INDEX idx_interventions_client ON interventions(entreprise_id, client_id);
CREATE INDEX idx_interventions_search ON interventions(entreprise_id, date_prevue, statut);

-- ============================================================
-- TABLE: devis
-- ============================================================

CREATE TABLE devis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
    technicien_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    numero_devis VARCHAR(50) NOT NULL,
    statut devis_statut DEFAULT 'brouillon',
    
    -- Montants
    total_ht DECIMAL(10,2) DEFAULT 0,
    total_tva DECIMAL(10,2) DEFAULT 0,
    total_ttc DECIMAL(10,2) DEFAULT 0,
    
    -- Lignes en JSONB
    lignes JSONB DEFAULT '[]',
    
    -- Conditions
    conditions TEXT,
    message_client TEXT,
    validite_jours INTEGER DEFAULT 30,
    date_expiration TIMESTAMP WITH TIME ZONE,
    
    -- Signature
    token_client UUID DEFAULT uuid_generate_v4(),
    signature_client TEXT,
    nom_signataire VARCHAR(100),
    date_signature TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_devis_entreprise ON devis(entreprise_id);
CREATE INDEX idx_devis_client ON devis(client_id);
CREATE INDEX idx_devis_token ON devis(token_client);
CREATE INDEX idx_devis_numero ON devis(entreprise_id, numero_devis);

-- ============================================================
-- TABLE: factures
-- ============================================================

CREATE TABLE factures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
    intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
    technicien_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    numero_facture VARCHAR(50) NOT NULL,
    statut facture_statut DEFAULT 'brouillon',
    
    -- Montants
    total_ht DECIMAL(10,2) DEFAULT 0,
    total_tva DECIMAL(10,2) DEFAULT 0,
    total_ttc DECIMAL(10,2) DEFAULT 0,
    montant_paye DECIMAL(10,2) DEFAULT 0,
    
    -- Lignes en JSONB
    lignes JSONB DEFAULT '[]',
    
    -- Paiement
    conditions_paiement TEXT,
    echeance_jours INTEGER DEFAULT 30,
    date_echeance TIMESTAMP WITH TIME ZONE,
    date_paiement TIMESTAMP WITH TIME ZONE,
    mode_paiement VARCHAR(50),
    
    -- Token pour portail client
    token_client UUID DEFAULT uuid_generate_v4(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_factures_entreprise ON factures(entreprise_id);
CREATE INDEX idx_factures_client ON factures(client_id);
CREATE INDEX idx_factures_statut ON factures(entreprise_id, statut);
CREATE INDEX idx_factures_numero ON factures(entreprise_id, numero_facture);

-- ============================================================
-- TABLE: invoice_payments (paiements partiels)
-- ============================================================

CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    montant DECIMAL(10,2) NOT NULL,
    mode_paiement VARCHAR(50),
    reference VARCHAR(255),
    notes TEXT,
    date_paiement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_payments_facture ON invoice_payments(facture_id);

-- ============================================================
-- TABLE: payment_transactions (Stripe)
-- ============================================================

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_entreprise ON payment_transactions(entreprise_id);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entreprise ON audit_logs(entreprise_id, timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- TABLE: tech_invites
-- ============================================================

CREATE TABLE tech_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    telephone VARCHAR(50) NOT NULL,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    email VARCHAR(255),
    code VARCHAR(6) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tech_invites_entreprise ON tech_invites(entreprise_id);
CREATE INDEX idx_tech_invites_code ON tech_invites(code);

-- ============================================================
-- TABLE: api_keys
-- ============================================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL,
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_entreprise ON api_keys(entreprise_id);

-- ============================================================
-- TABLE: chat_messages
-- ============================================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    read_by JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_intervention ON chat_messages(intervention_id, created_at);

-- ============================================================
-- TABLE: webhooks
-- ============================================================

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events JSONB DEFAULT '[]',
    secret TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_entreprise ON webhooks(entreprise_id);

-- ============================================================
-- TABLE: coupons
-- ============================================================

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    applicable_plans JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Multi-tenancy
-- ============================================================

-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (to be implemented with app user context)
-- CREATE POLICY tenant_isolation ON users
--     USING (entreprise_id = current_setting('app.current_entreprise_id')::uuid);

-- ============================================================
-- TRIGGERS pour updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_entreprises_updated_at BEFORE UPDATE ON entreprises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devis_updated_at BEFORE UPDATE ON devis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factures_updated_at BEFORE UPDATE ON factures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
