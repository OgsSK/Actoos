# ACTOOS PRO - Product Requirements Document

## 🎯 Vision Produit
Application SaaS B2B de gestion d'interventions terrain pour les entreprises de services en Europe. Objectif: devenir le "ServiceTitan Killer" européen.

---

## 🏗 Architecture

### Stack Technique
- **Frontend**: React 19 PWA (Progressive Web App)
- **Backend**: 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Déploiement**: Vercel (frontend)

### Structure du Repo
```
/app/
├── actoos-pro/          ← PROJET PRINCIPAL
│   ├── frontend/        ← React PWA (Vercel)
│   ├── backend/         ← FastAPI (optionnel, PDF/Email)
│   ├── supabase/        ← Edge Functions
│   └── docs/            ← Documentation
├── actoos-one/          ← Projet secondaire (pausé)
└── vitrine/             ← Site marketing
```

---

## ✅ Fonctionnalités Implémentées

### Core (v1.0)
- [x] Authentification Supabase (email/password)
- [x] Gestion des interventions (CRUD, statuts)
- [x] Gestion des clients
- [x] Devis avec lignes détaillées
- [x] Signature électronique (devis)
- [x] Factures depuis devis
- [x] Portail client (lien token_client)
- [x] Interface technicien PWA
- [x] Mode hors-ligne basique (IndexedDB)
- [x] Photos d'intervention

### Dashboard Admin
- [x] Statistiques temps réel
- [x] Gestion des techniciens
- [x] Gestion des catégories
- [x] Paramètres entreprise

### Corrections 17 Mai 2025
- [x] Migration 100% Supabase (suppression Railway)
- [x] Alignement colonnes schéma (signature_client, token_client, etc.)
- [x] Suppression messages "en cours de migration"
- [x] PDF via impression navigateur
- [x] Export analytics imprimable

---

## 🔴 P0 - Phase 1 (En cours)

### Mode Hors-ligne Complet
- [ ] Sync bidirectionnelle avec conflit LWW
- [ ] Création devis/interventions offline
- [ ] File d'attente de sync visible
- [ ] Indicateur de statut sync

### Dispatch Board Temps Réel
- [ ] Vue Kanban interventions
- [ ] Drag & drop assignation
- [ ] Filtres par technicien/statut
- [ ] Mise à jour temps réel (Supabase Realtime)

### Carte GPS Techniciens
- [ ] Position live des techniciens
- [ ] Tracking des tournées
- [ ] ETA client

### Devis Multi-options
- [ ] Options Good/Better/Best
- [ ] Sélection par le client
- [ ] Comparaison visuelle

### Pricebook
- [ ] Catalogue de prestations
- [ ] Tarifs prédéfinis
- [ ] Import depuis Excel

---

## 🟠 P1 - Phase 2

- [ ] Rappels RDV (email + push notifications)
- [ ] Paiement CB en ligne (Stripe)
- [ ] Portail client avancé (historique, documents)
- [ ] Dashboard analytics détaillé
- [ ] 2FA (Supabase MFA)

---

## 🟡 P2 - Phase 3

- [ ] Optimisation des tournées (algorithme)
- [ ] Temps de trajet estimé
- [ ] Tap to Pay (CB sur place)
- [ ] Relances devis automatiques
- [ ] Intégration comptabilité

---

## 📊 Schéma Base de Données

Référence complète: `/app/actoos-pro/docs/SCHEMA_SUPABASE.md`

### Tables Principales
- `users` - Utilisateurs (admin, tech)
- `entreprises` - Comptes entreprise
- `clients` - Clients finaux
- `interventions` - Interventions terrain
- `devis` - Devis
- `devis_lignes` - Lignes de devis
- `factures` - Factures
- `facture_lignes` - Lignes de factures
- `photos` - Photos d'intervention
- `categories` - Catégories d'intervention

### Colonnes Importantes ⚠️
| Table | Colonne correcte | ❌ NE PAS utiliser |
|-------|------------------|-------------------|
| devis | `token_client` | public_token |
| devis | `signature_client` | signature |
| devis | `nom_signataire` | signature_nom |
| devis | `date_signature` | signature_date |
| interventions | `date_prevue` | date_intervention |
| interventions | `notes_technicien` | notes_terrain |
| factures | `total_ht/tva/ttc` | montant_ht/tva |
| interventions | `statut` = planifie | planifiee |

---

## 🔐 Credentials Test

- Email: `contact@actoos.com`
- Password: `Salifkane&&7`

---

## 📁 Documents de Référence

- `/app/actoos-pro/docs/SCHEMA_SUPABASE.md` - Schéma DB complet
- `/app/actoos-pro/docs/CAHIER_DE_TEXTE.md` - Roadmap détaillé
- `/app/actoos-pro/docs/PLAN_SERVICETITAN_KILLER.md` - Analyse concurrentielle
- `/app/actoos-pro/docs/GUIDE_DEPANNAGE.md` - Troubleshooting
- `/app/actoos-pro/docs/CHANGELOG_2025-05-17.md` - Dernières modifications

---

**Dernière mise à jour**: 17 Mai 2025
