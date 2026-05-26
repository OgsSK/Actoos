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
DROP POLICY IF EXISTS users_view_saved_jobs ON saved_jobs;
DROP POLICY IF EXISTS users_save_jobs ON saved_jobs;
DROP POLICY IF EXISTS users_unsave_jobs ON saved_jobs;

CREATE POLICY users_view_saved_jobs ON saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY users_save_jobs ON saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY users_unsave_jobs ON saved_jobs FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RPC Functions
-- ============================================

CREATE OR REPLACE FUNCTION increment_job_views(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $f$
BEGIN
    UPDATE jobs SET views_count = COALESCE(views_count, 0) + 1, updated_at = NOW() WHERE id = job_id;
END;
$f$;

CREATE OR REPLACE FUNCTION increment_applications_count(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $f$
BEGIN
    UPDATE jobs SET applications_count = COALESCE(applications_count, 0) + 1, updated_at = NOW() WHERE id = job_id;
END;
$f$;

-- ============================================
-- Storage Buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS logos_public_read ON storage.objects;
DROP POLICY IF EXISTS logos_auth_insert ON storage.objects;
DROP POLICY IF EXISTS cvs_public_read ON storage.objects;
DROP POLICY IF EXISTS cvs_auth_insert ON storage.objects;

CREATE POLICY logos_public_read ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY logos_auth_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');
CREATE POLICY cvs_public_read ON storage.objects FOR SELECT USING (bucket_id = 'cvs');
CREATE POLICY cvs_auth_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cvs' AND auth.role() = 'authenticated');

-- ============================================
-- RLS for jobs table
-- ============================================

DROP POLICY IF EXISTS company_insert_jobs ON jobs;
DROP POLICY IF EXISTS company_update_jobs ON jobs;
DROP POLICY IF EXISTS company_delete_jobs ON jobs;

CREATE POLICY company_insert_jobs ON jobs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = jobs.company_id AND company_members.user_id = auth.uid())
);

CREATE POLICY company_update_jobs ON jobs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = jobs.company_id AND company_members.user_id = auth.uid())
);

CREATE POLICY company_delete_jobs ON jobs FOR DELETE USING (
    EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = jobs.company_id AND company_members.user_id = auth.uid())
);

-- ============================================
-- RLS for company_members
-- ============================================

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS view_company_members ON company_members;
DROP POLICY IF EXISTS add_company_members ON company_members;

CREATE POLICY view_company_members ON company_members FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = company_members.company_id AND cm.user_id = auth.uid())
);

CREATE POLICY add_company_members ON company_members FOR INSERT WITH CHECK (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = company_members.company_id AND cm.user_id = auth.uid() AND cm.is_admin = true)
);

-- ============================================
-- RLS for companies
-- ============================================

DROP POLICY IF EXISTS create_companies ON companies;
DROP POLICY IF EXISTS update_companies ON companies;

CREATE POLICY create_companies ON companies FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY update_companies ON companies FOR UPDATE USING (
    owner_id = auth.uid() OR EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = companies.id AND company_members.user_id = auth.uid() AND company_members.is_admin = true)
);

-- ============================================
-- RLS for applications
-- ============================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS candidates_view_applications ON applications;
DROP POLICY IF EXISTS candidates_create_applications ON applications;
DROP POLICY IF EXISTS companies_view_applications ON applications;
DROP POLICY IF EXISTS companies_update_applications ON applications;

CREATE POLICY candidates_view_applications ON applications FOR SELECT USING (candidate_id = auth.uid());
CREATE POLICY candidates_create_applications ON applications FOR INSERT WITH CHECK (candidate_id = auth.uid());

CREATE POLICY companies_view_applications ON applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs j JOIN company_members cm ON cm.company_id = j.company_id WHERE j.id = applications.job_id AND cm.user_id = auth.uid())
);

CREATE POLICY companies_update_applications ON applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM jobs j JOIN company_members cm ON cm.company_id = j.company_id WHERE j.id = applications.job_id AND cm.user_id = auth.uid())
);

-- ============================================
-- Job Categories
-- ============================================

INSERT INTO job_categories (name, slug, icon, is_active) VALUES
    ('Technologie et IT', 'technologie-it', 'laptop', true),
    ('Marketing et Communication', 'marketing-communication', 'megaphone', true),
    ('Finance et Comptabilite', 'finance-comptabilite', 'calculator', true),
    ('Ressources Humaines', 'ressources-humaines', 'users', true),
    ('Commerce et Vente', 'commerce-vente', 'shopping-cart', true),
    ('Sante et Medical', 'sante-medical', 'heart', true),
    ('Education et Formation', 'education-formation', 'book', true),
    ('BTP et Construction', 'btp-construction', 'building', true),
    ('Transport et Logistique', 'transport-logistique', 'truck', true),
    ('Agriculture et Environnement', 'agriculture-environnement', 'leaf', true),
    ('Tourisme et Hotellerie', 'tourisme-hotellerie', 'plane', true),
    ('Juridique et Droit', 'juridique-droit', 'scale', true),
    ('Administration', 'administration', 'briefcase', true),
    ('ONG et Humanitaire', 'ong-humanitaire', 'globe', true),
    ('Autre', 'autre', 'folder', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Cities (without slug column)
-- ============================================

DO $b$
DECLARE
    mali_id UUID;
BEGIN
    SELECT id INTO mali_id FROM countries WHERE code = 'ML';
    IF mali_id IS NOT NULL THEN
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Bamako', mali_id, 'District de Bamako', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Bamako' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Sikasso', mali_id, 'Sikasso', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Sikasso' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Mopti', mali_id, 'Mopti', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Mopti' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Segou', mali_id, 'Segou', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Segou' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Kayes', mali_id, 'Kayes', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Kayes' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Koutiala', mali_id, 'Sikasso', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Koutiala' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Gao', mali_id, 'Gao', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Gao' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Kati', mali_id, 'Koulikoro', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Kati' AND country_id = mali_id);
        
        INSERT INTO cities (name, country_id, region, is_active) 
        SELECT 'Tombouctou', mali_id, 'Tombouctou', true WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Tombouctou' AND country_id = mali_id);
    END IF;
END $b$;

SELECT 'MVP_P0_SETUP executed successfully' as result;
