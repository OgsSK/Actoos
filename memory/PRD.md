# ACTOOS PRO - Product Requirements Document

## Vision Produit
ACTOOS PRO est une application SaaS multi-tenant pour la gestion des opérations terrain (interventions, devis, factures, techniciens). L'objectif actuel est une migration complète vers une architecture Vercel + Supabase pour éliminer la latence liée au backend Railway.

## Architecture Cible
- **Frontend**: React 18 SPA déployée sur Vercel (pro.actoos.com)
- **Base de données**: Supabase PostgreSQL avec PostgREST
- **Auth**: Supabase Edge Functions (Deno/TypeScript)
- **Logique métier**: Edge Functions pour emails, SMS, PDF
- **Vitrine**: Next.js SSG sur Vercel (actoos.com)

## État Actuel - Migration "Zero Railway"

### ✅ Complété (6 mai 2026)
1. **Login via Edge Function** - Authentification rapide (~1.5s)
2. **Dashboard** - Lecture Supabase directe via supabaseHooks
3. **Clients liste** - Lecture via supabaseHooks
4. **Interventions liste** - Lecture via supabaseHooks
5. **Devis liste** - Lecture via supabaseHooks
6. **Factures liste** - Lecture via supabaseHooks
7. **Techniciens liste** - Lecture via supabaseHooks
8. **Settings.jsx** - Toutes les mutations migrées vers Supabase
9. **TechnicianApp.jsx** - Toutes les mutations migrées vers Supabase
10. **Rapports.jsx** - Migré vers stats Supabase directes
11. **ClientPortal.jsx** - Migré vers Supabase
12. **Clients.jsx (ClientDetail)** - Migré vers Supabase

### 🔄 En Cours
- Migration des mutations restantes dans:
  - Interventions.jsx (8 appels api.*)
  - Techniciens.jsx (8 appels api.*)
  - Factures.jsx (7 appels api.*)
  - Devis.jsx (12 appels api.*)
  - Statements.jsx (4 appels api.*)

### 📋 Backlog (P1)
1. **Sécuriser RLS** - Tables non protégées: `devis`, `factures`, `users`, `entreprises`
2. **Edge Functions** pour:
   - Envoi emails (Resend)
   - SMS (Twilio)
   - Génération PDF
   - Stripe Webhooks

### 📋 Backlog (P2)
- ACTOOS ONE (super-app sur one.actoos.com)
- Analytics avancées

## Fichiers Clés

### Frontend API Layer
- `/app/frontend/src/lib/supabase.js` - Client Supabase
- `/app/frontend/src/lib/supabaseApi.js` - CRUD wrappers complets
- `/app/frontend/src/lib/supabaseHooks.js` - React Query hooks

### Edge Functions
- `/app/supabase/functions/login/index.ts` - Auth Edge Function

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

## Notes Techniques
- Le backend Railway (`/app/backend/`) est OBSOLÈTE et ne doit pas être modifié
- Toutes les nouvelles fonctionnalités doivent utiliser Supabase PostgREST ou Edge Functions
- RLS doit être activé sur toutes les tables accessibles depuis le frontend
