-- =============================================
-- ACTOOS ONE - P2P & Corporate Wallets
-- Version: 003
-- Description: Transferts P2P et wallets entreprise
-- =============================================

-- =============================================
-- 1. EXTENSION DU SCHEMA WALLETS
-- =============================================

-- Ajout des colonnes pour P2P et Corporate
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS parent_wallet_id UUID REFERENCES wallets(id);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS daily_spend_limit INTEGER DEFAULT NULL;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'personal';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Contrainte sur wallet_type
ALTER TABLE wallets ADD CONSTRAINT wallet_type_check 
  CHECK (wallet_type IN ('personal', 'corporate', 'employee'));

-- Index pour les requêtes corporate
CREATE INDEX IF NOT EXISTS idx_wallets_parent ON wallets(parent_wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);

-- =============================================
-- 2. TABLE DES CONTACTS P2P (Favoris)
-- =============================================

CREATE TABLE IF NOT EXISTS p2p_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  contact_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  contact_name TEXT, -- Nom personnalisé par l'utilisateur
  is_favorite BOOLEAN DEFAULT false,
  transfer_count INTEGER DEFAULT 0,
  last_transfer_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(owner_wallet_id, contact_wallet_id)
);

CREATE INDEX IF NOT EXISTS idx_p2p_contacts_owner ON p2p_contacts(owner_wallet_id);

-- =============================================
-- 3. NOUVEAUX TYPES DE TRANSACTIONS
-- =============================================

-- Mise à jour de la contrainte transaction_type pour inclure P2P
ALTER TABLE ledger_transactions DROP CONSTRAINT IF EXISTS ledger_transactions_transaction_type_check;
ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_transaction_type_check 
  CHECK (transaction_type IN (
    'topup',           -- Recharge
    'payment',         -- Paiement commande
    'refund',          -- Remboursement
    'earning',         -- Gain (livreur/partenaire)
    'withdrawal',      -- Retrait
    'transfer_out',    -- Envoi P2P
    'transfer_in',     -- Réception P2P
    'corporate_topup', -- Recharge par entreprise
    'adjustment'       -- Ajustement admin
  ));

-- Ajout colonne pour lier les transferts P2P
ALTER TABLE ledger_transactions ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES ledger_transactions(id);
ALTER TABLE ledger_transactions ADD COLUMN IF NOT EXISTS counterpart_wallet_id UUID REFERENCES wallets(id);

-- =============================================
-- 4. TABLE LIMITES CORPORATE
-- =============================================

CREATE TABLE IF NOT EXISTS corporate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  employee_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  daily_limit INTEGER NOT NULL DEFAULT 10000,
  weekly_limit INTEGER,
  monthly_limit INTEGER,
  allowed_categories TEXT[], -- ['eats', 'health'] ou NULL = tout
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(corporate_wallet_id, employee_wallet_id)
);

-- =============================================
-- 5. VUE: DÉPENSES JOURNALIÈRES EMPLOYÉ
-- =============================================

CREATE OR REPLACE VIEW employee_daily_spending AS
SELECT 
  w.id as wallet_id,
  w.parent_wallet_id,
  w.daily_spend_limit,
  COALESCE(SUM(
    CASE 
      WHEN lt.transaction_type = 'payment' 
        AND lt.created_at >= CURRENT_DATE 
        AND lt.created_at < CURRENT_DATE + INTERVAL '1 day'
      THEN ABS(lt.amount)
      ELSE 0
    END
  ), 0) as today_spent,
  w.daily_spend_limit - COALESCE(SUM(
    CASE 
      WHEN lt.transaction_type = 'payment' 
        AND lt.created_at >= CURRENT_DATE 
        AND lt.created_at < CURRENT_DATE + INTERVAL '1 day'
      THEN ABS(lt.amount)
      ELSE 0
    END
  ), 0) as remaining_today
FROM wallets w
LEFT JOIN ledger_transactions lt ON lt.wallet_id = w.id
WHERE w.wallet_type = 'employee'
GROUP BY w.id, w.parent_wallet_id, w.daily_spend_limit;

-- =============================================
-- 6. FONCTION: TRANSFERT P2P SÉCURISÉ
-- =============================================

CREATE OR REPLACE FUNCTION execute_p2p_transfer(
  p_sender_wallet_id UUID,
  p_receiver_phone TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Transfert P2P'
) RETURNS JSONB AS $$
DECLARE
  v_sender_balance INTEGER;
  v_receiver_wallet_id UUID;
  v_receiver_name TEXT;
  v_sender_txn_id UUID;
  v_receiver_txn_id UUID;
  v_new_sender_balance INTEGER;
  v_new_receiver_balance INTEGER;
