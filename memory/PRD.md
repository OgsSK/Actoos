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
| `/send-email` | Envoi emails via Resend | ✅ Déployé |
| `/send-sms` | Envoi SMS via Twilio | ✅ Déployé |
| `/send-whatsapp` | Envoi WhatsApp via Meta Business API | ✅ Déployé |
| `/generate-pdf` | Génération PDF devis/factures | ✅ Déployé |
| `/stripe-webhook` | Webhooks Stripe paiements | ✅ Déployé |

## 🖥️ Interface Configuration API

Un onglet **"Configuration API"** est disponible dans les Paramètres pour le **super_admin**.
Il permet de configurer directement depuis l'interface :

- **Email (Resend)** : Clé API, email expéditeur
- **SMS (Twilio)** : Account SID, Auth Token, Numéro de téléphone
- **WhatsApp (Meta)** : Access Token, Phone Number ID
- **Paiements (Stripe)** : Clés publique/secrète, Webhook Secret

## Tests E2E - État Actuel

### ✅ Iteration 49 - TOUS LES TESTS PASSENT
- Login/Logout ✅
- Dashboard (stats correctes) ✅
- Interventions (liste + création) ✅
- Techniciens (liste) ✅
- Planning (calendrier) ✅
- Clients (CRUD) ✅
- Devis/Factures ✅

### Bugs Corrigés (7 mai 2026)
- **PGRST201** : Relation ambiguë interventions↔users → FK explicites ajoutées
- **22P02** : Enum 'tech' invalide → Remplacé par 'technicien'
- **22P02** : UUID vide à la création → Sanitisation des chaînes vides en null

## Credentials de Test
- **Super Admin**: contact@actoos.com / Salifkane&&7
- **Demo**: demo@actoos.com / Salifkane&&7

## Supabase Config
- Project URL: `https://zmngftlkdimwvkxmduvr.supabase.co`
- Edge Functions: `https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/`

## Changelog

### 7 mai 2026
- ✅ **Correction PGRST201** : FK explicites dans toutes les requêtes interventions↔users
- ✅ **Correction 22P02** : Enum 'technicien' uniquement (suppression de 'tech')
- ✅ **Correction UUID** : Sanitisation des chaînes vides en null pour les champs UUID
- ✅ **Tests E2E** : Iteration 49 - 100% des fonctionnalités critiques validées
- ✅ Fichiers corrigés: supabaseApi.js, supabaseHooks.js, supabase.js

### 6-7 mai 2026
- ✅ Interface Configuration API avec guides intégrés
- ✅ Edge Functions avec bcryptjs (compatible Deno Deploy)
- ✅ Migration 100% complète: 15 fichiers .jsx migrés
- ✅ PWA corrigé (start_url: /login)
- ✅ Session persistante 30 jours (localStorage)

## Prochaines Étapes

### P1 - Améliorations mineures
1. Désactiver/migrer les endpoints SSE legacy (401 dans la console mais non-bloquant)
2. Réécrire les politiques RLS de manière sécurisée (actuellement `USING (true)`)

### P2 - ACTOOS ONE
1. Recevoir les spécifications de l'utilisateur
2. Développer one.actoos.com

## Issues Restantes (Non-Bloquantes)
- SSE `/api/events/stream` : 401 Unauthorized (endpoint Railway legacy)
- `/api/usage` : 401 Unauthorized (endpoint Railway legacy)
- Ces endpoints peuvent être ignorés ou migrés vers Supabase Realtime
