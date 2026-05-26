-- ============================================
-- ACTOOS JOBS - Additional SQL for MVP P0
-- Execute this in Supabase SQL Editor
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

-- RLS Policies for saved_jobs
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
AS $$
BEGIN
    UPDATE jobs 
    SET views_count = COALESCE(views_count, 0) + 1,
        updated_at = NOW()
    WHERE id = job_id;
END;
$$;

-- Increment applications count
CREATE OR REPLACE FUNCTION increment_applications_count(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE jobs 
    SET applications_count = COALESCE(applications_count, 0) + 1,
        updated_at = NOW()
    WHERE id = job_id;
END;
$$;

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

-- Storage policies for company-logos
CREATE POLICY "Company logos are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload company logos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own company logos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for CVs
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
-- Additional RLS for jobs table (for companies)
-- ============================================

-- Allow company members to insert jobs
CREATE POLICY "Company members can insert jobs"
    ON jobs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_members 
            WHERE company_members.company_id = jobs.company_id 
            AND company_members.user_id = auth.uid()
        )
    );

-- Allow company members to update their company's jobs
CREATE POLICY "Company members can update jobs"
    ON jobs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM company_members 
            WHERE company_members.company_id = jobs.company_id 
            AND company_members.user_id = auth.uid()
        )
    );

-- Allow company members to delete their company's jobs
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

-- Enable RLS
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of companies they belong to
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

-- Company admins can add members
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

-- Allow authenticated users to create companies
CREATE POLICY "Authenticated users can create companies"
    ON companies FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Allow company owners/admins to update their company
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

-- Enable RLS (if not already)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own applications
CREATE POLICY "Candidates can view own applications"
    ON applications FOR SELECT
    USING (candidate_id = auth.uid());

-- Candidates can create applications
CREATE POLICY "Candidates can create applications"
    ON applications FOR INSERT
    WITH CHECK (candidate_id = auth.uid());

-- Company members can view applications for their jobs
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

-- Company members can update application status
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
-- Sample Data for Testing (Optional)
-- ============================================

-- Insert job categories if not exists
INSERT INTO job_categories (name, slug, icon, is_active) VALUES
    ('Technologie & IT', 'technologie-it', 'laptop', true),
    ('Marketing & Communication', 'marketing-communication', 'megaphone', true),
    ('Finance & Comptabilité', 'finance-comptabilite', 'calculator', true),
    ('Ressources Humaines', 'ressources-humaines', 'users', true),
    ('Commerce & Vente', 'commerce-vente', 'shopping-cart', true),
    ('Santé & Médical', 'sante-medical', 'heart', true),
    ('Éducation & Formation', 'education-formation', 'book', true),
    ('BTP & Construction', 'btp-construction', 'building', true),
    ('Transport & Logistique', 'transport-logistique', 'truck', true),
    ('Agriculture & Environnement', 'agriculture-environnement', 'leaf', true),
    ('Tourisme & Hôtellerie', 'tourisme-hotellerie', 'plane', true),
    ('Juridique & Droit', 'juridique-droit', 'scale', true),
    ('Administration', 'administration', 'briefcase', true),
    ('ONG & Humanitaire', 'ong-humanitaire', 'globe', true),
    ('Autre', 'autre', 'folder', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert cities if not already
INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Bamako', 'bamako', c.id, 'District de Bamako', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Sikasso', 'sikasso', c.id, 'Sikasso', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Mopti', 'mopti', c.id, 'Mopti', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Ségou', 'segou', c.id, 'Ségou', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Kayes', 'kayes', c.id, 'Kayes', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Koutiala', 'koutiala', c.id, 'Sikasso', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Gao', 'gao', c.id, 'Gao', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Kati', 'kati', c.id, 'Koulikoro', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cities (name, slug, country_id, region, is_active) 
SELECT 'Tombouctou', 'tombouctou', c.id, 'Tombouctou', true FROM countries c WHERE c.code = 'ML'
ON CONFLICT (slug) DO NOTHING;

SELECT 'MVP_P0_SETUP.sql executed successfully' as result;