BEGIN
  -- Vérifier montant positif
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Montant invalide');
  END IF;

  -- Trouver le wallet destinataire par téléphone
  SELECT w.id, u.full_name INTO v_receiver_wallet_id, v_receiver_name
  FROM wallets w
  JOIN users u ON u.id = w.user_id
  WHERE u.phone = p_receiver_phone
  LIMIT 1;

  IF v_receiver_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destinataire non trouvé');
  END IF;

  -- Empêcher auto-transfert
  IF v_receiver_wallet_id = p_sender_wallet_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Impossible de vous envoyer de l''argent');
  END IF;

  -- Verrouiller les deux wallets (ordre déterministe pour éviter deadlock)
  IF p_sender_wallet_id < v_receiver_wallet_id THEN
    SELECT balance INTO v_sender_balance FROM wallets WHERE id = p_sender_wallet_id FOR UPDATE;
    PERFORM 1 FROM wallets WHERE id = v_receiver_wallet_id FOR UPDATE;
  ELSE
    PERFORM 1 FROM wallets WHERE id = v_receiver_wallet_id FOR UPDATE;
    SELECT balance INTO v_sender_balance FROM wallets WHERE id = p_sender_wallet_id FOR UPDATE;
  END IF;

  -- Vérifier solde suffisant
  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solde insuffisant');
  END IF;

  -- Calculer nouveaux soldes
  v_new_sender_balance := v_sender_balance - p_amount;
  v_new_receiver_balance := (SELECT balance FROM wallets WHERE id = v_receiver_wallet_id) + p_amount;

  -- Débiter l'expéditeur
  UPDATE wallets SET balance = v_new_sender_balance, updated_at = NOW() 
  WHERE id = p_sender_wallet_id;

  -- Créditer le destinataire
  UPDATE wallets SET balance = v_new_receiver_balance, updated_at = NOW() 
  WHERE id = v_receiver_wallet_id;

  -- Créer transaction sortante
  INSERT INTO ledger_transactions (
    wallet_id, transaction_type, amount, balance_before, balance_after,
    description, counterpart_wallet_id, status
  ) VALUES (
    p_sender_wallet_id, 'transfer_out', -p_amount, v_sender_balance, v_new_sender_balance,
    p_description, v_receiver_wallet_id, 'completed'
  ) RETURNING id INTO v_sender_txn_id;

  -- Créer transaction entrante
  INSERT INTO ledger_transactions (
    wallet_id, transaction_type, amount, balance_before, balance_after,
    description, counterpart_wallet_id, linked_transaction_id, status
  ) VALUES (
    v_receiver_wallet_id, 'transfer_in', p_amount, v_new_receiver_balance - p_amount, v_new_receiver_balance,
    'Reçu de ' || (SELECT full_name FROM users WHERE id = (SELECT user_id FROM wallets WHERE id = p_sender_wallet_id)),
    p_sender_wallet_id, v_sender_txn_id, 'completed'
  ) RETURNING id INTO v_receiver_txn_id;

  -- Lier les transactions
  UPDATE ledger_transactions SET linked_transaction_id = v_receiver_txn_id WHERE id = v_sender_txn_id;

  -- Mettre à jour les contacts P2P
  INSERT INTO p2p_contacts (owner_wallet_id, contact_wallet_id, contact_name, transfer_count, last_transfer_at)
  VALUES (p_sender_wallet_id, v_receiver_wallet_id, v_receiver_name, 1, NOW())
  ON CONFLICT (owner_wallet_id, contact_wallet_id) 
  DO UPDATE SET transfer_count = p2p_contacts.transfer_count + 1, last_transfer_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_sender_txn_id,
    'receiver_name', v_receiver_name,
    'amount', p_amount,
    'new_balance', v_new_sender_balance
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. FONCTION: VÉRIFIER LIMITE CORPORATE
-- =============================================

CREATE OR REPLACE FUNCTION check_corporate_limit(
  p_wallet_id UUID,
  p_amount INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_wallet_type TEXT;
  v_daily_limit INTEGER;
  v_today_spent INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Récupérer infos wallet
  SELECT wallet_type, daily_spend_limit INTO v_wallet_type, v_daily_limit
  FROM wallets WHERE id = p_wallet_id;

  -- Si pas un wallet employé ou pas de limite, OK
  IF v_wallet_type != 'employee' OR v_daily_limit IS NULL THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Calculer dépenses du jour
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_today_spent
  FROM ledger_transactions
  WHERE wallet_id = p_wallet_id
    AND transaction_type = 'payment'
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  v_remaining := v_daily_limit - v_today_spent;

  -- Vérifier si le montant dépasse
  IF v_today_spent + p_amount > v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'daily_limit', v_daily_limit,
      'today_spent', v_today_spent,
      'remaining', v_remaining,
      'requested', p_amount,
      'error', 'Limite journalière atteinte'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_limit', v_daily_limit,
    'today_spent', v_today_spent,
    'remaining', v_remaining
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. RLS POLICIES
-- =============================================

-- P2P Contacts: utilisateur ne voit que ses contacts
ALTER TABLE p2p_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY p2p_contacts_owner_policy ON p2p_contacts
  FOR ALL USING (
    owner_wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
  );

-- Corporate Limits: visible par corporate et employee
ALTER TABLE corporate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY corporate_limits_policy ON corporate_limits
  FOR ALL USING (
    corporate_wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
    OR employee_wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
  );

-- =============================================
-- 9. DONNÉES DE TEST (MOCK)
-- =============================================

-- Exemple: Créer un wallet corporate et un wallet employé
-- (À exécuter manuellement pour tester)
/*
-- Wallet corporate
INSERT INTO wallets (user_id, balance, wallet_type, company_name, daily_spend_limit)
VALUES ('corporate-user-id', 500000, 'corporate', 'ACTOOS Corp', NULL);

-- Wallet employé lié
INSERT INTO wallets (user_id, balance, wallet_type, parent_wallet_id, daily_spend_limit)
VALUES ('employee-user-id', 0, 'employee', 'corporate-wallet-id', 15000);
*/
