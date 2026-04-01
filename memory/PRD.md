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

### À faire après déploiement
- [ ] Valider domaine Resend (actoos.com)
- [ ] Configurer webhook Stripe avec URL prod
- [ ] Mettre à jour OAuth Google avec URLs prod
- [ ] Obtenir numéro Twilio belge
- [ ] Tester tous les flux en production

## 📊 Comptes de Test

| Plan | Email | Password |
|------|-------|----------|
| Startup | admin@test-startup.com | Test123! |
| Pro | admin@test-pro.com | Test123! |
| Enterprise | admin@test-enterprise.com | Test123! |

## 📅 Changelog

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
