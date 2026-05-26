-- ============================================
-- ACTOOS JOBS - FIX RLS POLICIES
-- Exécutez ce script dans Supabase SQL Editor
-- ============================================

-- Allow insert for authenticated users on users table
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Allow insert for service role and authenticated
DROP POLICY IF EXISTS "Service role can insert users" ON users;
CREATE POLICY "Service role can insert users" ON users 
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

-- Allow anon to insert (for signup flow)
DROP POLICY IF EXISTS "Allow signup insert" ON users;
CREATE POLICY "Allow signup insert" ON users 
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

-- Same for candidate_profiles
DROP POLICY IF EXISTS "Allow candidate profile insert" ON candidate_profiles;
CREATE POLICY "Allow candidate profile insert" ON candidate_profiles 
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

-- ============================================
-- Go to Authentication > Email Templates
-- And disable "Confirm email" in settings
-- OR enable auto-confirm in Auth settings
-- ============================================
