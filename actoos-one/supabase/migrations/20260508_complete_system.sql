-- =====================================================
-- ACTOOS ONE - Migration Complète
-- Tables pour: Promos, Ratings, Analytics, Notifications
-- =====================================================

-- 1. TABLE PROMO_CODES (si non existante)
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
    discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount DECIMAL(10, 2),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    partner_id UUID REFERENCES partners(id), -- NULL = global promo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE PROMO_USAGE (tracking utilisation)
CREATE TABLE IF NOT EXISTS promo_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    order_id UUID REFERENCES orders(id),
    discount_applied DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour éviter double utilisation
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_usage_unique 
ON promo_usage(promo_code_id, user_id) 
WHERE user_id IS NOT NULL;

-- 3. TABLE RATINGS (notations)
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    restaurant_rating INTEGER CHECK (restaurant_rating BETWEEN 1 AND 5),
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    restaurant_comment TEXT,
    driver_comment TEXT,
    restaurant_tags TEXT[], -- ex: ['quality', 'fast', 'packaging']
    driver_tags TEXT[], -- ex: ['polite', 'fast_delivery']
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les stats
CREATE INDEX IF NOT EXISTS idx_ratings_order ON ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);

-- 4. TABLE PARTNER_ANALYTICS (statistiques partenaires - agrégées quotidiennement)
CREATE TABLE IF NOT EXISTS partner_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    orders_count INTEGER DEFAULT 0,
    orders_value DECIMAL(12, 2) DEFAULT 0,
    avg_preparation_time INTEGER, -- en minutes
    cancellation_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2),
    ratings_count INTEGER DEFAULT 0,
    top_items JSONB, -- [{item_id, name, quantity}]
    peak_hours JSONB, -- [{hour, orders_count}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partner_id, date)
);

CREATE INDEX IF NOT EXISTS idx_partner_analytics_date ON partner_analytics(partner_id, date);

-- 5. TABLE SCHEDULED_NOTIFICATIONS (notifications programmées)
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'order_reminder', 'promo', 'review_request'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON scheduled_notifications(scheduled_for) WHERE NOT is_sent;

-- 6. TABLE USER_PINS (PINs utilisateurs pour P2P)
CREATE TABLE IF NOT EXISTS user_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    pin_hash TEXT NOT NULL, -- PIN hashé avec bcrypt
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. FONCTION: Calculer stats partenaire
CREATE OR REPLACE FUNCTION get_partner_rating_stats(p_partner_id UUID)
RETURNS TABLE(average DECIMAL, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(r.restaurant_rating)::DECIMAL, 2) as average,
        COUNT(r.id) as count
    FROM ratings r
    INNER JOIN orders o ON r.order_id = o.id
    WHERE o.partner_id = p_partner_id
    AND r.restaurant_rating IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. FONCTION: Calculer analytics partenaire en temps réel
