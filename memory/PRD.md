# ACTOOS PRO - Product Requirements Document

## 🎉 Migration "Zero Railway" - TERMINÉE À 100%

ACTOOS PRO est maintenant une application SaaS 100% serverless avec architecture Vercel + Supabase. Plus aucune dépendance sur Railway.

## Architecture Finale
- **Frontend**: React 18 SPA déployée sur Vercel (pro.actoos.com)
- **Base de données**: Supabase PostgreSQL avec PostgREST
- **Auth**: Supabase Edge Function `/login`
- **Backend Logic**: Supabase Edge Functions (Deno/TypeScript)
- **Vitrine**: Next.js SSG sur Vercel (actoos.com)

## Edge Functions Créées

| Fonction | Description | Status |
|----------|-------------|--------|
| `/login` | Authentification JWT/bcrypt | ✅ Prêt (à déployer) |
| `/send-email` | Envoi emails via Resend | ✅ Prêt (à déployer) |
| `/send-sms` | Envoi SMS via Twilio | ✅ Prêt (à déployer) |
| `/send-whatsapp` | Envoi WhatsApp via Meta Business API | ✅ Prêt (à déployer) |
| `/generate-pdf` | Génération PDF devis/factures | ✅ Prêt (à déployer) |
| `/stripe-webhook` | Webhooks Stripe paiements | ✅ Prêt (à déployer) |

## 🖥️ Interface Configuration API (NOUVEAU)

Un nouvel onglet **"Configuration API"** est disponible dans les Paramètres pour le **super_admin**.
Il permet de configurer directement depuis l'interface :

- **Email (Resend)** : Clé API, email expéditeur
- **SMS (Twilio)** : Account SID, Auth Token, Numéro de téléphone
- **WhatsApp (Meta)** : Access Token, Phone Number ID
- **Paiements (Stripe)** : Clés publique/secrète, Webhook Secret

Chaque section inclut :
- ✅ Bouton "Aide" avec guide étape par étape
- ✅ Liens directs vers les consoles des services
- ✅ Masquage des clés sensibles
- ✅ Bouton de test
- ✅ Toggle pour activer/désactiver le service

**Table associée :** `platform_config` (voir `/app/supabase/migrations/003_platform_config.sql`)

## Fichiers Migrés (100%)

### Pages principales (15 fichiers - 0 appels Railway)
- `Dashboard.jsx`, `Clients.jsx`, `Interventions.jsx`
- `Devis.jsx`, `Factures.jsx`, `Techniciens.jsx`
- `Settings.jsx`, `TechnicianApp.jsx`, `Rapports.jsx`
- `ClientPortal.jsx`, `Analytics.jsx`, `Statements.jsx`
- `AuthPages.jsx`, `APISettings.jsx`, `SuperAdminDashboard.jsx`

### Lib/API Layer
- `supabaseApi.js` - 1400+ lignes, toutes les APIs + Edge Functions
- `supabaseHooks.js` - React Query hooks

## Politiques RLS

Fichier SQL prêt à exécuter: `/app/supabase/migrations/002_rls_policies.sql`

Tables protégées:
- `users` - Accès entreprise uniquement
- `entreprises` - Accès propre entreprise
- `devis` - Multi-tenant + accès public via token
- `factures` - Multi-tenant strict
- `chat_messages` - Multi-tenant
- `platform_config` - Super admin uniquement (NOUVEAU)

## Pages Légales Mises à Jour

- ✅ `LegalPage.jsx` - Hébergeurs mis à jour (Vercel + Supabase + Cloudflare)
- ✅ `PrivacyPage.jsx` - Conforme RGPD
- ✅ `TermsPage.jsx` - CGU à jour
- ✅ `CookiesPage.jsx` - Politique cookies

## Credentials de Test
- **Super Admin**: contact@actoos.com / Salifkane&&7
- **Demo**: demo@actoos.com / demo2024

## Supabase Config
- Project URL: `https://zmngftlkdimwvkxmduvr.supabase.co`
- Edge Functions: `https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/`

## Changelog

### 7 mai 2026
- ✅ **Interface Configuration API** : Nouvel onglet dans Paramètres pour configurer les clés API
- ✅ Composant `PlatformApiConfig.jsx` avec guides intégrés
- ✅ Table `platform_config` pour stockage sécurisé des clés
- ✅ Edge Functions mises à jour pour lire depuis la BDD si pas de variable d'env
- ✅ Ajout Edge Function `/send-whatsapp` pour relances WhatsApp Business
- ✅ Mise à jour page `LegalPage.jsx` - Hébergeurs corrigés (Railway → Vercel/Supabase)
- ✅ Création guide de déploiement complet `/app/DEPLOYMENT_GUIDE.md`

### 6 mai 2026
- ✅ Migration 100% complète: 15 fichiers .jsx migrés
- ✅ Création de 5 Edge Functions (login, send-email, send-sms, generate-pdf, stripe-webhook)
- ✅ Politiques RLS pour toutes les tables sensibles
- ✅ Extension de supabaseApi.js avec edgeFunctionsApi
- ✅ Suppression de toutes les dépendances Railway
- ✅ Redis non utilisé (supprimé avec Railway)

## Prochaines Étapes

### P0 - À faire par l'utilisateur
1. Exécuter `/app/supabase/migrations/003_platform_config.sql` dans Supabase SQL Editor
2. Exécuter `/app/supabase/migrations/002_rls_policies.sql` dans Supabase SQL Editor
3. Déployer les 6 Edge Functions avec Supabase CLI
4. Configurer les clés API depuis **Paramètres > Configuration API**

### P1 - Après déploiement
1. Tester l'envoi d'emails/SMS/WhatsApp
2. Vérifier les webhooks Stripe
3. Valider le paiement en ligne

### P2 - ACTOOS ONE
1. Recevoir le plan de l'utilisateur
2. Développer one.actoos.com
