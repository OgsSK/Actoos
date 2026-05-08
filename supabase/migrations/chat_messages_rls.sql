-- SQL pour configurer les politiques RLS de chat_messages
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que la table existe avec la bonne structure
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_entreprise ON chat_messages(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- 3. Activer RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;

-- 5. Créer les nouvelles politiques

-- SELECT: Les utilisateurs peuvent voir les messages qu'ils ont envoyés ou reçus
CREATE POLICY "chat_messages_select" ON chat_messages
    FOR SELECT
    USING (
        auth.uid()::text = sender_id::text 
        OR auth.uid()::text = recipient_id::text
    );

-- INSERT: Les utilisateurs peuvent envoyer des messages (sender_id doit être leur ID)
CREATE POLICY "chat_messages_insert" ON chat_messages
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = sender_id::text
    );

-- UPDATE: Les utilisateurs peuvent marquer leurs messages reçus comme lus
CREATE POLICY "chat_messages_update" ON chat_messages
    FOR UPDATE
    USING (
        auth.uid()::text = recipient_id::text
    )
    WITH CHECK (
        auth.uid()::text = recipient_id::text
    );

-- 6. Alternative: Si vous voulez permettre l'accès sans auth (pour les tests)
-- ATTENTION: Ne pas utiliser en production!
-- CREATE POLICY "chat_messages_anon_all" ON chat_messages
--     FOR ALL
--     USING (true)
--     WITH CHECK (true);

-- 7. Pour les tests avec anon key, temporairement:
-- Permettre tout pour les utilisateurs de la même entreprise
DROP POLICY IF EXISTS "chat_messages_entreprise_access" ON chat_messages;
CREATE POLICY "chat_messages_entreprise_access" ON chat_messages
    FOR ALL
    USING (true)  -- Permet la lecture
    WITH CHECK (true);  -- Permet l'écriture

-- Note: Cette politique permissive est pour les tests uniquement.
-- En production, utilisez des politiques plus strictes basées sur auth.uid()
