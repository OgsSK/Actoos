-- =====================================================
-- ACTOOS ONE - SUPABASE STORAGE CONFIGURATION
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- Pour créer les buckets de stockage
-- =====================================================

-- Note: Les buckets doivent être créés via le Dashboard Supabase
-- ou via l'API Supabase. Ce fichier documente la configuration.

-- =====================================================
-- BUCKETS À CRÉER (via Dashboard > Storage > New Bucket)
-- =====================================================

-- 1. menu-images
--    - Public: OUI (pour que les images soient accessibles sans auth)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- 2. partner-banners
--    - Public: OUI
--    - File size limit: 10MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp

-- 3. profile-photos
--    - Public: OUI
--    - File size limit: 2MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp

-- 4. documents
--    - Public: NON (documents privés)
--    - File size limit: 20MB
--    - Allowed MIME types: application/pdf, image/*

-- =====================================================
-- STORAGE POLICIES (RLS)
-- =====================================================

-- Policy pour lecture publique sur menu-images
-- INSERT INTO storage.policies (name, bucket_id, definition, definition_type)
-- VALUES (
--   'Public read access for menu images',
--   'menu-images',
--   '(bucket_id = ''menu-images''::text)',
--   'SELECT'
-- );

-- Pour créer les buckets via SQL (si vous avez les permissions admin):
-- Ces commandes nécessitent le rôle service_role

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES 
--   ('menu-images', 'menu-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
--   ('partner-banners', 'partner-banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
--   ('profile-photos', 'profile-photos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
--   ('documents', 'documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

-- =====================================================
-- INSTRUCTIONS MANUELLES
-- =====================================================
-- 
-- 1. Allez dans le Dashboard Supabase
-- 2. Cliquez sur "Storage" dans le menu de gauche
-- 3. Cliquez sur "New Bucket"
-- 4. Créez chaque bucket avec les paramètres ci-dessus
-- 5. Pour chaque bucket PUBLIC, ajoutez une policy:
--    - Allez dans l'onglet "Policies" du bucket
--    - Cliquez sur "New Policy"
--    - Sélectionnez "For full customization"
--    - Policy name: "Allow public read"
--    - Allowed operation: SELECT
--    - Policy definition: true (pour autoriser tout le monde)
--
-- 6. Pour permettre les uploads anonymes:
--    - Ajoutez une policy INSERT
--    - Policy name: "Allow public upload"
--    - Allowed operation: INSERT
--    - Policy definition: true
--
-- =====================================================
