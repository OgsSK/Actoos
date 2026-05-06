# ACTOOS PRO - Product Requirements Document

## Vision Produit
ACTOOS PRO est une application SaaS multi-tenant pour la gestion des opérations terrain (interventions, devis, factures, techniciens). L'objectif actuel est une migration complète vers une architecture Vercel + Supabase pour éliminer la latence liée au backend Railway.

## Architecture Cible
- **Frontend**: React 18 SPA déployée sur Vercel (pro.actoos.com)
- **Base de données**: Supabase PostgreSQL avec PostgREST
- **Auth**: Supabase Edge Functions (Deno/TypeScript)
- **Logique métier**: Edge Functions pour emails, SMS, PDF
- **Vitrine**: Next.js SSG sur Vercel (actoos.com)

## État Actuel - Migration "Zero Railway" (6 mai 2026)

### ✅ Migration Complète
Les fichiers suivants n'utilisent plus l'API Railway et fonctionnent 100% avec Supabase:

**Lib/API Layer:**
- `supabaseApi.js` - Toutes les fonctions CRUD (interventions, clients, devis, factures, users, categories, etc.)
- `supabaseHooks.js` - React Query hooks

**Pages principales:**
- `Dashboard.jsx` - Stats via Supabase direct
- `Clients.jsx` + `ClientDetail` - CRUD complet via Supabase
- `Interventions.jsx` + `InterventionDetail` - CRUD complet via Supabase
- `Devis.jsx` + `DevisForm` + `DevisDetail` - CRUD complet via Supabase
- `Factures.jsx` + `FactureDetail` - CRUD complet via Supabase
- `Techniciens.jsx` - Gestion utilisateurs via Supabase
- `Settings.jsx` - Toutes les configurations via Supabase
- `TechnicianApp.jsx` - App mobile technicien via Supabase
- `Rapports.jsx` - Stats et rapports via Supabase
- `ClientPortal.jsx` - Portail client public via Supabase
- `Analytics.jsx` - Analytics via Supabase
- `Statements.jsx` - Relevés client via Supabase
- `AuthPages.jsx` - Activation compte

### 🔄 Fichiers restants (non critiques)
- `APISettings.jsx` (9 appels) - Configuration avancée clés API
- `SuperAdminDashboard.jsx` (15 appels) - Dashboard super admin uniquement

### ⚠️ Fonctionnalités en attente d'Edge Functions
Ces fonctionnalités affichent un message "en cours de migration":
- Génération PDF (devis, factures, rapports)
- Envoi emails (devis, factures, relances)
- Envoi SMS (invitations, rappels)
- Test WhatsApp
- Sync Google Calendar
- Paiement Stripe en ligne

### 📋 Backlog (P1) - Edge Functions à créer
1. `/supabase/functions/pdf-generator` - Génération PDF
2. `/supabase/functions/send-email` - Envoi emails via Resend
3. `/supabase/functions/send-sms` - Envoi SMS via Twilio
4. `/supabase/functions/stripe-webhook` - Webhooks Stripe

### 📋 Backlog (P1) - Sécurité
- Activer RLS sur: `devis`, `factures`, `users`, `entreprises`, `chat_messages`

### 📋 Backlog (P2)
- ACTOOS ONE (super-app sur one.actoos.com)
- Analytics avancées temps réel

## Fichiers Clés

### Frontend API Layer
- `/app/frontend/src/lib/supabase.js` - Client Supabase
- `/app/frontend/src/lib/supabaseApi.js` - CRUD wrappers complets (1200+ lignes)
- `/app/frontend/src/lib/supabaseHooks.js` - React Query hooks

### Edge Functions
- `/app/supabase/functions/login/index.ts` - Auth Edge Function (fonctionnel)

## Credentials de Test
- **Admin**: contact@actoos.com / Salifkane&&7
- **Demo**: demo@actoos.com / demo2024

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

## Notes Techniques
- Le backend Railway (`/app/backend/`) est OBSOLÈTE et ne doit pas être modifié
- Toutes les nouvelles fonctionnalités doivent utiliser Supabase PostgREST ou Edge Functions
- RLS doit être activé sur toutes les tables accessibles depuis le frontend

## Changelog

### 6 mai 2026
- Migration massive: 12 fichiers .jsx migrés de Railway vers Supabase
- Extension de supabaseApi.js avec stats, settings, technician, photos, auth APIs
- Suppression de toutes les dépendances axios dans les pages principales
