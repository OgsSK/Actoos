-- ============================================
-- ACTOOS JOBS - DATABASE SCHEMA
-- Exécutez ce script dans Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== ENUMS ====================

CREATE TYPE user_role AS ENUM ('candidate', 'company', 'recruiter', 'admin', 'moderator');
CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed', 'expired');
CREATE TYPE application_status AS ENUM ('pending', 'viewed', 'shortlisted', 'interview', 'accepted', 'rejected', 'archived');
CREATE TYPE contract_type AS ENUM ('cdi', 'cdd', 'stage', 'alternance', 'freelance', 'interim');
CREATE TYPE experience_level AS ENUM ('junior', 'intermediaire', 'senior', 'expert');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'pro', 'business', 'enterprise');

-- ==================== TABLES ====================

-- Countries table
CREATE TABLE countries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    locale VARCHAR(10) DEFAULT 'fr-ML',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cities table
CREATE TABLE cities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job categories
CREATE TABLE job_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'candidate',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    country_id UUID REFERENCES countries(id),
    city_id UUID REFERENCES cities(id),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate profiles
CREATE TABLE candidate_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    bio TEXT,
    cv_url TEXT,
    portfolio_url TEXT,
    linkedin_url TEXT,
    experience_level experience_level,
    years_of_experience INTEGER DEFAULT 0,
    desired_salary_min INTEGER,
    desired_salary_max INTEGER,
    is_available BOOLEAN DEFAULT true,
    available_from DATE,
    is_open_to_remote BOOLEAN DEFAULT false,
    is_open_to_relocation BOOLEAN DEFAULT false,
    preferred_contract_types contract_type[],
    skills TEXT[],
    languages JSONB DEFAULT '[]',
    education JSONB DEFAULT '[]',
    experience JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies
CREATE TABLE companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    logo_url TEXT,
    cover_url TEXT,
    description TEXT,
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    size VARCHAR(50),
    industry VARCHAR(100),
    founded_year INTEGER,
    country_id UUID REFERENCES countries(id),
    city_id UUID REFERENCES cities(id),
    address TEXT,
    culture TEXT,
    benefits JSONB DEFAULT '[]',
    social_links JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    subscription_plan subscription_plan DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company members (employees who can post jobs)
CREATE TABLE company_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'recruiter',
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Jobs
CREATE TABLE jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250),
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    benefits TEXT,
    category_id UUID REFERENCES job_categories(id),
    contract_type contract_type NOT NULL,
    experience_level experience_level,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'XOF',
    is_salary_visible BOOLEAN DEFAULT true,
    country_id UUID REFERENCES countries(id),
    city_id UUID REFERENCES cities(id),
    address TEXT,
    is_remote BOOLEAN DEFAULT false,
    remote_type VARCHAR(20),
    positions_count INTEGER DEFAULT 1,
    skills_required TEXT[],
    languages_required JSONB DEFAULT '[]',
    application_deadline DATE,
    start_date DATE,
    is_urgent BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status job_status DEFAULT 'draft',
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    cv_url TEXT,
    status application_status DEFAULT 'pending',
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

-- Saved jobs (favorites)
CREATE TABLE saved_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- Job alerts
CREATE TABLE job_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    keywords TEXT,
    category_id UUID REFERENCES job_categories(id),
    city_id UUID REFERENCES cities(id),
    contract_types contract_type[],
    salary_min INTEGER,
    is_active BOOLEAN DEFAULT true,
    frequency VARCHAR(20) DEFAULT 'daily',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_country ON users(country_id);
CREATE INDEX idx_users_city ON users(city_id);

CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category_id);
CREATE INDEX idx_jobs_country ON jobs(country_id);
CREATE INDEX idx_jobs_city ON jobs(city_id);
CREATE INDEX idx_jobs_contract ON jobs(contract_type);
CREATE INDEX idx_jobs_published ON jobs(published_at DESC);
CREATE INDEX idx_jobs_search ON jobs USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- ==================== FUNCTIONS ====================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'candidate')::user_role);
    
    -- If candidate, create candidate profile
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'candidate') = 'candidate' THEN
        INSERT INTO candidate_profiles (user_id)
        VALUES (NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==================== RLS POLICIES ====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Candidate profiles policies
CREATE POLICY "Anyone can view candidate profiles" ON candidate_profiles FOR SELECT USING (true);
CREATE POLICY "Candidates can update own profile" ON candidate_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Candidates can insert own profile" ON candidate_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Companies policies
CREATE POLICY "Anyone can view active companies" ON companies FOR SELECT USING (is_active = true);
CREATE POLICY "Company owners can update" ON companies FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can create companies" ON companies FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Jobs policies
CREATE POLICY "Anyone can view active jobs" ON jobs FOR SELECT USING (status = 'active');
CREATE POLICY "Company members can manage jobs" ON jobs FOR ALL USING (
    EXISTS (SELECT 1 FROM company_members WHERE company_id = jobs.company_id AND user_id = auth.uid())
);

-- Applications policies
CREATE POLICY "Candidates can view own applications" ON applications FOR SELECT USING (candidate_id = auth.uid());
CREATE POLICY "Candidates can create applications" ON applications FOR INSERT WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Company members can view applications" ON applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs j JOIN company_members cm ON j.company_id = cm.company_id 
            WHERE j.id = applications.job_id AND cm.user_id = auth.uid())
);

-- Saved jobs policies
CREATE POLICY "Users can manage own saved jobs" ON saved_jobs FOR ALL USING (user_id = auth.uid());

-- Job alerts policies
CREATE POLICY "Users can manage own alerts" ON job_alerts FOR ALL USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ==================== INITIAL DATA ====================

-- Insert Mali
INSERT INTO countries (code, name, currency, locale) VALUES ('ML', 'Mali', 'XOF', 'fr-ML');

-- Insert Mali cities
INSERT INTO cities (country_id, name, region) VALUES
    ((SELECT id FROM countries WHERE code = 'ML'), 'Bamako', 'District de Bamako'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Sikasso', 'Sikasso'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Mopti', 'Mopti'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Koutiala', 'Sikasso'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Ségou', 'Ségou'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Kayes', 'Kayes'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Gao', 'Gao'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Kati', 'Koulikoro'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'Tombouctou', 'Tombouctou'),
    ((SELECT id FROM countries WHERE code = 'ML'), 'San', 'Ségou');

-- Insert job categories
INSERT INTO job_categories (slug, name, icon) VALUES
    ('tech', 'Technologie & IT', '💻'),
    ('marketing', 'Marketing & Communication', '📢'),
    ('finance', 'Finance & Comptabilité', '💰'),
    ('rh', 'Ressources Humaines', '👥'),
    ('commerce', 'Commerce & Vente', '🛒'),
    ('sante', 'Santé & Médical', '🏥'),
    ('education', 'Éducation & Formation', '📚'),
    ('btp', 'BTP & Construction', '🏗️'),
    ('transport', 'Transport & Logistique', '🚚'),
    ('agriculture', 'Agriculture & Environnement', '🌱'),
    ('tourisme', 'Tourisme & Hôtellerie', '✈️'),
    ('juridique', 'Juridique & Droit', '⚖️');

-- ============================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- ============================================
