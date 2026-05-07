-- =====================================================
-- ACTOOS ONE — Tables supplémentaires + Comptes Admin
-- =====================================================
-- Exécuter ce script dans Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABLE ONBOARDING REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('driver', 'partner')),
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_requests(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_type ON onboarding_requests(type);

-- RLS pour onboarding_requests
ALTER TABLE onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut créer une demande
CREATE POLICY IF NOT EXISTS "Anyone can create onboarding request" 
  ON onboarding_requests FOR INSERT 
  WITH CHECK (true);

-- Seuls les admins peuvent voir toutes les demandes
CREATE POLICY IF NOT EXISTS "Admins can view all onboarding requests" 
  ON onboarding_requests FOR SELECT 
  USING (true);

-- =====================================================
-- 2. COMPTES UTILISATEURS DE TEST
-- =====================================================

-- Admin ACTOOS (GOD MODE)
INSERT INTO users (id, country_code, phone, name, role, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+223', '00000001', 'Admin ACTOOS', 'admin', true)
ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Admin ACTOOS';

-- Livreur Test
INSERT INTO users (id, country_code, phone, name, role, is_active) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '+223', '70000001', 'Moussa Diallo', 'driver', true)
ON CONFLICT (id) DO UPDATE SET role = 'driver';

-- Créer le driver associé
INSERT INTO drivers (id, user_id, vehicle_type, is_verified, is_online) VALUES
('drvr-0001-0001-0001-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'moto', true, true)
ON CONFLICT (id) DO NOTHING;

-- Client Test
INSERT INTO users (id, country_code, phone, name, role, is_active) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '+223', '70123456', 'Aminata Keita', 'client', true)
ON CONFLICT (id) DO UPDATE SET role = 'client';

-- Créer wallet pour le client test
INSERT INTO wallets (id, owner_id, wallet_type, balance) VALUES
('wallet-client-test-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'personal', 25000)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. ASSOCIER UN USER AU PREMIER RESTAURANT (Partenaire)
-- =====================================================

-- User partenaire pour Maquis Chez Tanti
INSERT INTO users (id, country_code, phone, name, role, is_active) VALUES
('pppppppp-pppp-pppp-pppp-pppppppppppp', '+223', '70000002', 'Fatoumata Traore', 'partner', true)
ON CONFLICT (id) DO UPDATE SET role = 'partner';

-- Lier le user au restaurant
UPDATE partners SET owner_id = 'pppppppp-pppp-pppp-pppp-pppppppppppp' 
WHERE id = '22222222-2222-2222-2222-222222222201';

-- =====================================================
-- 4. CONFIGURATION SYSTÈME
-- =====================================================

-- S'assurer que system_config existe avec les bonnes valeurs
INSERT INTO system_config (id, feature_eats, feature_health, feature_wallet, feature_p2p, global_commission_rate) 
VALUES (1, true, true, true, true, 15.00)
ON CONFLICT (id) DO UPDATE SET 
  feature_eats = true,
  feature_health = true, 
  feature_wallet = true,
  feature_p2p = true;

-- =====================================================
-- RÉCAPITULATIF DES COMPTES DE TEST
-- =====================================================
-- 
-- ADMIN:
--   Téléphone: +223 00 00 00 01
--   Code OTP: n'importe quel code 4 chiffres (mode dev)
--   Accès: /admin
--
-- LIVREUR:
--   Téléphone: +223 70 00 00 01
--   Code OTP: n'importe quel code 4 chiffres
--   Accès: /driver
--
-- PARTENAIRE (Maquis Chez Tanti):
--   Téléphone: +223 70 00 00 02
--   Code OTP: n'importe quel code 4 chiffres
--   Accès: /partner
--
-- CLIENT:
--   Téléphone: +223 70 12 34 56
--   Code OTP: n'importe quel code 4 chiffres
--   Solde wallet: 25,000 FCFA
--
-- =====================================================
