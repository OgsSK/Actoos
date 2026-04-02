# Actoos - SaaS Gestion d'Interventions Terrain

## 🎯 Description
Application SaaS multi-tenant pour la gestion des interventions terrain avec :
- Dashboard Admin (web)
- PWA Technicien (mobile, offline-first)
- Abonnements Stripe (Startup 49€, Pro 79€, Enterprise 149€)

## ✅ Fonctionnalités Implémentées

### Core
- [x] Auth JWT + rôles (admin/tech)
- [x] Multi-tenant (isolation par entreprise)
- [x] CRUD Clients, Interventions, Devis, Factures
- [x] Catégories d'intervention personnalisables
- [x] Planning intelligent avec calendrier
- [x] Génération PDF (devis, factures, rapports)
- [x] Signatures électroniques
- [x] Photos terrain avec upload cloud

### Abonnements & Paiements
- [x] Stripe Checkout (mode LIVE)
- [x] 14 jours d'essai gratuit
- [x] Webhooks Stripe fonctionnels
- [x] Upgrade/Downgrade de plans
- [x] Résiliation avec feedback
- [x] Feature gating par plan

### PWA Technicien
- [x] Installation comme app native
- [x] Mode hors ligne
- [x] Sync automatique
- [x] Géolocalisation
- [x] Capture photos
- [x] Signature tactile

### Intégrations
- [x] Google Calendar OAuth
- [x] Resend (emails) - config test
- [x] Twilio SMS - en attente numéro
- [x] Multi-devises (EUR, USD, CHF, etc.)

### Admin Analytics
- [x] Vue d'ensemble business
- [x] Sources d'acquisition
- [x] Raisons de résiliation
- [x] Taux de conversion
- [x] Revenue par plan (MRR/ARR)

### Emails Système
- [x] Bienvenue nouvel admin
- [x] Invitation technicien
- [x] Mot de passe oublié
- [x] Confirmation résiliation
- [x] Envoi devis/factures

## 📁 Architecture

```
/app/
├── backend/                 # FastAPI
│   ├── server.py           # Point d'entrée
│   ├── routers/            # 25+ routers
│   ├── email_service.py    # Templates emails
│   ├── pdf_generator.py    # Génération PDF
│   └── requirements.txt
├── frontend/               # React
│   ├── src/
│   │   ├── pages/         # 20+ pages
│   │   ├── components/    # Composants réutilisables
│   │   └── contexts/      # Auth, Currency, Offline
│   └── package.json
└── DEPLOYMENT_GUIDE_RAILWAY.md
```

## 🚀 Déploiement

### Fichiers créés
- `/app/DEPLOYMENT_GUIDE_RAILWAY.md` - Guide complet
- `/app/backend/railway.toml` - Config Railway backend
- `/app/frontend/railway.toml` - Config Railway frontend
- `/app/backend/.env.example` - Template variables

### Étapes
1. Save to GitHub depuis Emergent
2. Créer projet Railway
3. Ajouter MongoDB + Backend + Frontend
4. Configurer variables d'environnement
5. Configurer domaine actoos.com
6. Configurer webhook Stripe
7. Valider domaine Resend

## ⏳ Post-Déploiement

### ✅ Complété
- [x] Valider domaine Resend (actoos.com)
- [x] Load Test 100 entreprises (0 erreurs)
- [x] Stress Test jusqu'à 300 simultané (100% succès)
- [x] Endpoint nettoyage données de test

### À faire après push GitHub
- [ ] Appeler endpoint nettoyage sur production: `GET https://actoos-production.up.railway.app/api/admin/analytics/cleanup-all-test-data?secret_key=actoos-cleanup-2024-prod`
- [ ] Configurer webhook Stripe avec URL prod
- [ ] Mettre à jour OAuth Google avec URLs prod
- [ ] Obtenir numéro Twilio belge
- [ ] Tester compte démo (demo@actoos.com / demo2024)

## 📊 Comptes de Test

| Plan | Email | Password |
|------|-------|----------|
| Startup | admin@test-startup.com | Test123! |
| Pro | admin@test-pro.com | Test123! |
| Enterprise | admin@test-enterprise.com | Test123! |

