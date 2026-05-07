-- =====================================================
-- ACTOOS ONE - SCHEMA PRODUCTION (VERSION SUPABASE)
-- =====================================================
-- Copiez ce fichier entier dans Supabase SQL Editor
-- =====================================================

-- Activer les extensions necessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SUPPRESSION DES TABLES EXISTANTES
-- =====================================================
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS onboarding_requests CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- 1. TABLE USERS
-- =====================================================
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
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(2, 1) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  commission_rate DECIMAL(4, 2) DEFAULT 15.00,
  preparation_time INTEGER DEFAULT 20,
  minimum_order INTEGER DEFAULT 0,
  delivery_fee INTEGER DEFAULT 500,
  opens_at TIME DEFAULT '08:00',
  closes_at TIME DEFAULT '22:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partners_category ON partners(category);
CREATE INDEX idx_partners_city ON partners(city);
CREATE INDEX idx_partners_active ON partners(is_active);

-- =====================================================
-- 3. TABLE MENU_ITEMS
-- =====================================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  image_url TEXT,
  category VARCHAR(100),
  is_available BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  preparation_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_partner ON menu_items(partner_id);
CREATE INDEX idx_menu_available ON menu_items(is_available);

-- =====================================================
-- 4. TABLE DRIVERS (livreurs)
-- =====================================================
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('moto', 'velo', 'voiture', 'tricycle')),
  license_plate VARCHAR(20),
  is_online BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  rating DECIMAL(2, 1) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drivers_online ON drivers(is_online);
CREATE INDEX idx_drivers_verified ON drivers(is_verified);

-- =====================================================
-- 5. TABLE ORDERS
-- =====================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE,
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered', 'cancelled'
  )),
  delivery_type VARCHAR(20) DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup')),
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER DEFAULT 0,
  service_fee INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'wallet', 'mobile_money')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  delivery_address TEXT,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_instructions TEXT,
  delivery_code VARCHAR(4),
  estimated_delivery_time TIMESTAMPTZ,
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
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- =====================================================
-- 6. TABLE ORDER_ITEMS
-- =====================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
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
  balance DECIMAL(12, 2) DEFAULT 0,
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
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_wallet ON wallet_transactions(wallet_id);

-- =====================================================
-- 9. TABLE ONBOARDING_REQUESTS
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
-- 10. FONCTION: Generer numero de commande
-- =====================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ACT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  NEW.delivery_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_number ON orders;
CREATE TRIGGER trigger_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- 11. FONCTION: Creer wallet automatiquement
-- =====================================================
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (owner_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_wallet ON users;
CREATE TRIGGER trigger_create_wallet
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_wallet();

-- =====================================================
-- 12. ACTIVER RLS (Row Level Security)
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

-- =====================================================
-- 13. POLICIES RLS - Lecture publique
-- =====================================================
CREATE POLICY "Public read partners" ON partners FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public read order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public read drivers" ON drivers FOR SELECT USING (true);
CREATE POLICY "Public read wallets" ON wallets FOR SELECT USING (true);
CREATE POLICY "Public read wallet_transactions" ON wallet_transactions FOR SELECT USING (true);

-- =====================================================
-- 14. POLICIES RLS - Insertion publique
-- =====================================================
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert partners" ON partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert drivers" ON drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert onboarding_requests" ON onboarding_requests FOR INSERT WITH CHECK (true);

-- =====================================================
-- 15. POLICIES RLS - Onboarding Admin
-- =====================================================
CREATE POLICY "Admins can view all onboarding_requests" ON onboarding_requests FOR SELECT USING (true);
CREATE POLICY "Admins can update onboarding_requests" ON onboarding_requests FOR UPDATE USING (true);

-- =====================================================
-- 16. POLICIES RLS - Update
-- =====================================================
CREATE POLICY "Anyone can update orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Anyone can update users" ON users FOR UPDATE USING (true);

-- =====================================================
-- 17. ACTIVER REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_requests;

-- =====================================================
-- SCHEMA TERMINE - Pret pour production
-- =====================================================
