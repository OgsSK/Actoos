-- ============================================
-- ACTOOS PRO - PRICEBOOK TABLES
-- Exécutez ce script dans Supabase SQL Editor
-- ============================================

-- Table des catégories du catalogue
CREATE TABLE IF NOT EXISTS pricebook_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    couleur VARCHAR(50) DEFAULT '#3B82F6',
    icone VARCHAR(50) DEFAULT 'package',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les catégories
CREATE INDEX IF NOT EXISTS idx_pricebook_categories_entreprise 
ON pricebook_categories(entreprise_id);

-- Table des articles du catalogue
CREATE TABLE IF NOT EXISTS pricebook_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    categorie_id UUID REFERENCES pricebook_categories(id) ON DELETE SET NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    prix_ht NUMERIC(12,2) DEFAULT 0,
    tva NUMERIC(5,2) DEFAULT 20,
    unite VARCHAR(50) DEFAULT 'unite',
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les articles
CREATE INDEX IF NOT EXISTS idx_pricebook_items_entreprise 
ON pricebook_items(entreprise_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_items_categorie 
ON pricebook_items(categorie_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_items_actif 
ON pricebook_items(actif);

-- RLS (Row Level Security) policies
ALTER TABLE pricebook_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricebook_items ENABLE ROW LEVEL SECURITY;

-- Policy pour les catégories: accès par entreprise
CREATE POLICY "Users can view their company's pricebook categories"
ON pricebook_categories FOR SELECT
USING (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Users can insert pricebook categories for their company"
ON pricebook_categories FOR INSERT
WITH CHECK (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Users can update their company's pricebook categories"
ON pricebook_categories FOR UPDATE
USING (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Users can delete their company's pricebook categories"
ON pricebook_categories FOR DELETE
USING (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

-- Policy pour les articles: accès par entreprise
CREATE POLICY "Users can view their company's pricebook items"
ON pricebook_items FOR SELECT
USING (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Users can insert pricebook items for their company"
ON pricebook_items FOR INSERT
WITH CHECK (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Users can update their company's pricebook items"
ON pricebook_items FOR UPDATE
USING (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Users can delete their company's pricebook items"
ON pricebook_items FOR DELETE
USING (entreprise_id IN (
    SELECT entreprise_id FROM users WHERE id = auth.uid()
));

-- Grant permissions to authenticated users
GRANT ALL ON pricebook_categories TO authenticated;
GRANT ALL ON pricebook_items TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, you should see:
-- - pricebook_categories table
-- - pricebook_items table
-- - Proper RLS policies enabled
-- ============================================
