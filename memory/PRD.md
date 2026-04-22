# ACTOOS PRO - SaaS Gestion d'Interventions Terrain

## 🎯 Description
Application SaaS multi-tenant pour la gestion des interventions terrain avec :
- Dashboard Admin (web)
- PWA Technicien (mobile, offline-first)
- Abonnements Stripe avec tarifs ACTOOS PRO 2026:
  - **Startup**: 9,99€/mois ou 95,90€/an (-20%)
  - **Pro**: 19,99€/mois ou 191,90€/an (-20%)
  - **Entreprise**: 39,99€/mois ou 383,90€/an (-20%)

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
- [x] **Toggle mensuel/annuel avec -20% discount**

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
- [x] **Currency Snapshot** - Devise figée au moment de création des documents

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

### 2026-04-22 - Corrections de Sécurité Critiques
- **Mot de passe oublié sécurisé** :
  - Rate limiting : 3 requêtes max par email par heure
  - Messages génériques pour empêcher l'énumération d'emails
  - Tokens stockés en DB avec expiration de 1 heure
  - Tokens invalidés après utilisation
  - Email amélioré avec avertissements de sécurité
- **Blocage inscription directe** :
  - `POST /api/auth/register` retourne désormais 403
  - Nouvel endpoint `POST /api/auth/register-from-checkout` pour création via Stripe
  - Page `/register` redirige automatiquement vers `/pricing`
  - Lien "Créer une entreprise" remplacé par "Démarrer l'essai gratuit"
- **Vérification abonnement au login** :
  - Vérifie `subscription_status` lors de chaque connexion admin
  - Bloque l'accès si trial expiré, abonnement annulé ou absent
  - Retourne code `subscription_required` avec redirection vers pricing
- **Historique d'import avec rollback** :
  - API `/api/import/history` - liste des imports
  - API `/api/import/rollback/{id}` - annulation avec suppression des données
  - UI avec onglets "Nouvel import" / "Historique"
- **Variables S3/R2 configurées** dans `.env`
- **Cron Job Trial Reminders** : Script `/app/backend/cron_trial_reminders.py`
- **Nouveaux tarifs ACTOOS PRO** :
  - Startup: 9,99€/mois ou 95,90€/an (-20%)
  - Pro: 19,99€/mois ou 191,90€/an (-20%)
  - Entreprise: 39,99€/mois ou 383,90€/an (-20%)
