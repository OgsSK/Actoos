-- =====================================================
-- ACTOOS ONE - SEED LIVREURS DE TEST
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- Crée 5 livreurs avec leurs comptes utilisateur et wallets
-- =====================================================

-- 1. CRÉER LES UTILISATEURS LIVREURS
INSERT INTO users (id, phone, name, email, role, is_verified, created_at) VALUES
  ('d1111111-1111-1111-1111-111111111111', '+223 70 11 22 33', 'Amadou Diallo', 'amadou.driver@actoos.com', 'driver', true, NOW()),
  ('d2222222-2222-2222-2222-222222222222', '+223 70 22 33 44', 'Moussa Keita', 'moussa.driver@actoos.com', 'driver', true, NOW()),
  ('d3333333-3333-3333-3333-333333333333', '+223 70 33 44 55', 'Ibrahim Traore', 'ibrahim.driver@actoos.com', 'driver', true, NOW()),
  ('d4444444-4444-4444-4444-444444444444', '+223 70 44 55 66', 'Oumar Coulibaly', 'oumar.driver@actoos.com', 'driver', true, NOW()),
  ('d5555555-5555-5555-5555-555555555555', '+223 70 55 66 77', 'Seydou Sanogo', 'seydou.driver@actoos.com', 'driver', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone;

-- 2. CRÉER LES PROFILS LIVREURS
INSERT INTO drivers (id, user_id, vehicle_type, license_plate, is_online, is_verified, rating, total_deliveries, created_at) VALUES
  ('drv11111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'moto', 'BK-1234-ML', true, true, 4.8, 45, NOW()),
  ('drv22222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'moto', 'BK-5678-ML', true, true, 4.9, 120, NOW()),
  ('drv33333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'voiture', 'BK-9012-ML', false, true, 4.6, 30, NOW()),
  ('drv44444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'moto', 'BK-3456-ML', true, true, 4.7, 85, NOW()),
  ('drv55555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', 'tricycle', 'BK-7890-ML', false, false, 5.0, 0, NOW())
ON CONFLICT (id) DO UPDATE SET
  is_online = EXCLUDED.is_online,
  is_verified = EXCLUDED.is_verified,
  total_deliveries = EXCLUDED.total_deliveries;

-- 3. CRÉER LES WALLETS POUR CHAQUE LIVREUR
INSERT INTO wallets (id, owner_id, balance, is_frozen, created_at) VALUES
  ('wal11111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 15000, false, NOW()),
  ('wal22222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 45000, false, NOW()),
  ('wal33333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 8500, false, NOW()),
  ('wal44444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 32000, false, NOW()),
  ('wal55555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', 0, false, NOW())
ON CONFLICT (id) DO UPDATE SET
  balance = EXCLUDED.balance;

-- 4. AJOUTER QUELQUES TRANSACTIONS WALLET (historique)
INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, created_at) VALUES
  -- Amadou Diallo - quelques livraisons
  ('wal11111-1111-1111-1111-111111111111', 'commission', 700, 15000, 'Livraison commande #A001', NOW() - INTERVAL '2 hours'),
  ('wal11111-1111-1111-1111-111111111111', 'commission', 850, 14300, 'Livraison commande #A002', NOW() - INTERVAL '5 hours'),
  
  -- Moussa Keita - livreur expérimenté
  ('wal22222-2222-2222-2222-222222222222', 'commission', 600, 45000, 'Livraison commande #M001', NOW() - INTERVAL '1 hour'),
  ('wal22222-2222-2222-2222-222222222222', 'commission', 750, 44400, 'Livraison commande #M002', NOW() - INTERVAL '3 hours'),
  ('wal22222-2222-2222-2222-222222222222', 'withdrawal', -20000, 43650, 'Retrait mobile money', NOW() - INTERVAL '1 day'),
  
  -- Oumar Coulibaly
  ('wal44444-4444-4444-4444-444444444444', 'commission', 500, 32000, 'Livraison commande #O001', NOW() - INTERVAL '30 minutes'),
  ('wal44444-4444-4444-4444-444444444444', 'commission', 900, 31500, 'Livraison commande #O002', NOW() - INTERVAL '4 hours');

-- 5. SIMULER UNE MISSION EN COURS POUR MOUSSA KEITA
-- (Si vous avez une commande existante, mettez à jour son driver_id)
-- UPDATE orders 
-- SET driver_id = 'drv22222-2222-2222-2222-222222222222', status = 'delivering'
-- WHERE status = 'ready' AND driver_id IS NULL
-- LIMIT 1;

-- =====================================================
-- RÉSUMÉ DES LIVREURS CRÉÉS
-- =====================================================
-- | Nom              | Véhicule  | Statut     | Livraisons | Solde     |
-- |------------------|-----------|------------|------------|-----------|
-- | Amadou Diallo    | Moto      | En ligne   | 45         | 15,000 F  |
-- | Moussa Keita     | Moto      | En ligne   | 120        | 45,000 F  |
-- | Ibrahim Traore   | Voiture   | Hors ligne | 30         | 8,500 F   |
-- | Oumar Coulibaly  | Moto      | En ligne   | 85         | 32,000 F  |
-- | Seydou Sanogo    | Tricycle  | Hors ligne | 0          | 0 F       |
-- =====================================================

SELECT 
  d.id,
  u.name,
  d.vehicle_type,
  d.is_online,
  d.is_verified,
  d.total_deliveries,
  w.balance as wallet_balance
FROM drivers d
JOIN users u ON d.user_id = u.id
LEFT JOIN wallets w ON w.owner_id = u.id
ORDER BY d.total_deliveries DESC;