## 📅 Changelog

### 2026-04-01 (Session 2)
- **Audit complet des emails système** : Vérifié tous les templates (devis, factures, relances, invitations, welcome, résiliation)
- **Fix critique**: Ajout `import os` dans `auth.py` (invitation technicien crashait)
- **Fix critique**: Création fonction `send_email_with_attachment` dans `email_service.py` (relevés de compte crashaient)
- Tous les emails ont des URLs correctes pointant vers `actoos.com`

### 2026-03-31
- Test flux abonnements complet
- Correction conversion devises
- Amélioration modal upgrade (bouton X visible)
- Alertes dashboard cliquables

### 2026-04-01
- Formulaire résiliation amélioré (champ Autre conditionnel)
- API Admin Analytics (6 endpoints)
- Email invitation technicien ajouté
- Email confirmation résiliation ajouté
- Guide déploiement Railway créé
- **DÉPLOIEMENT LIVE** sur Railway (actoos.com)
- Migration MongoDB vers Atlas (M0 cluster)
- Domaine Resend vérifié (actoos.com)
- Load Test 100 entreprises: 100% succès
- **Stress Test Progressif**: Système testé jusqu'à 300 créations simultanées avec 100% de succès
- Endpoint de nettoyage créé: `/api/admin/analytics/cleanup-all-test-data`

## 📊 Résultats Stress Test Production

| Concurrent | Succès | Temps Moyen | Status |
|------------|--------|-------------|--------|
| 25 | 100% | ~9s | ✅ OK |
| 50 | 100% | ~17s | ✅ OK |
| 100 | 100% | ~35s | ✅ OK |
| 200 | 100% | ~53s | ✅ OK |
| 300 | 100% | ~68s | ⚠️ Limite |

### Recommandations
- **Limite sécurisée**: 150 opérations simultanées
- **Limite confortable**: 200 opérations simultanées
- **Limite maximum**: 300 opérations (latence élevée mais 0 erreurs)


## 🔒 Sécurité Photos (EXIF Stripping) - IMPLÉMENTÉ

Toutes les photos uploadées via l'API sont automatiquement traitées :
- **Suppression EXIF** : Coordonnées GPS, modèle appareil, date/heure supprimés
- **Compression** : Réduction automatique à max 500KB
- **Redimensionnement** : Max 1920x1920 pixels
- **Conversion** : Toutes les images converties en JPEG

Fichiers concernés :
- `/app/backend/image_utils.py` - Fonctions de traitement
- `/app/backend/routers/photos.py` - Endpoint upload

## 🔄 Sync Offline LWW (Last-Write-Wins) - IMPLÉMENTÉ

Résolution automatique des conflits quand un technicien travaille hors ligne :

### Backend (`/api/interventions/sync`)
- `POST /interventions/sync` - Synchronisation avec détection de conflits
- `GET /interventions/sync/status` - Statut des modifications serveur
- Tous les endpoints de modification ajoutent `updated_at`

### Frontend (`OfflineContext.jsx`)
- `syncInterventionsLWW()` - Sync avec résolution LWW
- Détection automatique de conflits
- Notification utilisateur des conflits résolus
- Historique des syncs dans IndexedDB

### Indicateurs Visuels de Conflits (PWA Technicien)
- **Banner de notification** : Affiché quand des modifications ont été écrasées
- **Badge "Sync"** : Sur les cartes d'intervention ayant eu un conflit récent
- **Dialog de détails** : Permet de voir les conflits et les marquer comme lus
- **Stockage persistant** : Les conflits sont gardés pendant 24h pour affichage

### Logique LWW
1. Client envoie `local_updated_at` avec ses modifications
2. Serveur compare avec `server_updated_at`
3. Si `server > local` → Conflit, serveur gagne
4. Si `local > server` → Sync OK, modifications appliquées

## 📋 RGPD - Rétention des Données - IMPLÉMENTÉ

