-- =====================================================
-- ACTOOS ONE - SCHEMA COMPLET PRODUCTION
-- =====================================================
-- À exécuter dans Supabase SQL Editor
-- Supprime et recrée toutes les tables proprement
-- =====================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLE USERS (utilisateurs de tous types)
-- =====================================================
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'partner', 'driver', 'admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- 2. TABLE PARTNERS (restaurants/commerces)
-- =====================================================
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  image_url TEXT,
  address TEXT,
  city VARCHAR(100) DEFAULT 'Bamako',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Configuration
  is_active BOOLEAN DEFAULT false,
  is_open BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  accepts_cash BOOLEAN DEFAULT true,
  delivery_mode VARCHAR(20) DEFAULT 'actoos' CHECK (delivery_mode IN ('actoos', 'self')),
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  avg_prep_time_minutes INTEGER DEFAULT 30,
  min_order_amount INTEGER DEFAULT 0,
  
  -- Stats
  rating DECIMAL(2,1) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partners_owner ON partners(owner_id);
CREATE INDEX idx_partners_active ON partners(is_active);
CREATE INDEX idx_partners_city ON partners(city);

-- =====================================================
-- 3. TABLE MENU_ITEMS
-- =====================================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category VARCHAR(100),
  is_available BOOLEAN DEFAULT true,
  max_per_order INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_partner ON menu_items(partner_id);

-- =====================================================
-- 4. TABLE DRIVERS (livreurs)
-- =====================================================
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('moto', 'velo', 'voiture', 'autre')),
  license_plate VARCHAR(20),
  id_number VARCHAR(50),
  neighborhood VARCHAR(100),
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  
  -- Location
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  last_location_update TIMESTAMPTZ,
  
  -- Stats
  total_deliveries INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drivers_user ON drivers(user_id);
CREATE INDEX idx_drivers_online ON drivers(is_online);

-- =====================================================
-- 5. TABLE ORDERS
-- =====================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE,
  
  -- Relations
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  partner_id UUID NOT NULL REFERENCES partners(id),
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'preparing', 'ready', 
    'picked_up', 'delivering', 'delivered', 'cancelled'
  )),
  
  -- Type
  delivery_type VARCHAR(20) DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup')),
  
  -- Montants
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  service_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Paiement
  payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'wallet', 'mobile_money')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Livraison
  delivery_address TEXT,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_instructions TEXT,
  delivery_code VARCHAR(4),
  
  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_partner ON orders(partner_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);

-- =====================================================
-- 6. TABLE ORDER_ITEMS
-- =====================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- =====================================================
-- 7. TABLE WALLETS
-- =====================================================
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0,
  is_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_owner ON wallets(owner_id);

-- =====================================================
-- 8. TABLE WALLET_TRANSACTIONS
-- =====================================================
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'topup', 'payment', 'refund', 'transfer_in', 'transfer_out', 'withdrawal', 'commission'
  )),
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_wallet ON wallet_transactions(wallet_id);

-- =====================================================
-- 9. TABLE ONBOARDING_REQUESTS (demandes d'inscription)
-- =====================================================
CREATE TABLE onboarding_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('partner', 'driver')),
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_type ON onboarding_requests(type);
CREATE INDEX idx_onboarding_status ON onboarding_requests(status);

-- =====================================================
-- 10. FONCTION: Générer numéro de commande
-- =====================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ACT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  NEW.delivery_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- 11. FONCTION: Créer wallet automatiquement
-- =====================================================
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (owner_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_wallet ON users;
CREATE TRIGGER auto_create_wallet
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_wallet();

-- =====================================================
-- 12. COMPTE ADMIN
-- =====================================================
INSERT INTO users (id, email, name, role, is_active, email_verified)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'contact@actoos.com',
  'Admin ACTOOS',
  'admin',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET role = 'admin', email = 'contact@actoos.com';

-- =====================================================
-- 13. ACTIVER RLS (Row Level Security)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Policies pour lecture publique des restaurants et menus
CREATE POLICY "Partners are viewable by everyone" ON partners FOR SELECT USING (true);
CREATE POLICY "Menu items are viewable by everyone" ON menu_items FOR SELECT USING (true);

-- Policies pour users
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text OR role = 'admin');
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Policies pour orders
CREATE POLICY "Orders viewable by participants" ON orders FOR SELECT USING (
  auth.uid()::text = client_id::text OR 
  auth.uid()::text IN (SELECT owner_id::text FROM partners WHERE id = partner_id) OR
  auth.uid()::text IN (SELECT user_id::text FROM drivers WHERE id = driver_id)
);

-- Policy pour insertion publique (inscription)
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert partners" ON partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert drivers" ON drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert onboarding_requests" ON onboarding_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all onboarding_requests" ON onboarding_requests FOR SELECT USING (true);
CREATE POLICY "Admins can update onboarding_requests" ON onboarding_requests FOR UPDATE USING (true);

-- =====================================================
-- TERMINÉ - Schéma prêt pour production
-- =====================================================
