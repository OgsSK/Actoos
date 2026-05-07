-- =====================================================
-- ACTOOS ONE - COLONNES ADDITIONNELLES POUR SETTINGS
-- =====================================================
-- Exécutez ce script après schema_supabase_clean.sql
-- =====================================================

-- =====================================================
-- 1. COLONNES MENU_ITEMS
-- =====================================================
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS max_per_order INTEGER DEFAULT 10;

-- =====================================================
-- 2. COLONNES PARTNERS (Settings)
-- =====================================================
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS accepts_delivery BOOLEAN DEFAULT true;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS accepts_self_delivery BOOLEAN DEFAULT false;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS accepts_pickup BOOLEAN DEFAULT true;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS self_delivery_fee INTEGER DEFAULT 500;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS self_delivery_radius_km INTEGER DEFAULT 5;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS allows_scheduled_orders BOOLEAN DEFAULT true;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS max_schedule_days INTEGER DEFAULT 7;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS accepts_orders_when_closed BOOLEAN DEFAULT true;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS accepts_cash BOOLEAN DEFAULT true;

-- =====================================================
-- 3. POLICY UPDATE pour partners et menu_items
-- =====================================================
DROP POLICY IF EXISTS "Anyone can update partners" ON partners;
CREATE POLICY "Anyone can update partners" ON partners FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can update menu_items" ON menu_items;
CREATE POLICY "Anyone can update menu_items" ON menu_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can insert menu_items" ON menu_items;
CREATE POLICY "Anyone can insert menu_items" ON menu_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete menu_items" ON menu_items;
CREATE POLICY "Anyone can delete menu_items" ON menu_items FOR DELETE USING (true);

-- =====================================================
-- 4. Activer Realtime sur menu_items
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE partners;

-- =====================================================
-- SCRIPT TERMINE
-- =====================================================
