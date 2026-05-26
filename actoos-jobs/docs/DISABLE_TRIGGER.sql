-- ============================================
-- ACTOOS JOBS - DISABLE TRIGGER
-- Le frontend gerera la creation du profil
-- ============================================

-- Supprimer le trigger problematique
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================
-- SUCCESS! Trigger disabled.
-- Le frontend va creer le profil utilisateur.
-- ============================================
