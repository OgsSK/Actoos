import { createClient } from '@supabase/supabase-js';

// Client pour les données vitrine (projets, commentaires, fichiers…)
export const supabaseData = createClient(
  'https://mgsantsreaybhsxyxzve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc2FudHNyZWF5YmhzeHl4enZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMjQ3MjksImV4cCI6MjA1OTkwMDcyOX0.pgHu5y9wQPQxvK1L4JGXJKxBm0pYTqYVAiN2KzLbMEI'
);

// Client pour l'authentification (Jobs)
export const supabaseAuth = createClient(
  'https://anfamlpwootbrzswnpyp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZmFtbHB3b290YnJ6c3ducHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODg3MjEsImV4cCI6MjA5NTM2NDcyMX0.43Ih1XL1dG2PWinpbLJ7mgV_6rrhhkFZ8TxmNK9EDtc'
);