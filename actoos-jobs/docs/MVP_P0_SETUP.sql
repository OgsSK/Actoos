-- ============================================
-- ACTOOS JOBS - Additional SQL for MVP P0
-- Execute this in Supabase SQL Editor
-- Version 2: With DROP IF EXISTS to avoid conflicts
-- ============================================

-- Saved Jobs Table (for favorites)
CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- Enable RLS
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_jobs (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own saved jobs" ON saved_jobs;
DROP POLICY IF EXISTS "Users can save jobs" ON saved_jobs;
DROP POLICY IF EXISTS "Users can unsave jobs" ON saved_jobs;

CREATE POLICY "Users can view their own saved jobs"
    ON saved_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
    ON saved_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
    ON saved_jobs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RPC Functions for atomic counter increments
-- ============================================

-- Increment job views
CREATE OR REPLACE FUNCTION increment_job_views(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    UPDATE jobs 
    SET views_count = COALESCE(views_count, 0) + 1,
        updated_at = NOW()
    WHERE id = job_id;
END;
$func$;

-- Increment applications count
CREATE OR REPLACE FUNCTION increment_applications_count(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    UPDATE jobs 
    SET applications_count = COALESCE(applications_count, 0) + 1,
        updated_at = NOW()
    WHERE id = job_id;
END;
$func$;

-- ============================================
-- Storage Buckets
-- ============================================

-- Create bucket for company logos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for CVs (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first)
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own company logos" ON storage.objects;
DROP POLICY IF EXISTS "CVs are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own CVs" ON storage.objects;

CREATE POLICY "Company logos are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload company logos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own company logos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "CVs are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cvs');

CREATE POLICY "Authenticated users can upload CVs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'cvs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own CVs"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- RLS for jobs table (drop existing first)
-- ============================================

DROP POLICY IF EXISTS "Company members can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Company members can update jobs" ON jobs;
DROP POLICY IF EXISTS "Company members can delete jobs" ON jobs;

CREATE POLICY "Company members can insert jobs"
    ON jobs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_members 
            WHERE company_members.company_id = jobs.company_id 
            AND company_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Company members can update jobs"
    ON jobs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM company_members 
            WHERE company_members.company_id = jobs.company_id 
            AND company_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Company members can delete jobs"
    ON jobs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM company_members 
            WHERE company_members.company_id = jobs.company_id 
            AND company_members.user_id = auth.uid()
        )
    );

-- ============================================
-- RLS for company_members
-- ============================================

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View company members" ON company_members;
DROP POLICY IF EXISTS "Company admins can add members" ON company_members;

CREATE POLICY "View company members"
    ON company_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM company_members cm
            WHERE cm.company_id = company_members.company_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Company admins can add members"
    ON company_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM company_members cm
            WHERE cm.company_id = company_members.company_id
            AND cm.user_id = auth.uid()
            AND cm.is_admin = true
        )
    );

-- ============================================
-- RLS for companies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Company admins can update company" ON companies;

CREATE POLICY "Authenticated users can create companies"
    ON companies FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Company admins can update company"
    ON companies FOR UPDATE
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM company_members 
            WHERE company_members.company_id = companies.id 
            AND company_members.user_id = auth.uid()
            AND company_members.is_admin = true
        )
    );

-- ============================================
-- RLS for applications
-- ============================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidates can view own applications" ON applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON applications;
DROP POLICY IF EXISTS "Companies can view applications for their jobs" ON applications;
DROP POLICY IF EXISTS "Companies can update application status" ON applications;

CREATE POLICY "Candidates can view own applications"
    ON applications FOR SELECT
    USING (candidate_id = auth.uid());

CREATE POLICY "Candidates can create applications"
    ON applications FOR INSERT
    WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Companies can view applications for their jobs"
    ON applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN company_members cm ON cm.company_id = j.company_id
            WHERE j.id = applications.job_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Companies can update application status"
    ON applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN company_members cm ON cm.company_id = j.company_id
            WHERE j.id = applications.job_id
            AND cm.user_id = auth.uid()
        )
    );

-- ============================================
-- Job Categories (upsert)
-- ============================================

INSERT INTO job_categories (name, slug, icon, is_active) VALUES
    ('Technologie & IT', 'technologie-it', 'laptop', true),
    ('Marketing & Communication', 'marketing-communication', 'megaphone', true),
    ('Finance & Comptabilite', 'finance-comptabilite', 'calculator', true),
    ('Ressources Humaines', 'ressources-humaines', 'users', true),
    ('Commerce & Vente', 'commerce-vente', 'shopping-cart', true),
    ('Sante & Medical', 'sante-medical', 'heart', true),
    ('Education & Formation', 'education-formation', 'book', true),
    ('BTP & Construction', 'btp-construction', 'building', true),
    ('Transport & Logistique', 'transport-logistique', 'truck', true),
    ('Agriculture & Environnement', 'agriculture-environnement', 'leaf', true),
    ('Tourisme & Hotellerie', 'tourisme-hotellerie', 'plane', true),
    ('Juridique & Droit', 'juridique-droit', 'scale', true),
    ('Administration', 'administration', 'briefcase', true),
    ('ONG & Humanitaire', 'ong-humanitaire', 'globe', true),
    ('Autre', 'autre', 'folder', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Cities (only if not exist)
-- ============================================

DO $block$
DECLARE
    mali_id UUID;
BEGIN
    SELECT id INTO mali_id FROM countries WHERE code = 'ML';
    
    IF mali_id IS NOT NULL THEN
        INSERT INTO cities (name, slug, country_id, region, is_active) VALUES
            ('Bamako', 'bamako', mali_id, 'District de Bamako', true),
            ('Sikasso', 'sikasso', mali_id, 'Sikasso', true),
            ('Mopti', 'mopti', mali_id, 'Mopti', true),
            ('Segou', 'segou', mali_id, 'Segou', true),
            ('Kayes', 'kayes', mali_id, 'Kayes', true),
            ('Koutiala', 'koutiala', mali_id, 'Sikasso', true),
            ('Gao', 'gao', mali_id, 'Gao', true),
            ('Kati', 'kati', mali_id, 'Koulikoro', true),
            ('Tombouctou', 'tombouctou', mali_id, 'Tombouctou', true)
        ON CONFLICT (slug) DO NOTHING;
    END IF;
END $block$;

SELECT 'MVP_P0_SETUP.sql v2 executed successfully!' as result;