### Backend (`/api/gdpr/*`)
- `GET /gdpr/settings` - Récupérer les paramètres de rétention
- `PUT /gdpr/settings` - Mettre à jour les paramètres
- `GET /gdpr/preview` - Prévisualiser ce qui sera supprimé
- `POST /gdpr/cleanup/execute` - Lancer le nettoyage
- `DELETE /gdpr/client/{id}` - Droit à l'oubli (anonymisation)
- `POST /gdpr/export-request/{client_id}` - Demande d'export GDPR

### Frontend (`Settings.jsx` - Onglet RGPD)
- Sliders pour configurer la rétention (photos, interventions, clients)
- Affichage des obligations légales (devis 5 ans, factures 10 ans)
- Activation du nettoyage automatique
- Prévisualisation avant suppression
- Nettoyage manuel avec confirmation

### Durées par défaut
| Type de données | Rétention | Configurable |
|-----------------|-----------|--------------|
| Photos | 24 mois | ✅ Oui (1-120) |
| Interventions | 36 mois | ✅ Oui (12-120) |
| Clients inactifs | 36 mois | ✅ Oui (12-120) |
| Devis | 60 mois | ❌ Légal minimum |
| Factures | 120 mois | ❌ Légal minimum |



## 👑 Super Admin Dashboard - IMPLÉMENTÉ (2026-04-02)

### Accès
- Réservé au propriétaire de la plateforme (emails contenant "salifkane612")
- Lien dans la sidebar du dashboard principal (icône couronne dorée)
- Route : `/super-admin`

### Backend (`/api/super-admin/*`)
- `GET /super-admin/stats` - Statistiques globales (entreprises, utilisateurs, MRR, résiliations)
- `GET /super-admin/entreprises` - Liste toutes les entreprises avec filtres
- `GET /super-admin/entreprises/{id}` - Détails d'une entreprise
- `PUT /super-admin/entreprises/{id}/plan` - Modifier le plan (admin override)
- `PUT /super-admin/entreprises/{id}/status` - Modifier le statut
- `GET /super-admin/revenue` - Métriques de revenus (MRR, ARR, tendances)
- `GET /super-admin/feedbacks` - Feedbacks des clients
- `GET /super-admin/cancellations` - Résiliations récentes
- `DELETE /super-admin/entreprises/{id}` - Supprimer une entreprise

### Frontend (`SuperAdminDashboard.jsx`)
- Cartes KPI : Entreprises, Utilisateurs, MRR/ARR, Résiliations
- Statistiques d'activité : Interventions, Devis, Factures
- Graphique de répartition par plan (Startup/Pro/Enterprise)
- Tableau des entreprises avec recherche et filtres
- Onglets : Entreprises, Feedbacks, Résiliations
- Modales de détails et modification de plan

### Métriques actuelles (2026-04-02)
- 7 entreprises (2 Startup, 2 Pro, 3 Enterprise) - Données nettoyées
- 13 utilisateurs (6 admins, 7 techniciens)
- MRR : 654€ / ARR : 7848€
- 0 résiliations

## 🍪 Système de Consentement RGPD - IMPLÉMENTÉ (2026-04-02)

### Composant Cookie Consent (`CookieConsent.jsx`)
- Bannière de consentement apparaissant à la première visite
- 4 catégories de cookies : Essentiels, Analytiques, Marketing, Préférences
- Boutons : Accepter tout, Personnaliser, Refuser les non-essentiels
- Modal de personnalisation avec toggles par catégorie
- Stockage dans localStorage (`actoos_cookie_consent`)
- Liens vers les pages légales

### Pages Légales
- `/legal` - Mentions légales (LegalPage.jsx)
- `/privacy` - Politique de confidentialité (PrivacyPage.jsx)
- `/terms` - Conditions générales d'utilisation (TermsPage.jsx)
- `/cookies` - Politique des cookies avec bouton de réinitialisation (CookiesPage.jsx)

### Caractéristiques
- Design adapté à Actoos (logiciel SaaS)
- Pas de données d'entreprise spécifiques (numéro TVA, adresse)
- Conforme RGPD
- Liens légaux dans le footer de la landing page
- Liens légaux dans la bannière de cookies
