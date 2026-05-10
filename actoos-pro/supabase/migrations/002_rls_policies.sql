-- =====================================================
-- ACTOOS PRO - Row Level Security Policies
-- Sécurisation multi-tenant pour accès direct PostgREST
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE
-- Users can only see users from their own entreprise
-- =====================================================

-- Policy: Users can read users from their entreprise
CREATE POLICY "users_read_own_entreprise" ON users
    FOR SELECT
    USING (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (id = auth.uid()::uuid)
    WITH CHECK (id = auth.uid()::uuid);

-- Policy: Admins can insert new users in their entreprise
CREATE POLICY "users_insert_admin" ON users
    FOR INSERT
    WITH CHECK (
        entreprise_id IN (
            SELECT entreprise_id FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Admins can update users in their entreprise
CREATE POLICY "users_admin_update" ON users
    FOR UPDATE
    USING (
        entreprise_id IN (
            SELECT entreprise_id FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Admins can delete users in their entreprise (except themselves)
CREATE POLICY "users_admin_delete" ON users
    FOR DELETE
    USING (
        id != auth.uid()::uuid
        AND entreprise_id IN (
            SELECT entreprise_id FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- ENTREPRISES TABLE
-- Users can only see and modify their own entreprise
-- =====================================================

-- Policy: Users can read their entreprise
CREATE POLICY "entreprises_read_own" ON entreprises
    FOR SELECT
    USING (
        id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Admins can update their entreprise
CREATE POLICY "entreprises_update_admin" ON entreprises
    FOR UPDATE
    USING (
        id IN (
            SELECT entreprise_id FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        id IN (
            SELECT entreprise_id FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- DEVIS TABLE
-- Users can only access devis from their entreprise
-- =====================================================

-- Policy: Users can read devis from their entreprise
CREATE POLICY "devis_read_own_entreprise" ON devis
    FOR SELECT
    USING (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Users can insert devis for their entreprise
CREATE POLICY "devis_insert_own_entreprise" ON devis
    FOR INSERT
    WITH CHECK (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Users can update devis from their entreprise
CREATE POLICY "devis_update_own_entreprise" ON devis
    FOR UPDATE
    USING (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    )
    WITH CHECK (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Admins can delete devis from their entreprise (only drafts)
CREATE POLICY "devis_delete_admin" ON devis
    FOR DELETE
    USING (
        statut IN ('brouillon', 'envoye')
        AND entreprise_id IN (
            SELECT entreprise_id FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Public access for devis with public_token (for client portal)
CREATE POLICY "devis_public_token" ON devis
    FOR SELECT
    USING (
        public_token IS NOT NULL 
        AND public_token != ''
    );

-- Policy: Public update for signing devis via portal
CREATE POLICY "devis_public_sign" ON devis
    FOR UPDATE
    USING (
        public_token IS NOT NULL 
        AND public_token != ''
        AND statut = 'envoye'
    )
    WITH CHECK (
        statut = 'signe'
    );

-- =====================================================
-- FACTURES TABLE
-- Users can only access factures from their entreprise
-- =====================================================

-- Policy: Users can read factures from their entreprise
CREATE POLICY "factures_read_own_entreprise" ON factures
    FOR SELECT
    USING (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Users can insert factures for their entreprise
CREATE POLICY "factures_insert_own_entreprise" ON factures
    FOR INSERT
    WITH CHECK (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Users can update factures from their entreprise
CREATE POLICY "factures_update_own_entreprise" ON factures
    FOR UPDATE
    USING (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    )
    WITH CHECK (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Admins can delete factures (only drafts)
CREATE POLICY "factures_delete_admin" ON factures
    FOR DELETE
    USING (
        statut = 'brouillon'
        AND entreprise_id IN (
            SELECT entreprise_id FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- CHAT_MESSAGES TABLE
-- Users can only access messages from their entreprise
-- =====================================================

-- Policy: Users can read messages from their entreprise
CREATE POLICY "chat_read_own_entreprise" ON chat_messages
    FOR SELECT
    USING (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
    );

-- Policy: Users can insert messages for their entreprise
CREATE POLICY "chat_insert_own_entreprise" ON chat_messages
    FOR INSERT
    WITH CHECK (
        entreprise_id IN (
            SELECT entreprise_id FROM users WHERE id = auth.uid()::uuid
        )
        AND sender_id = auth.uid()::uuid
    );

-- Policy: Users can update their own messages
CREATE POLICY "chat_update_own" ON chat_messages
    FOR UPDATE
    USING (sender_id = auth.uid()::uuid)
    WITH CHECK (sender_id = auth.uid()::uuid);

-- Policy: Users can delete their own messages
CREATE POLICY "chat_delete_own" ON chat_messages
    FOR DELETE
    USING (sender_id = auth.uid()::uuid);

-- =====================================================
-- SERVICE ROLE BYPASS
-- Service role can bypass all RLS for Edge Functions
-- =====================================================
-- Note: Service role key automatically bypasses RLS
-- This is used by Edge Functions for admin operations

-- =====================================================
-- INDEXES for RLS Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_entreprise_id ON users(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_devis_entreprise_id ON devis(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_devis_public_token ON devis(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_factures_entreprise_id ON factures(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_entreprise_id ON chat_messages(entreprise_id);