- **Branding ACTOOS PRO** : Page pricing avec toggle mensuel/annuel, couleur verte, badge -20%
- **Fix critique: Bug devise rétroactive** :
  - Ajout champs `devise` et `taux_change_eur` aux modèles Devis et Facture
  - Snapshot de la devise au moment de création du document
  - Les PDFs utilisent la devise du document (pas celle de l'entreprise)
  - Protection des données financières historiques
- **Email rappel trial J-3** :
  - Template email avec urgency colors (J-3/J-1/J0)
  - CTA direct vers page upgrade
  - Endpoints `/api/tasks/send-trial-reminders` et `/api/tasks/check-and-send-reminders`
- **Mass Import CSV/Excel** :
  - Router `/api/import` avec upload, preview, execute
  - Parsing CSV/Excel avec suggestions de mapping automatiques
  - Support: Clients, Interventions, Devis, Factures
  - UI wizard 5 étapes dans `/dashboard/import`
  - **Historique d'import avec rollback** :
    - API `/api/import/history` - liste des imports
    - API `/api/import/rollback/{id}` - annulation avec suppression des données
    - UI avec onglets "Nouvel import" / "Historique"
- **Stockage Cloud S3/R2** :
  - Service compatible S3 et Cloudflare R2
  - Fallback automatique vers stockage local si non configuré
  - Variables dans `.env` : `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL`, `S3_REGION`
- **Cron Job Trial Reminders** :
  - Script `/app/backend/cron_trial_reminders.py`
  - Envoie rappels J-3, J-1, J0 pour trials expirant
  - Usage: `python cron_trial_reminders.py` ou cron `0 9 * * *`
  - Ou via API: `POST /api/tasks/check-and-send-reminders` (super admin)

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

## 📱 Préférences de Notification & SMS - IMPLÉMENTÉ (2026-04-02)

### Configuration SMS (Twilio)
- **Mode Service Actoos** : Utilise le Twilio partagé d'Actoos (recommandé). Aucune configuration requise pour l'utilisateur.
- **Mode Twilio Personnalisé** : L'utilisateur peut configurer ses propres credentials Twilio (Account SID, Auth Token, Numéro)
- Endpoint `GET /api/sms/status` retourne le statut SMS avec `mode` (shared/custom/none)
- Endpoint `PUT /api/sms/config` pour changer de mode
- Endpoint `POST /api/sms/test` pour envoyer un SMS de test

### Préférences de Notification
- **Notifications SMS** (désactivées si SMS non configuré) :
  - Rappel d'intervention (J-1)
  - Nouveau devis
  - Nouvelle facture
  - Relance de paiement
- **Notifications Email** (toujours disponibles) :
  - Nouveau devis (avec PDF)
  - Nouvelle facture (avec PDF)
  - Relance de paiement
- Relances automatiques (toggle global)

### Backend (`/api/settings/*`)
- `GET /api/settings/notifications` - Préférences de notification
- `PUT /api/settings/notifications` - Mise à jour préférences
- `GET /api/settings/all` - Toutes les préférences combinées
- `GET /api/settings/integrations` - Statut des intégrations

### Frontend (Settings.jsx)
- Composant `SMSConfiguration` avec choix mode partagé/personnalisé
- Section test SMS pour vérifier la configuration
- Toggles pour activer/désactiver chaque type de notification

## 📄 Conditions Générales Documents - IMPLÉMENTÉ (2026-04-02)

### Paramètres Documents
- **Conditions générales de vente** : Texte affiché sur tous les devis et factures
- **Conditions de paiement** : Texte par défaut et délai en jours
- **Pieds de page** :
  - Pied de page Devis
  - Pied de page Factures
  - Mentions légales additionnelles
- **Numérotation** : Préfixes personnalisables (ex: D-2024-001, F-2024-001)

### Backend (`/api/settings/documents`)
- `GET /api/settings/documents` - Récupère les paramètres documents
- `PUT /api/settings/documents` - Met à jour les paramètres
- `GET /api/settings/documents/preview` - Aperçu du rendu

### Frontend (Settings.jsx)
- Composant `DocumentSettingsForm` avec :
  - Textarea pour conditions générales
  - Champs conditions de paiement et délai
  - Textareas pour pieds de page devis/factures
  - Champs préfixes de numérotation

## 📱 WhatsApp Business Cloud API - IMPLÉMENTÉ (2026-04-02)

### Fonctionnalités
- **Mode Service Actoos** : WhatsApp partagé, aucune config requise pour l'utilisateur
- **Mode Personnalisé** : L'utilisateur peut configurer ses propres credentials Meta Business
- **Templates de messages** prêts à l'emploi :
  - Rappel d'intervention (J-1)
  - Notification nouveau devis (avec PDF en pièce jointe)
  - Notification nouvelle facture (avec PDF)
  - Relance de paiement
- **Avantages vs SMS** : 98% taux d'ouverture, ~0.004€/message (vs ~0.05€ SMS), médias riches

### Backend
- `/app/backend/whatsapp_service.py` - Service WhatsApp complet
- `/app/backend/routers/integrations.py` - Router intégrations (WhatsApp, Google Calendar)
- Endpoints :
  - `GET /api/integrations/status` - Statut de toutes les intégrations
  - `GET /api/integrations/whatsapp/status` - Statut WhatsApp
  - `PUT /api/integrations/whatsapp/config` - Configuration
  - `POST /api/integrations/whatsapp/test` - Test d'envoi
  - `PUT /api/integrations/messaging-preference` - Canal préféré (WhatsApp/SMS/Email)

### Frontend (Settings.jsx)
- Composant `IntegrationsHub` avec :
  - Sélection du canal préféré (WhatsApp recommandé)
  - Configuration WhatsApp (partagé ou personnalisé)
  - Formulaire de credentials Meta Business
  - Test d'envoi WhatsApp
  - Intégration Google Calendar

### Note sur Twilio SMS
- SMS reste disponible en option de secours
- WhatsApp est maintenant le canal recommandé par défaut
- Les utilisateurs peuvent choisir leur canal préféré

## 🔔 Notifications Automatiques - IMPLÉMENTÉ (2026-04-02)

### Service de Notification Unifié
- `/app/backend/notification_service.py` - Service central qui route vers WhatsApp/SMS/Email
- Respecte les préférences de canal de l'entreprise
- Cascade automatique : WhatsApp → SMS → Email (si le canal préféré échoue)

### Notifications Automatiques
1. **Envoi de Devis** (`POST /api/devis/{id}/send`)
   - Déclenche automatiquement notification WhatsApp/SMS/Email
   - Attache le PDF du devis (WhatsApp supporte les documents)
   - Log dans l'historique des communications

2. **Émission de Facture** (`POST /api/factures/{id}/emit`)
   - Notification automatique avec PDF en pièce jointe
   - Respecte les préférences de notification

3. **Rappels d'Intervention J-1** (Tâche programmée)
   - `POST /api/admin/analytics/cron/intervention-reminders`
   - Envoie rappels pour les interventions du lendemain
   - À configurer via cron job ou Railway Scheduled Tasks

4. **Relances de Paiement** (Tâche programmée)
   - `POST /api/admin/analytics/cron/payment-reminders`
   - Relance les factures en retard (min 7 jours entre chaque relance)
   - Met à jour le statut "en_retard"

### Configuration Cron Recommandée (Railway)
```
# Rappels J-1 - Tous les jours à 9h
0 9 * * * curl -X POST https://api.actoos.com/api/admin/analytics/cron/intervention-reminders?secret_key=YOUR_CRON_SECRET

# Relances paiement - Tous les jours à 10h
0 10 * * * curl -X POST https://api.actoos.com/api/admin/analytics/cron/payment-reminders?secret_key=YOUR_CRON_SECRET
```

### Variables d'environnement
- `CRON_SECRET_KEY` : Clé secrète pour les endpoints cron (défaut: actoos-cron-2024)


## 🐛 Corrections de Bugs - 2026-04-03

### P0 - Critiques (CORRIGÉS ✅)

#### Bug 1: Interventions ne démarrent pas dans l'App Technicien
- **Cause**: Le frontend envoyait `{ geo: geoData }` mais le backend attendait `geoData` directement
- **Fix**: `TechnicianApp.jsx` ligne 1471 - `api.post('/interventions/{id}/start', geoData)` au lieu de `{geo: geoData}`
- **Fix**: `OfflineContext.jsx` ligne 165 - Même correction pour le sync offline
- **Fichiers**: `/app/frontend/src/pages/TechnicianApp.jsx`, `/app/frontend/src/contexts/OfflineContext.jsx`

#### Bug 3: Timezone/Minuit - Interventions d'aujourd'hui non affichées
- **Cause**: Le filtrage utilisait UTC strict (00:00 à 23:59 UTC), mais la France est en UTC+1/UTC+2
- **Fix**: Fenêtre élargie de 22h J-1 à 02h J+1 UTC pour couvrir les fuseaux horaires européens
- **Fichiers**: `/app/backend/routers/interventions.py` (ligne 191-205), `/app/backend/routers/dashboard.py`

#### Bug 4: Analytics Dashboard montrant 0
- **Cause**: Le frontend appelait `/api/dashboard/stats` mais le endpoint n'existait pas (c'était `/api/stats`)
- **Fix**: Création du nouveau router `/app/backend/routers/dashboard.py` avec:
  - `GET /api/dashboard/stats` - Stats complètes du dashboard
  - `GET /api/dashboard/alerts` - Alertes (factures en retard, interventions non démarrées)
  - `GET /api/dashboard/recent` - Activité récente (interventions, devis, factures)
