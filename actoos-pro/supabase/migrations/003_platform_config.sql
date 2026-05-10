-- =====================================================
-- ACTOOS PRO - Platform Configuration Table
-- Stockage sécurisé des clés API de la plateforme
-- =====================================================

-- Create platform_config table
CREATE TABLE IF NOT EXISTS platform_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    
    -- Resend (Email)
    resend_api_key TEXT,
    resend_from_email TEXT DEFAULT 'noreply@actoos.com',
    resend_from_name TEXT DEFAULT 'ACTOOS PRO',
    email_enabled BOOLEAN DEFAULT true,
    
    -- Twilio (SMS)
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    twilio_phone_number TEXT,
    sms_enabled BOOLEAN DEFAULT false,
    
    -- WhatsApp Business
    whatsapp_access_token TEXT,
    whatsapp_phone_number_id TEXT,
    whatsapp_business_account_id TEXT,
    whatsapp_enabled BOOLEAN DEFAULT false,
    
    -- Stripe
    stripe_secret_key TEXT,
    stripe_webhook_secret TEXT,
    stripe_public_key TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one row exists
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row if not exists
INSERT INTO platform_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admin can read platform config
CREATE POLICY "platform_config_read_super_admin" ON platform_config
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND role = 'super_admin'
        )
    );

-- Policy: Only super_admin can update platform config
CREATE POLICY "platform_config_update_super_admin" ON platform_config
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND role = 'super_admin'
        )
    );

-- Policy: Only super_admin can insert (for initial setup)
CREATE POLICY "platform_config_insert_super_admin" ON platform_config
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND role = 'super_admin'
        )
    );

-- Grant service role full access (for Edge Functions)
-- Service role automatically bypasses RLS

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_platform_config_id ON platform_config(id);

-- Comment
COMMENT ON TABLE platform_config IS 'Configuration centralisée des clés API de la plateforme ACTOOS PRO';
