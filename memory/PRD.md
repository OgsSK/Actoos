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
| `/login` | Authentification JWT/bcrypt | ✅ Déployé |
| `/send-email` | Envoi emails via Resend | ✅ Prêt |
| `/send-sms` | Envoi SMS via Twilio | ✅ Prêt |
| `/generate-pdf` | Génération PDF devis/factures | ✅ Prêt |
| `/stripe-webhook` | Webhooks Stripe paiements | ✅ Prêt |

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

## Déploiement

### Script de déploiement
```bash
/app/supabase/deploy.sh
```

### Configuration requise
```bash
# Secrets Supabase
supabase secrets set RESEND_API_KEY=xxx
supabase secrets set TWILIO_ACCOUNT_SID=xxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_PHONE_NUMBER=xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=xxx
```

### Appliquer RLS
Exécuter dans Supabase Dashboard > SQL Editor:
```sql
-- Contenu de /app/supabase/migrations/002_rls_policies.sql
```

## Credentials de Test
- **Admin**: contact@actoos.com / Salifkane&&7
- **Demo**: demo@actoos.com / demo2024

## Supabase Config
- Project URL: `https://zmngftlkdimwvkxmduvr.supabase.co`
- Edge Functions: `https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/`

## Changelog

### 6 mai 2026
- ✅ Migration 100% complète: 15 fichiers .jsx migrés
- ✅ Création de 5 Edge Functions (login, send-email, send-sms, generate-pdf, stripe-webhook)
- ✅ Politiques RLS pour toutes les tables sensibles
- ✅ Extension de supabaseApi.js avec edgeFunctionsApi
- ✅ Suppression de toutes les dépendances Railway
- ✅ Redis non utilisé (supprimé avec Railway)

## Prochaines Étapes (P2)

1. Déployer les Edge Functions sur Supabase Production
2. Configurer les secrets (Resend, Twilio, Stripe)
3. Appliquer les politiques RLS
4. Développer ACTOOS ONE (one.actoos.com)
