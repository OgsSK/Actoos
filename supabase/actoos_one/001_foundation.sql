-- =====================================================
-- ACTOOS ONE — FONDATION SQL V1
-- =====================================================
-- "Vision V3, Exécution V1"
-- Infrastructure Fintech & Logistique pour l'Afrique de l'Ouest
-- =====================================================
-- INSTRUCTIONS:
-- Exécuter ce script dans Supabase SQL Editor
-- =====================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. SYSTEM_CONFIG (Feature Flags)
-- =====================================================
CREATE TABLE system_config (
    id INT PRIMARY KEY DEFAULT 1,
    
    feature_eats BOOLEAN DEFAULT true,
    feature_health BOOLEAN DEFAULT false,
    feature_wallet BOOLEAN DEFAULT false,
    feature_p2p BOOLEAN DEFAULT false,
    feature_cards BOOLEAN DEFAULT false,
    feature_black BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO system_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. USERS
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    country_code VARCHAR(5) DEFAULT '+223',
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    
    pin_hash VARCHAR(255),
    failed_pin_attempts INT DEFAULT 0,
    
    total_spent DECIMAL(15,2) DEFAULT 0,
    
    is_blocked BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT users_phone_unique UNIQUE (country_code, phone)
);

-- Index pour recherche par téléphone
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_country_phone ON users(country_code, phone);

-- =====================================================
-- 3. USER_CONSENTS
-- =====================================================
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    consent_type VARCHAR(50) NOT NULL,
    accepted BOOLEAN NOT NULL DEFAULT false,
    
    ip_address VARCHAR(100),
    user_agent TEXT,
    
    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par user
CREATE INDEX idx_user_consents_user ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);

-- =====================================================
-- 4. WALLETS
-- =====================================================
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    wallet_type VARCHAR(20) DEFAULT 'personal',
    
    balance DECIMAL(15,2) DEFAULT 0.00,
    daily_spend_limit DECIMAL(15,2),
    
    parent_wallet_id UUID REFERENCES wallets(id),
    
    is_frozen BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT wallets_owner_type_unique UNIQUE (owner_id, wallet_type)
);

-- Index pour recherche par owner
CREATE INDEX idx_wallets_owner ON wallets(owner_id);
CREATE INDEX idx_wallets_type ON wallets(wallet_type);

-- =====================================================
-- 5. LEDGER_TRANSACTIONS
-- =====================================================
CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    
    reference_id UUID,
    reference_type VARCHAR(50),
    
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par wallet et date
CREATE INDEX idx_ledger_wallet ON ledger_transactions(wallet_id);
CREATE INDEX idx_ledger_created ON ledger_transactions(created_at DESC);
CREATE INDEX idx_ledger_reference ON ledger_transactions(reference_id);

-- =====================================================
-- 6. DELIVERY_ZONES
-- =====================================================
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50) DEFAULT 'Bamako',
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par ville
CREATE INDEX idx_delivery_zones_city ON delivery_zones(city);

-- =====================================================
-- 7. PARTNERS
-- =====================================================
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID REFERENCES users(id),
    
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'restaurant',
    
    description TEXT,
    image_url TEXT,
    
    address TEXT,
    city VARCHAR(50) DEFAULT 'Bamako',
    zone_id UUID REFERENCES delivery_zones(id),
    
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    accepts_cash BOOLEAN DEFAULT false,
    delivery_mode VARCHAR(20) DEFAULT 'actoos',
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    
    is_active BOOLEAN DEFAULT true,
    is_open BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false,
    
    avg_prep_time_minutes INT DEFAULT 30,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX idx_partners_category ON partners(category);
CREATE INDEX idx_partners_city ON partners(city);
CREATE INDEX idx_partners_active ON partners(is_active, is_open);
CREATE INDEX idx_partners_zone ON partners(zone_id);

-- =====================================================
-- 8. MENU_ITEMS
-- =====================================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    price DECIMAL(10,2) NOT NULL,
    
    image_url TEXT,
    category VARCHAR(50),
    
    is_available BOOLEAN DEFAULT true,
    max_per_order INT DEFAULT 10,
    
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par partenaire
CREATE INDEX idx_menu_items_partner ON menu_items(partner_id);
CREATE INDEX idx_menu_items_available ON menu_items(partner_id, is_available);
CREATE INDEX idx_menu_items_category ON menu_items(category);

-- =====================================================
-- 9. DRIVERS
-- =====================================================
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    vehicle_type VARCHAR(20) DEFAULT 'moto',
    vehicle_plate VARCHAR(20),
    
    is_online BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    
    current_order_id UUID,
    
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    last_location_update TIMESTAMPTZ,
    
    total_deliveries INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.00,
    
    caution_balance DECIMAL(15,2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT drivers_user_unique UNIQUE (user_id)
);