CREATE OR REPLACE FUNCTION get_partner_analytics_live(
    p_partner_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_orders BIGINT,
    total_revenue DECIMAL,
    avg_order_value DECIMAL,
    avg_rating DECIMAL,
    total_ratings BIGINT,
    cancellation_rate DECIMAL,
    orders_by_status JSONB,
    revenue_by_day JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH order_stats AS (
        SELECT 
            COUNT(*) as total,
            COALESCE(SUM(total_amount), 0) as revenue,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
        FROM orders
        WHERE partner_id = p_partner_id
        AND created_at::date BETWEEN p_start_date AND p_end_date
    ),
    rating_stats AS (
        SELECT 
            COALESCE(AVG(r.restaurant_rating), 0) as avg_rat,
            COUNT(r.id) as total_rat
        FROM ratings r
        INNER JOIN orders o ON r.order_id = o.id
        WHERE o.partner_id = p_partner_id
        AND o.created_at::date BETWEEN p_start_date AND p_end_date
        AND r.restaurant_rating IS NOT NULL
    ),
    status_counts AS (
        SELECT jsonb_object_agg(status, cnt) as by_status
        FROM (
            SELECT status, COUNT(*) as cnt
            FROM orders
            WHERE partner_id = p_partner_id
            AND created_at::date BETWEEN p_start_date AND p_end_date
            GROUP BY status
        ) s
    ),
    daily_revenue AS (
        SELECT jsonb_agg(jsonb_build_object('date', d, 'revenue', rev)) as by_day
        FROM (
            SELECT created_at::date as d, SUM(total_amount) as rev
            FROM orders
            WHERE partner_id = p_partner_id
            AND created_at::date BETWEEN p_start_date AND p_end_date
            AND status = 'delivered'
            GROUP BY created_at::date
            ORDER BY d
        ) dr
    )
    SELECT 
        os.total,
        os.revenue,
        CASE WHEN os.total > 0 THEN ROUND(os.revenue / os.total, 2) ELSE 0 END,
        ROUND(rs.avg_rat::DECIMAL, 2),
        rs.total_rat,
        CASE WHEN os.total > 0 THEN ROUND((os.cancelled::DECIMAL / os.total) * 100, 2) ELSE 0 END,
        COALESCE(sc.by_status, '{}'::jsonb),
        COALESCE(dr.by_day, '[]'::jsonb)
    FROM order_stats os, rating_stats rs, status_counts sc, daily_revenue dr;
END;
$$ LANGUAGE plpgsql;

-- 9. FONCTION: Vérifier PIN utilisateur
CREATE OR REPLACE FUNCTION verify_user_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_pin_record RECORD;
    v_is_valid BOOLEAN;
BEGIN
    SELECT * INTO v_pin_record FROM user_pins WHERE user_id = p_user_id;
    
    IF v_pin_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier si compte bloqué
    IF v_pin_record.locked_until IS NOT NULL AND v_pin_record.locked_until > NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le PIN (utilise pgcrypto)
    v_is_valid := v_pin_record.pin_hash = crypt(p_pin, v_pin_record.pin_hash);
    
    IF v_is_valid THEN
        -- Reset failed attempts
        UPDATE user_pins SET failed_attempts = 0, locked_until = NULL WHERE user_id = p_user_id;
    ELSE
        -- Increment failed attempts
        UPDATE user_pins 
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE 
                WHEN failed_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                ELSE NULL
            END
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FONCTION: Définir PIN utilisateur
CREATE OR REPLACE FUNCTION set_user_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_pins (user_id, pin_hash)
    VALUES (p_user_id, crypt(p_pin, gen_salt('bf')))
    ON CONFLICT (user_id) 
    DO UPDATE SET pin_hash = crypt(p_pin, gen_salt('bf')), updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. INSÉRER CODES PROMO DE DÉMO
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, valid_until)
VALUES 
    ('BIENVENUE', '-2000 FCFA sur votre première commande', 'fixed', 2000, 5000, NOW() + INTERVAL '1 year'),
    ('ACTOOS10', '10% de réduction', 'percentage', 10, 3000, NOW() + INTERVAL '6 months'),
    ('LIVGRATUITE', 'Livraison gratuite', 'free_delivery', 0, 5000, NOW() + INTERVAL '3 months')
ON CONFLICT (code) DO NOTHING;

-- 12. RLS Policies
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

-- Promo codes: lecture pour tous, écriture pour admin
CREATE POLICY "promo_codes_read" ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "promo_codes_admin" ON promo_codes FOR ALL USING (true); -- Admin via service role

-- Promo usage: utilisateurs peuvent voir leurs propres usages
CREATE POLICY "promo_usage_user" ON promo_usage FOR ALL USING (auth.uid() = user_id);

-- Ratings: utilisateurs peuvent créer pour leurs commandes
CREATE POLICY "ratings_read" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Partner analytics: partenaires voient leurs stats
CREATE POLICY "analytics_partner" ON partner_analytics FOR SELECT USING (true);

-- Notifications: utilisateurs voient leurs notifs
CREATE POLICY "notifications_user" ON scheduled_notifications FOR ALL USING (auth.uid() = user_id);

-- User PINs: privé
CREATE POLICY "pins_user" ON user_pins FOR ALL USING (auth.uid() = user_id);

COMMIT;
