-- =============================================
-- ACTOOS ONE - Tables supplémentaires V1
-- Consentements & Sécurité
-- =============================================

-- Table des consentements utilisateurs (RGPD)
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    consent_type VARCHAR(50) NOT NULL,
    -- Types: 'cookies_full', 'cookies_essential', 'cookies_custom', 'terms', 'privacy'
    
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    
    ip_address VARCHAR(100),
    user_agent TEXT,
    
    preferences JSONB,
    -- Pour cookies_custom: {"essential": true, "analytics": true, "location": false, ...}
    
    accepted_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide par user
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);

-- =============================================
-- Mise à jour table onboarding_requests
-- (si pas déjà créée avec ces champs)
-- =============================================

-- S'assurer que la table a tous les champs nécessaires
-- ALTER TABLE onboarding_requests ADD COLUMN IF NOT EXISTS admin_note TEXT;
-- ALTER TABLE onboarding_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
-- ALTER TABLE onboarding_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
