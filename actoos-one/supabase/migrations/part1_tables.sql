-- =====================================================
-- PARTIE 1: TABLES
-- Exécutez cette partie en premier
-- =====================================================

-- 1. TABLE PROMO_CODES
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
    partner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE PROMO_USAGE
CREATE TABLE IF NOT EXISTS promo_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID,
    order_id UUID,
    discount_applied DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE RATINGS
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    user_id UUID,
    restaurant_rating INTEGER CHECK (restaurant_rating BETWEEN 1 AND 5),
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    restaurant_comment TEXT,
    driver_comment TEXT,
    restaurant_tags TEXT[],
    driver_tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE PARTNER_ANALYTICS
CREATE TABLE IF NOT EXISTS partner_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID,
    date DATE NOT NULL,
    orders_count INTEGER DEFAULT 0,
    orders_value DECIMAL(12, 2) DEFAULT 0,
    avg_preparation_time INTEGER,
    cancellation_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2),
    ratings_count INTEGER DEFAULT 0,
    top_items JSONB,
    peak_hours JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE SCHEDULED_NOTIFICATIONS
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE USER_PINS
CREATE TABLE IF NOT EXISTS user_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    pin_hash TEXT NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INSERT PROMO CODES
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, valid_until)
VALUES 
    ('BIENVENUE', '-2000 FCFA sur votre première commande', 'fixed', 2000, 5000, NOW() + INTERVAL '1 year'),
    ('ACTOOS10', '10 pourcent de réduction', 'percentage', 10, 3000, NOW() + INTERVAL '6 months'),
    ('LIVGRATUITE', 'Livraison gratuite', 'free_delivery', 0, 5000, NOW() + INTERVAL '3 months')
ON CONFLICT (code) DO NOTHING;
