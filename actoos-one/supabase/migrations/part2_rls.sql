-- =====================================================
-- PARTIE 2: RLS POLICIES
-- Exécutez après la partie 1
-- =====================================================

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

-- Promo codes: everyone can read active promos
DROP POLICY IF EXISTS promo_codes_select ON promo_codes;
CREATE POLICY promo_codes_select ON promo_codes FOR SELECT USING (is_active = true);

-- Promo usage: users see their own
DROP POLICY IF EXISTS promo_usage_all ON promo_usage;
CREATE POLICY promo_usage_all ON promo_usage FOR ALL USING (true);

-- Ratings: everyone can read
DROP POLICY IF EXISTS ratings_select ON ratings;
CREATE POLICY ratings_select ON ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS ratings_insert_policy ON ratings;
CREATE POLICY ratings_insert_policy ON ratings FOR INSERT WITH CHECK (true);

-- Partner analytics: everyone can read
DROP POLICY IF EXISTS analytics_select ON partner_analytics;
CREATE POLICY analytics_select ON partner_analytics FOR SELECT USING (true);

-- Notifications: users see their own
DROP POLICY IF EXISTS notifications_all ON scheduled_notifications;
CREATE POLICY notifications_all ON scheduled_notifications FOR ALL USING (true);

-- User PINs: users manage their own
DROP POLICY IF EXISTS pins_all ON user_pins;
CREATE POLICY pins_all ON user_pins FOR ALL USING (true);