-- Index pour recherche
CREATE INDEX idx_drivers_online ON drivers(is_online, is_verified);
CREATE INDEX idx_drivers_available ON drivers(is_online, current_order_id) WHERE is_online = true AND current_order_id IS NULL;
CREATE INDEX idx_drivers_user ON drivers(user_id);

-- =====================================================
-- 10. ORDERS
-- =====================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    client_id UUID REFERENCES users(id),
    partner_id UUID NOT NULL REFERENCES partners(id),
    driver_id UUID REFERENCES drivers(id),
    
    -- Statuts: pending, confirmed, preparing, ready, picked_up, delivering, delivered, cancelled
    status VARCHAR(20) DEFAULT 'pending',
    
    delivery_type VARCHAR(20) DEFAULT 'delivery',
    
    -- Montants (calculés côté serveur)
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    service_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Paiement: wallet, cash, mobile_money
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    -- Livraison
    delivery_address TEXT,
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(11,8),
    delivery_instructions TEXT,
    
    -- Code OTP pour validation livraison (HASHÉ)
    delivery_code VARCHAR(10) NOT NULL,
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMPTZ,
    
    -- Token sécurisé pour accès sans auth
    secure_token UUID DEFAULT uuid_generate_v4(),
    
    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_partner ON orders(partner_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_secure_token ON orders(secure_token);
CREATE INDEX idx_orders_partner_status ON orders(partner_id, status);
CREATE INDEX idx_orders_driver_status ON orders(driver_id, status);

-- =====================================================
-- 11. ORDER_ITEMS
-- =====================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES menu_items(id),
    
    quantity INT DEFAULT 1,
    price_at_time DECIMAL(10,2) NOT NULL,
    
    special_instructions TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par commande
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_item ON order_items(item_id);

-- =====================================================
-- 12. ORDER_LOGS
-- =====================================================
CREATE TABLE order_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(20),
    
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX idx_order_logs_order ON order_logs(order_id);
CREATE INDEX idx_order_logs_event ON order_logs(event_type);
CREATE INDEX idx_order_logs_created ON order_logs(created_at DESC);

-- =====================================================
-- 13. ONBOARDING_REQUESTS
-- =====================================================
CREATE TABLE onboarding_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    type VARCHAR(20) NOT NULL CHECK (type IN ('partner', 'driver')),
    
    payload JSONB NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    admin_note TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX idx_onboarding_type ON onboarding_requests(type);
CREATE INDEX idx_onboarding_status ON onboarding_requests(status);
CREATE INDEX idx_onboarding_created ON onboarding_requests(created_at DESC);

-- =====================================================
-- 14. OTP_CODES (Table auxiliaire pour gestion OTP)
-- =====================================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    phone VARCHAR(20) NOT NULL,
    country_code VARCHAR(5) DEFAULT '+223',
    
    otp_hash VARCHAR(255) NOT NULL,
    
    purpose VARCHAR(20) DEFAULT 'login' CHECK (purpose IN ('login', 'delivery', 'transaction')),
    
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche et nettoyage
CREATE INDEX idx_otp_phone ON otp_codes(country_code, phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- =====================================================
-- 15. ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 16. RLS POLICIES (Permissive pour V1)
-- =====================================================

-- System Config (lecture publique)
CREATE POLICY "system_config_read" ON system_config FOR SELECT TO anon, authenticated USING (true);

-- Users
CREATE POLICY "users_read" ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated USING (true);

-- User Consents
CREATE POLICY "user_consents_all" ON user_consents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Wallets
CREATE POLICY "wallets_all" ON wallets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ledger Transactions
CREATE POLICY "ledger_read" ON ledger_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ledger_insert" ON ledger_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Delivery Zones (lecture publique)
CREATE POLICY "delivery_zones_read" ON delivery_zones FOR SELECT TO anon, authenticated USING (true);

-- Partners (lecture publique)
CREATE POLICY "partners_read" ON partners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "partners_write" ON partners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Menu Items (lecture publique)
CREATE POLICY "menu_items_read" ON menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "menu_items_write" ON menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drivers
CREATE POLICY "drivers_all" ON drivers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Orders
CREATE POLICY "orders_all" ON orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Order Items
CREATE POLICY "order_items_all" ON order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Order Logs
CREATE POLICY "order_logs_all" ON order_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Onboarding Requests
CREATE POLICY "onboarding_all" ON onboarding_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- OTP Codes
CREATE POLICY "otp_all" ON otp_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 17. GRANTS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- DONE!
-- =====================================================
-- ACTOOS ONE - Base de données initialisée
-- 14 tables créées avec FK, UNIQUE, INDEX et RLS
-- =====================================================
