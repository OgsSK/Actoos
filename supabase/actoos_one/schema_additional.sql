-- =====================================================
-- ACTOOS ONE - SCHEMA COMPLÉMENTAIRE PRODUCTION
-- =====================================================
-- Tables additionnelles pour fonctionnalités complètes
-- À exécuter APRÈS le schema principal
-- =====================================================

-- =====================================================
-- 1. TABLE FAVORITES (Favoris utilisateur)
-- =====================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_partner ON favorites(partner_id);

-- =====================================================
-- 2. TABLE RATINGS (Notations)
-- =====================================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID,
  restaurant_rating INTEGER CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  restaurant_comment TEXT,
  driver_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_order ON ratings(order_id);

-- =====================================================
-- 3. TABLE PROMO_CODES (Codes Promo)
-- =====================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
  discount_value INTEGER NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  max_discount INTEGER,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_active ON promo_codes(is_active);

-- =====================================================
-- 4. TABLE PROMO_USAGE (Utilisation des promos)
-- =====================================================
CREATE TABLE IF NOT EXISTS promo_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON promo_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_promo ON promo_usage(promo_code_id);

-- =====================================================
-- 5. TABLE DRIVER_LOCATIONS (Position livreurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_loc ON driver_locations(driver_id);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Public read favorites" ON favorites FOR SELECT USING (true);
CREATE POLICY "Public read ratings" ON ratings FOR SELECT USING (true);
CREATE POLICY "Public read promo_codes" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "Public read promo_usage" ON promo_usage FOR SELECT USING (true);
CREATE POLICY "Public read driver_locations" ON driver_locations FOR SELECT USING (true);

-- Insertion publique
CREATE POLICY "Anyone can insert favorites" ON favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert ratings" ON ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert promo_usage" ON promo_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert driver_locations" ON driver_locations FOR INSERT WITH CHECK (true);

-- Update
CREATE POLICY "Anyone can update favorites" ON favorites FOR UPDATE USING (true);
CREATE POLICY "Anyone can update promo_codes" ON promo_codes FOR UPDATE USING (true);
CREATE POLICY "Anyone can update driver_locations" ON driver_locations FOR UPDATE USING (true);

-- Delete
CREATE POLICY "Anyone can delete favorites" ON favorites FOR DELETE USING (true);

-- =====================================================
-- 7. ACTIVER REALTIME SUR NOUVELLES TABLES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;

-- =====================================================
-- 8. TRIGGER: Mettre à jour rating moyen du partenaire
-- =====================================================
CREATE OR REPLACE FUNCTION update_partner_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE partners 
  SET rating = (
    SELECT COALESCE(AVG(r.restaurant_rating), 0)
    FROM ratings r
    JOIN orders o ON r.order_id = o.id
    WHERE o.partner_id = (SELECT partner_id FROM orders WHERE id = NEW.order_id)
    AND r.restaurant_rating IS NOT NULL
  )
  WHERE id = (SELECT partner_id FROM orders WHERE id = NEW.order_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_rating ON ratings;
CREATE TRIGGER trigger_update_partner_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_rating();

-- =====================================================
-- 9. CODES PROMO DE TEST
-- =====================================================
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, valid_until, is_active) VALUES
('BIENVENUE', 'Code de bienvenue - 10% de réduction', 'percentage', 10, 2000, '2025-12-31 23:59:59', true),
('LIVRAISON', 'Livraison gratuite', 'free_delivery', 0, 3000, '2025-12-31 23:59:59', true),
('ACTOOS500', '500 FCFA de réduction', 'fixed', 500, 2500, '2025-12-31 23:59:59', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SCHEMA COMPLÉMENTAIRE TERMINÉ
-- =====================================================
