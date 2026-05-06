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

## Secrets à Configurer (Supabase)

| Secret | Service | Description |
|--------|---------|-------------|
| `RESEND_API_KEY` | Resend | Envoi d'emails |
| `TWILIO_ACCOUNT_SID` | Twilio | SMS - Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio | SMS - Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio | SMS - Numéro d'envoi |
| `WHATSAPP_ACCESS_TOKEN` | Meta | WhatsApp - Token d'accès |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta | WhatsApp - Phone ID |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhooks - Secret |

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

## Pages Légales Mises à Jour

- ✅ `LegalPage.jsx` - Hébergeurs mis à jour (Vercel + Supabase + Cloudflare)
- ✅ `PrivacyPage.jsx` - Conforme RGPD
- ✅ `TermsPage.jsx` - CGU à jour
- ✅ `CookiesPage.jsx` - Politique cookies

## Déploiement

### Guide complet
```
/app/DEPLOYMENT_GUIDE.md
```

### Script de déploiement
```bash
/app/supabase/deploy.sh
```

## Credentials de Test
- **Admin**: contact@actoos.com / Salifkane&&7
- **Demo**: demo@actoos.com / demo2024

## Supabase Config
- Project URL: `https://zmngftlkdimwvkxmduvr.supabase.co`
- Edge Functions: `https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/`

## Changelog

### 7 mai 2026
- ✅ Ajout Edge Function `/send-whatsapp` pour relances WhatsApp Business
- ✅ Mise à jour page `LegalPage.jsx` - Hébergeurs corrigés (Railway → Vercel/Supabase)
- ✅ Création guide de déploiement complet `/app/DEPLOYMENT_GUIDE.md`
- ✅ Mise à jour `deploy.sh` avec WhatsApp et nouveaux secrets
- ✅ Extension `supabaseApi.js` avec fonction `sendWhatsApp`

### 6 mai 2026
- ✅ Migration 100% complète: 15 fichiers .jsx migrés
- ✅ Création de 5 Edge Functions (login, send-email, send-sms, generate-pdf, stripe-webhook)
- ✅ Politiques RLS pour toutes les tables sensibles
- ✅ Extension de supabaseApi.js avec edgeFunctionsApi
- ✅ Suppression de toutes les dépendances Railway
- ✅ Redis non utilisé (supprimé avec Railway)

## Prochaines Étapes

### P0 - À faire par l'utilisateur
1. Installer Supabase CLI
2. Configurer les secrets (voir DEPLOYMENT_GUIDE.md)
3. Déployer les 6 Edge Functions
4. Appliquer les politiques RLS

### P1 - Après déploiement
1. Tester l'application en production
2. Valider l'envoi d'emails/SMS/WhatsApp
3. Vérifier les webhooks Stripe

### P2 - ACTOOS ONE
1. Recevoir le plan de l'utilisateur
2. Développer one.actoos.com