- **Fichiers**: `/app/backend/routers/dashboard.py` (nouveau), `/app/backend/server.py`, `/app/frontend/src/pages/Rapports.jsx`

### P1 - Corrigés ✅ (2026-04-03)

#### Bug 5: Photos & Notes incluses dans les Devis PDF
- **Fix**: `generate_devis_pdf()` accepte maintenant `intervention_photos` et `intervention_notes` 
- **Fichiers**: `/app/backend/pdf_generator.py`, `/app/backend/routers/devis.py`

#### Bug 6: QR Code Facture fonctionnel
- **Fix**: Le QR code contient maintenant le `portal_url` (lien de paiement en ligne)
- **Fichiers**: `/app/backend/routers/factures.py`, `/app/backend/pdf_generator.py`

### P2 - Corrigés ✅ (2026-04-03)

#### Bug 7: Super Admin UI - Contraste amélioré
- **Fix**: Badges avec couleurs sombres (bg-slate-700, bg-blue-900/50) et texte clair
- **Fichiers**: `/app/frontend/src/pages/SuperAdminDashboard.jsx`

### Nouvelles Fonctionnalités - 2026-04-03

#### Système de Notifications Temps Réel (SSE)
- **Endpoint**: `GET /api/events/stream?token={jwt_token}`
- **Events**: intervention_created, intervention_started, intervention_completed, intervention_claimed, devis_created, devis_signed, facture_created, facture_paid, sync_required
- **Fichiers**: `/app/backend/realtime_events.py`, `/app/frontend/src/hooks/useRealtimeEvents.js`
- **Intégration Frontend**: Dashboard.jsx et TechnicianApp.jsx utilisent le hook pour auto-refresh

