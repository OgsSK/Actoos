# ACTOOS PRO - Product Requirements Document

## Vision Produit
Application SaaS B2B de gestion d'interventions terrain pour les entreprises de services en Europe. Objectif: devenir le "ServiceTitan Killer" européen.

---

## Architecture

### Stack Technique
- **Frontend**: React 19 PWA (Progressive Web App)
- **Backend**: 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Deploiement**: Vercel (frontend)

### Structure du Repo
```
/app/
├── actoos-pro/          ← PROJET PRINCIPAL
│   ├── frontend/        ← React PWA (Vercel)
│   ├── backend/         ← (DEPRECATED)
│   ├── supabase/        ← Edge Functions
│   └── docs/            ← Documentation
└── memory/              ← PRD et documentation
```

---

## Fonctionnalites Implementees

### Core (v1.0)
- [x] Authentification Supabase (email/password)
- [x] Gestion des interventions (CRUD, statuts)
- [x] Gestion des clients
- [x] Devis avec lignes detaillees
- [x] Signature electronique (devis)
- [x] Factures depuis devis
- [x] Portail client (lien token_client)
- [x] Interface technicien PWA
- [x] Mode hors-ligne basique (IndexedDB)
- [x] Photos d'intervention

### Dashboard Admin
- [x] Statistiques temps reel
- [x] Gestion des techniciens
- [x] Gestion des categories
- [x] Parametres entreprise

### P0 Phase 1 - Complete
- [x] **Mode Hors-ligne** - Indicateur de connexion (OfflineIndicator.jsx)
- [x] **Dispatch Board Temps Reel** - Vue Kanban drag & drop (DispatchBoard.jsx)
- [x] **Carte GPS Techniciens** - OpenStreetMap/Leaflet (GPSMap.jsx)
- [x] **Devis Multi-options (Good/Better/Best)** - Complete le 23 Mai 2026
  - Toggle mode multi-options dans le formulaire
  - 3 options par defaut (Essentiel/Standard/Premium)
  - Editeur de lignes par option
  - Badge "Recommande" configurable
  - Apercu comparatif cote a cote
  - Generation PDF en paysage avec colonnes
  - Integration email avec PDF multi-options

### Corrections et Ameliorations
- [x] Releves (Statements) complets avec PDF
- [x] Envoi email via Supabase Edge Functions + Resend
- [x] Chat temps reel corrige
- [x] Recherche clients/techniciens fonctionnelle
- [x] Export Analytics en PDF
- [x] Suppression code obsolete (secrets hardcodes)

---

## P0 - Reste a faire

### Pricebook (Catalogue de prix)
- [ ] Catalogue de prestations
- [ ] Tarifs predefinis par service
- [ ] Import depuis Excel/CSV
- [ ] Integration avec devis multi-options

---

## P1 - Phase 2

- [ ] Rappels RDV (email + push notifications)
- [ ] Paiement CB en ligne (Stripe)
- [ ] Portail client avance (historique, documents)
- [ ] Dashboard analytics detaille
- [ ] 2FA (Supabase MFA)

---

## P2 - Phase 3

- [ ] Optimisation des tournees (algorithme)
- [ ] Temps de trajet estime
- [ ] Tap to Pay (CB sur place)
- [ ] Relances devis automatiques
- [ ] Integration comptabilite

---

## Schema Base de Donnees

Reference complete: `/app/actoos-pro/docs/SCHEMA_SUPABASE.md`

### Tables Principales
- `users` - Utilisateurs (admin, tech)
- `entreprises` - Comptes entreprise
- `clients` - Clients finaux
- `interventions` - Interventions terrain
- `devis` - Devis (avec champs multi_options, options)
- `factures` - Factures

### Colonnes pour Multi-Options Devis
| Colonne | Type | Description |
|---------|------|-------------|
| multi_options | boolean | Active le mode multi-options |
| options | jsonb | Array d'options avec lignes |

---

## Credentials Test

- Email: `contact@actoos.com`
- Password: `Salifkane&&7`

---

## Documents de Reference

- `/app/actoos-pro/docs/SCHEMA_SUPABASE.md` - Schema DB complet
- `/app/actoos-pro/docs/CAHIER_DE_TEXTE.md` - Roadmap detaille
- `/app/actoos-pro/docs/PLAN_SERVICETITAN_KILLER.md` - Analyse concurrentielle

---

**Derniere mise a jour**: 23 Mai 2026
