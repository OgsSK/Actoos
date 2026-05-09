-- ================================================================
-- ACTOOS ONE - Migration Multi-Pays
-- À exécuter dans Supabase SQL Editor
-- Date: 8 Mai 2026
-- ================================================================

-- ============================================================
-- 1. AJOUTER country_code À LA TABLE users
-- ============================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'ML';

-- Mettre à jour les utilisateurs existants (Mali par défaut)
UPDATE users SET country_code = 'ML' WHERE country_code IS NULL;

-- Index pour recherche par pays
CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);

COMMENT ON COLUMN users.country_code IS 'Code ISO du pays (ML, SN, CI, etc.)';

-- ============================================================
-- 2. AJOUTER country_code À LA TABLE partners
-- ============================================================
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'ML';

-- Mettre à jour les partenaires existants (Mali par défaut car tous à Bamako)
UPDATE partners SET country_code = 'ML' WHERE country_code IS NULL;

-- Index pour filtrage par pays
CREATE INDEX IF NOT EXISTS idx_partners_country_code ON partners(country_code);

COMMENT ON COLUMN partners.country_code IS 'Code ISO du pays où le restaurant opère';

-- ============================================================
-- 3. AJOUTER country_code À LA TABLE drivers (si existe)
-- ============================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drivers') THEN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'ML';
        UPDATE drivers SET country_code = 'ML' WHERE country_code IS NULL;
        CREATE INDEX IF NOT EXISTS idx_drivers_country_code ON drivers(country_code);
    END IF;
END $$;

-- ============================================================
-- 4. AJOUTER country_code À LA TABLE orders
-- ============================================================
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'ML';

-- Mettre à jour les commandes existantes
UPDATE orders SET country_code = 'ML' WHERE country_code IS NULL;

-- Index pour stats par pays
CREATE INDEX IF NOT EXISTS idx_orders_country_code ON orders(country_code);

COMMENT ON COLUMN orders.country_code IS 'Pays où la commande a été passée';

-- ============================================================
-- 5. CRÉER TABLE DE CONFIGURATION PAYS (optionnel)
-- ============================================================
CREATE TABLE IF NOT EXISTS countries (
    code VARCHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(10) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    is_active BOOLEAN DEFAULT false,
    launched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les pays d'Afrique de l'Ouest
INSERT INTO countries (code, name, phone_code, currency, is_active, launched_at) VALUES
    ('ML', 'Mali', '+223', 'XOF', true, NOW()),
    ('SN', 'Sénégal', '+221', 'XOF', false, NULL),
    ('CI', 'Côte d''Ivoire', '+225', 'XOF', false, NULL),
    ('BF', 'Burkina Faso', '+226', 'XOF', false, NULL),
    ('GN', 'Guinée', '+224', 'GNF', false, NULL),
    ('NE', 'Niger', '+227', 'XOF', false, NULL),
    ('TG', 'Togo', '+228', 'XOF', false, NULL),
    ('BJ', 'Bénin', '+229', 'XOF', false, NULL),
    ('GW', 'Guinée-Bissau', '+245', 'XOF', false, NULL),
    ('MR', 'Mauritanie', '+222', 'MRU', false, NULL)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    phone_code = EXCLUDED.phone_code;

-- ============================================================
-- 6. VÉRIFICATION
-- ============================================================
SELECT 'Migration terminée avec succès!' AS status;

-- Vérifier les colonnes ajoutées
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name = 'country_code' 
AND table_schema = 'public';
