# ACTOOS PRO - Product Requirements Document

## Vision Produit
ACTOOS PRO est une application SaaS multi-tenant pour la gestion des opérations terrain (interventions, devis, factures, techniciens). L'architecture est maintenant 100% Vercel + Supabase (plus de Railway).

## Architecture Finale
- **Frontend**: React 18 SPA déployée sur Vercel (pro.actoos.com)
- **Base de données**: Supabase PostgreSQL avec PostgREST
- **Auth**: Supabase Edge Function `/login`
- **Backend Logic**: Supabase Edge Functions (Deno/TypeScript)
- **Vitrine**: Next.js SSG sur Vercel (actoos.com)
- **Redis**: Non utilisé (supprimé avec Railway)

## Edge Functions Créées

### `/supabase/functions/login/index.ts` ✅
- Authentification JWT avec bcrypt
- Temps de réponse ~1.5s

### `/supabase/functions/send-email/index.ts` ✅
- Envoi emails via Resend API
- Templates: devis_sent, facture_sent, facture_relance, invitation, password_reset

### `/supabase/functions/send-sms/index.ts` ✅
- Envoi SMS via Twilio API
- Support config entreprise personnalisée ou partagée Actoos
- Templates: intervention_reminder, invitation, devis_notification, facture_reminder

### `/supabase/functions/generate-pdf/index.ts` ✅
- Génération PDF pour devis et factures
- Templates HTML professionnels avec branding entreprise

### `/supabase/functions/stripe-webhook/index.ts` ✅
- Gestion webhooks Stripe
- Events: checkout.session.completed, subscription.updated/deleted, invoice.payment_failed

## Migration "Zero Railway" - COMPLÈTE

### ✅ Tous les fichiers migrés
**Lib/API Layer:**
- `supabaseApi.js` - 1400+ lignes, toutes les APIs + Edge Functions

**Pages principales (12 fichiers):**
- `Dashboard.jsx`, `Clients.jsx`, `Interventions.jsx`
- `Devis.jsx`, `Factures.jsx`, `Techniciens.jsx`
- `Settings.jsx`, `TechnicianApp.jsx`, `Rapports.jsx`
- `ClientPortal.jsx`, `Analytics.jsx`, `Statements.jsx`, `AuthPages.jsx`

### 🔄 Fichiers non critiques restants
- `APISettings.jsx` (9 appels) - Configuration avancée clés API
- `SuperAdminDashboard.jsx` (15 appels) - Super admin uniquement

## Prochaines Étapes

### P1 - Déploiement Edge Functions
```bash
# Déployer les Edge Functions sur Supabase
supabase functions deploy send-email
supabase functions deploy send-sms
supabase functions deploy generate-pdf
supabase functions deploy stripe-webhook
```

### P1 - Configuration Secrets Supabase
```bash
# Configurer les secrets
supabase secrets set RESEND_API_KEY=xxx
supabase secrets set TWILIO_ACCOUNT_SID=xxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_PHONE_NUMBER=xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=xxx
```

### P1 - Sécurité RLS
Activer RLS sur les tables restantes:
- `devis`
- `factures`
- `users`
- `entreprises`
- `chat_messages`

### P2 - Futur
- ACTOOS ONE (super-app sur one.actoos.com)

## Credentials de Test
- **Admin**: contact@actoos.com / Salifkane&&7
- **Demo**: demo@actoos.com / demo2024

## Supabase Config
- Project URL: `https://zmngftlkdimwvkxmduvr.supabase.co`
- Edge Functions URL: `https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/`

## Tables Principales
- `users` - Utilisateurs (admin, tech)
- `entreprises` - Tenants (multi-tenant)
- `interventions` - Missions terrain
- `clients` - Clients des entreprises
- `devis` - Devis
- `factures` - Factures
- `sites` - Sites clients (multi-sites)
- `categories` - Catégories d'intervention
- `user_invites` - Invitations utilisateurs

## Changelog

### 6 mai 2026
- Migration complète: 12 fichiers .jsx migrés de Railway vers Supabase
- Création de 4 Edge Functions: send-email, send-sms, generate-pdf, stripe-webhook
- Extension de supabaseApi.js (1400+ lignes) avec edgeFunctionsApi
- Suppression de toutes les dépendances Railway
- Redis non utilisé (l'état était déjà en fallback in-memory)
