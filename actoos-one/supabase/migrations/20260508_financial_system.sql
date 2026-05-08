-- ============================================================
-- ACTOOS ONE - Financial System Tables
-- ============================================================
-- Execute this SQL in Supabase SQL Editor to create all
-- necessary tables for the wallet and financial system.
-- ============================================================

-- 1. SYSTEM CONFIG TABLE
-- Stores dynamic configuration values that can be changed without code deploy
CREATE TABLE IF NOT EXISTS system_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO system_config (key, value, description) VALUES
    -- Commission rates (%)
    ('commission_base_eats', '15.00', 'Commission Actoos pour livraison Eats'),
    ('commission_self_eats', '10.00', 'Commission Actoos pour self-delivery Eats'),
    ('commission_pickup_eats', '10.00', 'Commission Actoos pour pickup Eats'),
    ('commission_base_health', '5.00', 'Commission Actoos pour livraison Health'),
    ('commission_self_health', '2.00', 'Commission Actoos pour self-delivery Health'),
    
    -- Delivery fees
    ('delivery_base_fee', '700', 'Frais de base livraison (0-2km) en FCFA'),
    ('delivery_per_km', '200', 'Frais par km supplémentaire en FCFA'),
    ('delivery_base_distance', '2', 'Distance de base incluse en km'),
    ('self_delivery_cap_per_km', '250', 'Plafond frais self-delivery par km'),
    ('sos_premium', '500', 'Prime urgence SOS en FCFA'),
    
    -- Wallet limits
    ('min_withdrawal', '500', 'Montant minimum de retrait en FCFA'),
    ('min_driver_caution', '5000', 'Caution minimum livreur en FCFA'),
    ('max_daily_withdrawal', '500000', 'Retrait max par jour en FCFA'),
    
    -- Telecom fees (%)
    ('fee_orange_money', '1.0', 'Frais opérateur Orange Money'),
    ('fee_wave', '0.5', 'Frais opérateur Wave'),
    ('fee_moov_money', '1.0', 'Frais opérateur Moov Money'),
    ('fee_bank_transfer', '1000', 'Frais fixe virement bancaire en FCFA')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();


-- 2. WALLETS TABLE
-- Main wallet table for all user types
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_type VARCHAR(50) NOT NULL CHECK (wallet_type IN ('client', 'partner_earnings', 'driver_caution', 'actoos_revenue')),
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one wallet per type per user
    UNIQUE (owner_id, wallet_type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner_id);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);


-- 3. WALLET TRANSACTIONS TABLE
-- Complete history of all wallet movements
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'topup', 'payment', 'refund',           -- Client
        'earning', 'withdrawal',                 -- Partner/Driver
        'commission', 'caution_topup', 'caution_debit', -- Driver
        'settlement', 'transfer'                 -- System
    )),
    amount DECIMAL(15, 2) NOT NULL,  -- Positive for credit, negative for debit
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_id UUID,  -- Link to order_id or withdrawal_id
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for reporting and lookups
CREATE INDEX IF NOT EXISTS idx_txn_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_txn_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_txn_created ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_txn_reference ON wallet_transactions(reference_id);


-- 4. WITHDRAWAL REQUESTS TABLE
-- Track all withdrawal requests and their status
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(15, 2) DEFAULT 0.00,
    net_amount DECIMAL(15, 2) NOT NULL,  -- Amount after fees
    method VARCHAR(50) NOT NULL CHECK (method IN ('orange_money', 'wave', 'moov_money', 'bank_transfer')),
    destination VARCHAR(100) NOT NULL,  -- Phone number or bank account
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    rejection_reason TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_created ON withdrawal_requests(created_at);


-- 5. UPDATE ORDERS TABLE (Add settlement fields)
-- Add columns for tracking financial settlement
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS settlement_details JSONB DEFAULT '{}';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km DECIMAL(5, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner_delivery_type VARCHAR(20) DEFAULT 'actoos';


-- 6. RLS POLICIES
-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Wallets: Users can only see their own wallets
CREATE POLICY "Users can view own wallets" ON wallets
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own wallets" ON wallets
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Admin can view all wallets (requires admin role check)
CREATE POLICY "Admins can view all wallets" ON wallets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Transactions: Users can only see transactions for their wallets
CREATE POLICY "Users can view own transactions" ON wallet_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM wallets WHERE id = wallet_id AND owner_id = auth.uid())
    );

-- Withdrawals: Users can see their own, admins can see all
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawals" ON withdrawal_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals" ON withdrawal_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update withdrawals" ON withdrawal_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- System config: Everyone can read, only admins can write
CREATE POLICY "Anyone can read config" ON system_config
    FOR SELECT USING (true);


-- 7. HELPER FUNCTIONS

-- Function to increment driver deliveries
CREATE OR REPLACE FUNCTION increment_driver_deliveries(driver_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE drivers 
    SET total_deliveries = COALESCE(total_deliveries, 0) + 1,
        updated_at = NOW()
    WHERE id = driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to create wallet if not exists
CREATE OR REPLACE FUNCTION get_or_create_wallet(
    p_owner_id UUID,
    p_wallet_type VARCHAR(50)
) RETURNS wallets AS $$
DECLARE
    v_wallet wallets;
BEGIN
    -- Try to get existing wallet
    SELECT * INTO v_wallet
    FROM wallets
    WHERE owner_id = p_owner_id AND wallet_type = p_wallet_type;
    
    -- Create if not exists
    IF NOT FOUND THEN
        INSERT INTO wallets (owner_id, wallet_type, balance)
        VALUES (p_owner_id, p_wallet_type, 0)
        RETURNING * INTO v_wallet;
    END IF;
    
    RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to safely update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(
    p_wallet_id UUID,
    p_amount DECIMAL(15, 2),
    p_type VARCHAR(50),
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS wallet_transactions AS $$
DECLARE
    v_wallet wallets;
    v_new_balance DECIMAL(15, 2);
    v_transaction wallet_transactions;
BEGIN
    -- Lock the wallet row for update
    SELECT * INTO v_wallet
    FROM wallets
    WHERE id = p_wallet_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;
    
    IF v_wallet.is_frozen THEN
        RAISE EXCEPTION 'Wallet is frozen';
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_wallet.balance + p_amount;
    
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Update wallet
    UPDATE wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_wallet_id;
    
    -- Create transaction record
    INSERT INTO wallet_transactions (
        wallet_id, type, amount, balance_after, 
        reference_id, description, metadata
    ) VALUES (
        p_wallet_id, p_type, p_amount, v_new_balance,
        p_reference_id, p_description, p_metadata
    )
    RETURNING * INTO v_transaction;
    
    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. TRIGGERS

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- VERIFICATION QUERIES
-- Run these to verify the tables were created correctly
-- ============================================================

-- SELECT * FROM system_config;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('wallets', 'wallet_transactions', 'withdrawal_requests', 'system_config');
-- \d wallets
-- \d wallet_transactions
-- \d withdrawal_requests
