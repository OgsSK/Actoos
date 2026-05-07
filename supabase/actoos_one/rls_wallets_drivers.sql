-- =====================================================
-- ACTOOS ONE - RLS POLICIES POUR WALLETS & DRIVERS
-- =====================================================
-- Exécutez ce script pour autoriser l'accès aux wallets
-- =====================================================

-- 1. POLICIES WALLETS
DROP POLICY IF EXISTS "Allow public read wallets" ON wallets;
CREATE POLICY "Allow public read wallets" ON wallets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update wallets" ON wallets;
CREATE POLICY "Allow public update wallets" ON wallets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public insert wallets" ON wallets;
CREATE POLICY "Allow public insert wallets" ON wallets FOR INSERT WITH CHECK (true);

-- 2. POLICIES WALLET_TRANSACTIONS
DROP POLICY IF EXISTS "Allow public read wallet_transactions" ON wallet_transactions;
CREATE POLICY "Allow public read wallet_transactions" ON wallet_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert wallet_transactions" ON wallet_transactions;
CREATE POLICY "Allow public insert wallet_transactions" ON wallet_transactions FOR INSERT WITH CHECK (true);

-- 3. POLICIES DRIVERS
DROP POLICY IF EXISTS "Allow public read drivers" ON drivers;
CREATE POLICY "Allow public read drivers" ON drivers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update drivers" ON drivers;
CREATE POLICY "Allow public update drivers" ON drivers FOR UPDATE USING (true);

-- 4. Vérifier les policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('wallets', 'wallet_transactions', 'drivers')
ORDER BY tablename, policyname;
