-- Admin Dashboard SQL Setup
-- Run this in Supabase SQL Editor

-- Add verification_status to companies if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' 
                   AND column_name = 'verification_status') THEN
        ALTER TABLE companies 
        ADD COLUMN verification_status TEXT DEFAULT 'pending' 
        CHECK (verification_status IN ('pending', 'verified', 'suspended', 'rejected'));
    END IF;
END $$;

-- Add status to jobs if not exists (ensure suspended status is allowed)
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
    
    -- Add new constraint with all statuses
    ALTER TABLE jobs 
    ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('draft', 'pending', 'active', 'paused', 'closed', 'expired', 'suspended', 'rejected'));
END $$;

-- Update existing companies without verification_status
UPDATE companies 
SET verification_status = 'verified' 
WHERE verification_status IS NULL;

-- Create admin role function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Admins can view all jobs
DROP POLICY IF EXISTS "Admins can view all jobs" ON jobs;
CREATE POLICY "Admins can view all jobs" ON jobs
    FOR SELECT
    USING (is_admin(auth.uid()) OR status = 'active' OR posted_by = auth.uid());

-- RLS Policy: Admins can update all jobs
DROP POLICY IF EXISTS "Admins can update all jobs" ON jobs;
CREATE POLICY "Admins can update all jobs" ON jobs
    FOR UPDATE
    USING (is_admin(auth.uid()) OR posted_by = auth.uid());

-- RLS Policy: Admins can delete all jobs
DROP POLICY IF EXISTS "Admins can delete all jobs" ON jobs;
CREATE POLICY "Admins can delete all jobs" ON jobs
    FOR DELETE
    USING (is_admin(auth.uid()) OR posted_by = auth.uid());

-- RLS Policy: Admins can view all companies
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
CREATE POLICY "Admins can view all companies" ON companies
    FOR SELECT
    USING (is_admin(auth.uid()) OR verification_status = 'verified' OR id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));

-- RLS Policy: Admins can update all companies
DROP POLICY IF EXISTS "Admins can update all companies" ON companies;
CREATE POLICY "Admins can update all companies" ON companies
    FOR UPDATE
    USING (is_admin(auth.uid()) OR id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Create an admin user (replace with actual admin email)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@actoos.com';

COMMENT ON COLUMN companies.verification_status IS 'Status: pending, verified, suspended, rejected';
COMMENT ON COLUMN jobs.status IS 'Status: draft, pending, active, paused, closed, expired, suspended, rejected';
