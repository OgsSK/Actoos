-- ACTOOS ONE - Migration: Système de remboursement + Données de test
-- Exécuter dans Supabase SQL Editor

-- =============================================================================
-- 1. TABLE REFUND_REQUESTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  refund_percentage INTEGER DEFAULT 100,
  requested_by UUID REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON refund_requests(order_id);

-- Ajouter colonnes de remboursement à la table orders si pas présentes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT NULL;

-- =============================================================================
-- 2. DONNÉES DE TEST - UTILISATEURS
-- =============================================================================

-- Note: Les utilisateurs doivent être créés via Supabase Auth
-- Voici les emails à créer manuellement dans le dashboard Supabase Auth:

/*
CLIENTS À CRÉER:
1. client1@test.actoos.com / Test123! (Client Test 1)
2. client2@test.actoos.com / Test123! (Client Test 2)
3. client3@test.actoos.com / Test123! (Client Test 3)
4. clientvip@test.actoos.com / Test123! (Client VIP)

PARTENAIRES À CRÉER:
1. restaurant1@test.actoos.com / Test123! (Le Maquis d'Abidjan)
2. restaurant2@test.actoos.com / Test123! (Chez Mama Africa)
3. restaurant3@test.actoos.com / Test123! (Fast Food Bamako)

LIVREURS À CRÉER:
1. driver1@test.actoos.com / Test123! (Moussa Livreur)
2. driver2@test.actoos.com / Test123! (Amadou Express)
3. driver3@test.actoos.com / Test123! (Ibrahim Moto)

ADMIN:
- contact@actoos.com / Salifkane&&7 (déjà existant)
*/

-- =============================================================================
-- 3. DEMANDES PARTENAIRES (À APPROUVER/REJETER)
-- =============================================================================

-- Ces entrées seront créées via le formulaire "Devenir Partenaire"
-- L'admin pourra les voir dans son dashboard et les approuver/rejeter

-- =============================================================================
-- 4. DEMANDES LIVREURS (À APPROUVER/REJETER)
-- =============================================================================

-- Ces entrées seront créées via le formulaire "Devenir Livreur"
-- L'admin pourra les voir dans son dashboard et les approuver/rejeter

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================

-- Activer RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres remboursements
CREATE POLICY "Users can view own refunds" ON refund_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can manage all refunds" ON refund_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Insertion autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can request refunds" ON refund_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 6. FONCTION: CALCULER REMBOURSEMENT AUTO
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_refund_amount(order_status VARCHAR, order_total DECIMAL)
RETURNS TABLE (
  refund_amount DECIMAL,
  refund_percentage INTEGER,
  reason TEXT
) AS $$
BEGIN
  CASE order_status
    WHEN 'pending', 'confirmed' THEN
      RETURN QUERY SELECT order_total, 100, 'Remboursement total - commande non préparée'::TEXT;
    WHEN 'preparing' THEN
      RETURN QUERY SELECT ROUND(order_total * 0.7, 2), 70, 'Remboursement partiel - commande en préparation'::TEXT;
    WHEN 'ready' THEN
      RETURN QUERY SELECT 0::DECIMAL, 0, 'Pas de remboursement - commande prête'::TEXT;
    ELSE
      RETURN QUERY SELECT 0::DECIMAL, 0, 'Statut non éligible'::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. TRIGGER: CRÉER REMBOURSEMENT AUTO SUR ANNULATION
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_auto_refund_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
  refund_calc RECORD;
BEGIN
  -- Seulement si le statut passe à 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Calculer le remboursement
    SELECT * INTO refund_calc 
    FROM calculate_refund_amount(OLD.status, NEW.total_amount);
    
    -- Mettre à jour la commande avec le montant de remboursement
    NEW.refund_amount := refund_calc.refund_amount;
    NEW.refund_status := CASE 
      WHEN refund_calc.refund_amount > 0 THEN 'pending'
      ELSE 'not_eligible'
    END;
    
    -- Créer la demande de remboursement si montant > 0
    IF refund_calc.refund_amount > 0 AND NEW.payment_method = 'wallet' THEN
      INSERT INTO refund_requests (order_id, user_id, amount, reason, refund_percentage)
      VALUES (NEW.id, NEW.user_id, refund_calc.refund_amount, refund_calc.reason, refund_calc.refund_percentage);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS auto_refund_on_cancel ON orders;
CREATE TRIGGER auto_refund_on_cancel
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_refund_on_cancel();

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('refund_requests', 'orders', 'users', 'wallets');