#### Bug 2 RÉSOLU: Sync Dashboard ↔ App Tech en temps réel
- **Solution**: SSE intégré dans Dashboard.jsx et TechnicianApp.jsx
- Dashboard rafraîchit automatiquement lors des changements d'interventions/devis/factures
- TechnicianApp reçoit notifications push pour nouvelles assignations

#### Performance: Indexes MongoDB créés
- **Script**: `/app/backend/create_indexes.py`
- **Indexes créés**:
  - interventions: 9 indexes (date_prevue, statut, technicien_id, client_id, composés)
  - factures: 10 indexes (paye, statut, date_echeance, composés)
  - devis: 8 indexes (statut, client_id, created_at)
  - clients: 6 indexes (email, nom, portal_token)
  - users: 5 indexes (email, role)

### P2 - Backlog restant

- [x] Flux création devis technicien (section dédiée dans App Tech) ✅ FAIT
- [x] Personnalisation admin non reflétée dans App Tech ✅ FAIT
- [x] Chat temps réel Admin ↔ Tech ✅ FAIT

## 🎨 Rebranding ACTOOS PRO - 2026-04-22

### Nouvelles fonctionnalités livrées

#### 1. Section Devis Technicien avec Signature Client
- **Nouvel onglet "Devis"** dans TechnicianApp avec badge compteur
- **DevisSignatureForm** : Canvas de signature tactile
- **Workflow** : Tech crée devis → Client signe sur tablette/téléphone
- **Fichiers**: `/app/frontend/src/pages/TechnicianApp.jsx`

#### 2. Personnalisation Branding dans App Technicien
- Logo entreprise personnalisé dans le header TechnicianApp
- Couleur thème dynamique via CSS variables
- Fallback vers logo ACTOOS PRO si pas de personnalisation
- **Fichiers**: `/app/frontend/src/pages/TechnicianApp.jsx`

#### 3. Chat Temps Réel Admin ↔ Tech
- **Backend**: `/app/backend/routers/chat.py`
  - `GET /api/chat/conversations` - Liste conversations
  - `GET /api/chat/messages/{user_id}` - Historique messages
  - `POST /api/chat/messages` - Envoi message
  - `GET /api/chat/unread-count` - Messages non lus
- **Frontend**: `/app/frontend/src/components/ChatWidget.jsx`
  - FloatingChatButton pour TechnicianApp
  - ChatButton dans TopBar Dashboard Admin
  - MessageThread avec groupage par date
- **SSE Event**: `chat_message` pour notifications temps réel

### Logos ACTOOS PRO (Vert)
- **Dossier**: `/app/frontend/public/branding/`
- **Logo principal**: `actoos-pro-logo.png` (vert sur blanc)
- **Icône**: `actoos-pro-icon.png` (icône A verte)
- **Version dark**: `actoos-pro-logo-dark.png`
- **Icons PWA**: `pwa-icon-{72,96,128,144,152,192,384,512}.png`
- **Favicon**: `favicon.png` (32x32)
- **Apple touch**: `apple-touch-icon.png` (180x180)

### Design System ACTOOS PRO
- **Couleur primaire**: `#22C55E` (Green-500)
- **Slogan**: "Run your business. Simply."
- **Fond**: Blanc
- **Texte**: Noir/Gris foncé
- **Manifest PWA**: theme_color mis à jour

### Plan futur - Migration vers pro.actoos.com
- [ ] Audit complet de l'existant
- [ ] Mise en place sous-domaine pro.actoos.com
- [ ] Plan de migration progressive MongoDB → PostgreSQL
- [ ] Vitrine actoos.com séparée
- [ ] ACTOOS EATS (nouveau produit)
