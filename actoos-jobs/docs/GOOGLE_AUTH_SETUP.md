# Configuration Google OAuth pour Actoos Jobs

## Etape 1: Creer un projet Google Cloud

1. Allez sur https://console.cloud.google.com
2. Creez un nouveau projet ou selectionnez un projet existant
3. Notez le nom du projet

## Etape 2: Configurer OAuth Consent Screen

1. Dans le menu lateral, allez dans "APIs & Services" > "OAuth consent screen"
2. Selectionnez "External" (pour permettre a tout le monde de se connecter)
3. Remplissez les informations requises:
   - App name: Actoos Jobs
   - User support email: votre email
   - Developer contact email: votre email
4. Cliquez "Save and Continue"
5. Pour les scopes, ajoutez:
   - email
   - profile
   - openid
6. Ajoutez des utilisateurs de test si necessaire

## Etape 3: Creer les Credentials OAuth

1. Allez dans "APIs & Services" > "Credentials"
2. Cliquez "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Selectionnez "Web application"
4. Nom: "Actoos Jobs Web Client"
5. Authorized JavaScript origins:
   - https://jobs.actoos.com (production)
   - https://479e2f24-6c82-4e51-9d8f-3c6e3d1a2f74.preview.emergentagent.com (preview)
   - http://localhost:3000 (development)

6. Authorized redirect URIs:
   - https://anfamlpwootbrzswnpyp.supabase.co/auth/v1/callback
   
7. Cliquez "Create"
8. Notez le **Client ID** et le **Client Secret**

## Etape 4: Configurer Supabase

1. Allez sur https://supabase.com/dashboard
2. Selectionnez votre projet "anfamlpwootbrzswnpyp"
3. Allez dans "Authentication" > "Providers"
4. Activez "Google"
5. Entrez:
   - Client ID: (celui de Google)
   - Client Secret: (celui de Google)
6. Sauvegardez

## Etape 5: Configurer le Redirect URL dans Supabase

1. Dans Supabase, allez dans "Authentication" > "URL Configuration"
2. Site URL: https://jobs.actoos.com (ou votre URL de production)
3. Redirect URLs (ajoutez):
   - https://jobs.actoos.com/auth/callback
   - https://479e2f24-6c82-4e51-9d8f-3c6e3d1a2f74.preview.emergentagent.com/auth/callback
   - http://localhost:3000/auth/callback

## Etape 6: Tester

Le bouton "Continuer avec Google" devrait maintenant fonctionner sur:
- /connexion
- /inscription

## Troubleshooting

Si erreur "redirect_uri_mismatch":
- Verifiez que l'URL de callback Supabase est bien dans les "Authorized redirect URIs" de Google
- Format: https://[PROJECT_REF].supabase.co/auth/v1/callback

Si erreur "invalid_client":
- Verifiez le Client ID et Client Secret dans Supabase
- Attendez quelques minutes apres avoir cree les credentials (propagation)

---

Une fois configure, le code est deja pret dans:
- /app/actoos-jobs/frontend/src/pages/LoginPage.jsx (handleGoogleLogin)
- /app/actoos-jobs/frontend/src/pages/RegisterPage.jsx (handleGoogleSignUp)
