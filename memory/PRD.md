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
- [x] Génération PDF (devis, factures, rapports d'intervention)
- [x] Signatures électroniques (devis + fin intervention)
- [x] **Photos terrain avec upload cloud et tags (avant/pendant/après)**
- [x] **2FA - Authentification à deux facteurs (TOTP & Email)**
- [x] **Notes d'intervention (terrain + internes)**
- [x] **Rapport PDF d'intervention complet**

### Abonnements & Paiements
- [x] Stripe Checkout (mode LIVE)
- [x] 14 jours d'essai gratuit
- [x] Webhooks Stripe fonctionnels
- [x] Upgrade/Downgrade de plans
- [x] Résiliation avec feedback
- [x] Feature gating par plan
- [x] **Toggle mensuel/annuel avec -20% discount**
- [x] **Paiements Partiels Factures** - Enregistrer plusieurs versements, statut 'partiel'
- [x] **Historique Paiements** - Audit trail complet des transactions
- [x] **Relances Intelligentes** - Rappels avec montant restant uniquement
- [x] **Reçu de Paiement PDF** - Génération automatique après chaque paiement

### Workflow Devis → Facture
- [x] **Auto-génération Facture** - Création et envoi automatique lors signature devis (Pro/Enterprise)
- [x] **Conversion manuelle** - Option conservée pour plan Startup

### Invitations Techniciens
- [x] **Invitation par SMS** - Code unique 6 chiffres envoyé par SMS
- [x] **Inscription par téléphone** - Techniciens s'inscrivent avec leur numéro + code
- [x] **Login par téléphone** - Connexion alternative avec numéro + mot de passe
- [x] **Gestion invitations** - Liste, annulation, renvoi SMS (admin)

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
- [x] **Authentification à deux facteurs (2FA)**
- [x] **Mode Démo Cohérent et Professionnel**
- [x] **Mode Démo 24h** - Réinitialisation toutes les 24h (au lieu de chaque session)
- [x] **Cohérence Paramètres Documents (Devis/Factures)**
- [x] **Cohérence Données Rapports vs Analytics**
- [x] **Affichage Ajouter un Site (responsive + validation)**
- [x] **Relevés de Compte (N° factures, recherche, partage)**
- [x] **Archivage Client (soft delete, restore, permanent delete)**
- [x] **QR Code Paiement (validation infos entreprise, EPC SEPA)**
- [x] **Workflow Interventions: Photos avec tags, Notes, Rapport PDF, Signature obligatoire**
- [x] **Workflow Interventions Non Attribuées: Section Disponibles, détails avant claim, unclaim, sync temps réel**
- [x] **Validation Signature Enrichie: type signataire (client/tiers), relation, email/tel, device info, géoloc**
- [x] **Workflow par Plan: Pro/Enterprise=auto-validation, Startup=validation admin manuelle**
- [x] **Paiements Partiels: Admin peut enregistrer plusieurs versements, Client Portal affiche reste dû**

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

### 2026-05-05 - Paiements Partiels & Relances Intelligentes (P0/P1)
- **Paiements Partiels Factures** :
  - `POST /api/factures/{id}/pay` - Enregistrer un paiement partiel ou total
  - `GET /api/factures/{id}/payments` - Historique complet des paiements
  - Statut automatique: `emise` → `partiel` (si paiement < total) → `payee` (si soldée)
  - Collection `invoice_payments` pour audit trail des transactions
  - Dashboard Admin: dialog paiement avec montant restant pré-calculé
  - Client Portal: colonne "Reste dû" + bouton "Payer X€" avec montant restant
- **Relances Intelligentes** :
  - `POST /api/factures/{id}/relance` supporte statut `partiel`
  - Email/SMS/WhatsApp mentionnent uniquement le `reste_a_payer`
  - Lien de paiement personnalisé ou portail client
- **UI Améliorée** :
  - Badge "Paiement partiel" en orange/ambre dans la liste des factures
  - Section "Payé" et "Reste dû" dans le détail de facture
  - CSS `.status-partiel` ajouté dans index.css
- **Tests validés** : 100% backend (15/15), 100% frontend (iteration_43)

### 2026-05-05 - Validation Signature & Workflow par Plan (P0)
- **Signature enrichie avec traçabilité** :
  - Type de signataire: `client` ou `tiers` (autre personne)
  - Relation avec client si tiers: conjoint, collègue, réceptionniste, famille, etc.
  - Email/téléphone signataire (optionnels)
  - Device info, IP, user-agent capturés automatiquement
  - Géolocalisation lors de la signature
- **Workflow différencié par plan** :
  - Pro/Enterprise: signature → `terminee` (auto-validation)
  - Startup: signature → `en_validation` → validation admin → `terminee`
- **Endpoints admin** :
  - `POST /api/interventions/{id}/validate` - Valider et terminer
  - `POST /api/interventions/{id}/reject-validation` - Rejeter avec motif (retour en_cours)
  - `GET /api/interventions/pending-validation` - Liste des interventions à valider
- **UI améliorée** :
  - SignaturePad avec sélecteur "Le client" / "Autre personne"
  - Dropdown relation obligatoire si tiers
  - Préremplissage nom/email/tel du client
  - Dashboard: filtrer par "En validation", boutons Valider/Rejeter
- **Tests validés** : 100% backend (18/18), 100% frontend (iteration_42)

### 2026-05-05 - Workflow Interventions Non Attribuées (P0)
- **Nouveau système d'interventions disponibles** :
  - `GET /api/interventions/available` - Liste des interventions non assignées (filtré par compétences)
  - `GET /api/interventions/available/count` - Compteur pour badge
  - `POST /api/interventions/{id}/claim` - Accepter une intervention (protection race condition)
  - `POST /api/interventions/{id}/unclaim` - Annuler l'acceptation (retour au pool disponible)
- **App Technicien - Nouvel onglet "Disponibles"** :
  - Badge avec compteur d'interventions en attente
  - Vue liste avec cartes détaillées (badges Disponible/Priorité, client, adresse, durée)
  - Modal détaillé AVANT acceptation : infos complètes + boutons "Accepter cette mission" / "Retour"
  - Bouton "Annuler mon acceptation" pour interventions planifiées assignées
- **Synchronisation temps réel** : Mise à jour automatique via SSE lors de claim/unclaim
- **Tests validés** : 95% backend, 100% frontend (iteration_41)

### 2026-05-05 - Refonte Workflow Interventions
- **Upload Photos avec Tags** :
  - Correction URL endpoint: `/api/photos/interventions/{id}` (corrigé depuis `/interventions/{id}/photos`)
  - Tags disponibles: `avant`, `pendant`, `après`, `autre`
  - Tag automatique basé sur le statut de l'intervention
  - Composant PhotoUpload amélioré avec dropdown de sélection
  - Groupement visuel des photos par tag
  - Suppression photo avec soft delete
- **Notes d'Intervention** :
  - `POST /api/interventions/{id}/notes` - Mise à jour notes
  - `notes_terrain` - Notes du technicien (visible terrain)
  - `notes_internes` - Notes admin (privées)
  - Admins peuvent modifier les deux, techniciens seulement notes_terrain
- **Rapport PDF d'Intervention** :
  - `GET /api/interventions/{id}/report/pdf` - Génération rapport complet
  - Inclut: infos entreprise/client, détails intervention, horaires, technicien, notes, checklist, photos, signature
  - Design professionnel avec sections colorées
  - Bouton "Rapport PDF" dans Dashboard et App Technicien pour interventions terminées
- **Workflow Signature** :
  - Endpoint `complete-with-signature` fonctionnel avec géolocalisation
  - SignaturePad obligatoire avant completion dans TechnicianApp
  - Nom signataire et date enregistrés
- **Tests validés** : 94% backend (16/17), 100% frontend

### 2026-05-05 - Paiements Partiels & Relances Intelligentes (P0/P1)
- **Paiements Partiels Factures** :
  - `POST /api/factures/{id}/pay` - Enregistrer un paiement partiel ou total
  - `GET /api/factures/{id}/payments` - Historique complet des paiements
  - Statut automatique: `emise` → `partiel` (si paiement < total) → `payee` (si soldée)
  - Collection `invoice_payments` pour audit trail des transactions
  - Dashboard Admin: dialog paiement avec montant restant pré-calculé
  - Client Portal: colonne "Reste dû" + bouton "Payer X€" avec montant restant
- **Relances Intelligentes** :
  - `POST /api/factures/{id}/relance` supporte statut `partiel`
  - Email/SMS/WhatsApp mentionnent uniquement le `reste_a_payer`
  - Lien de paiement personnalisé ou portail client
- **UI Améliorée** :
  - Badge "Paiement partiel" en orange/ambre dans la liste des factures
  - Section "Payé" et "Reste dû" dans le détail de facture
  - CSS `.status-partiel` ajouté dans index.css
- **Tests validés** : 100% backend (15/15), 100% frontend (iteration_43)

### 2026-05-05 - Mode Démo 24h + Auto-Facture + Invitations Techniciens + Reçu PDF
- **Mode Démo 24h** :
  - Réinitialisation automatique toutes les 24 heures (au lieu de chaque session)
  - Paramètre `force=true` pour forcer réinitialisation manuelle
  - Indicateur temps restant avant prochaine réinit
  - Bannière mise à jour "Données conservées 24h"
- **Workflow Devis → Facture Auto-génération (Pro/Enterprise)** :
  - `POST /api/devis/{id}/sign` auto-crée la facture pour Pro/Enterprise
  - Facture marquée `auto_generated=true`, `converted_from_devis=true`
  - Auto-émission avec notification email/SMS
  - Plan Startup: conversion manuelle conservée
- **Invitations Techniciens par SMS/Téléphone** :
  - `POST /api/users/invite` - Créer invitation avec code 6 chiffres
  - `GET /api/users/invites` - Liste toutes les invitations (admin)
  - `DELETE /api/users/invites/{id}` - Annuler invitation
  - `POST /api/users/invites/{id}/resend` - Renvoyer SMS d'invitation
  - `POST /api/auth/tech/verify-code` - Vérifier validité code
  - `POST /api/auth/tech/register` - S'inscrire avec téléphone + code
  - `POST /api/auth/tech/login` - Se connecter avec téléphone + mot de passe
  - Collection `tech_invites` pour suivi des invitations
  - Code valide 48 heures
- **Reçu de Paiement PDF** :
  - `GET /api/factures/{id}/payments/{payment_id}/receipt` - Générer PDF
  - Design professionnel avec infos entreprise, client, paiement
  - Récapitulatif facture: total, payé, reste dû
  - Indicateur visuel "FACTURE SOLDÉE" ou "SOLDE RESTANT"

### 2026-05-05 - Cohérence Globale Plans & Tarifs (P0 CRITIQUE)
- **Mise à jour tarifs officiels** :
  - Startup: 19,99€/mois (191,90€/an -20%)
  - Pro: 49,99€/mois (479,90€/an -20%)
  - Entreprise: 89,99€/mois (863,90€/an -20%)
- **Correction limites plans** :
  - Startup: 1 admin, 3 techs (+5€/tech), 1 catégorie
  - Pro: 3 admins, 10 techs (+5€/tech), **4 catégories** (corrigé de 3)
  - Entreprise: Illimité tout, techs inclus
- **SMS inclus par plan** :
  - Startup: 0 SMS/mois
  - Pro: 50 SMS/mois
  - Entreprise: 500 SMS/mois
- **Plan Entreprise paiement direct** :
  - Bouton "S'abonner →" (au lieu de "Nous contacter")
  - Souscription via Stripe comme les autres plans
- **Migration DB** :
  - Mise à jour `plan_limits` de toutes les entreprises existantes
  - Synchronisation `max_categories` Pro = 4
- **Tests validés** : 100% backend (23/23), 100% frontend

### 2026-05-05 - Archivage Client + QR Code Paiement
- **Système d'archivage client** :
  - `DELETE /api/clients/{id}` - Archive le client (soft delete)
  - `POST /api/clients/{id}/restore` - Restaure un client archivé
  - `DELETE /api/clients/{id}/permanent` - Suppression définitive (requiert archivage préalable)
  - `GET /api/clients?archived_only=true` - Liste les clients archivés
  - `GET /api/clients/archived/count` - Nombre de clients archivés
  - Champs ajoutés: `archived`, `archived_at`, `archived_by`, `restored_at`, `restored_by`
  - Suppression définitive cascade : interventions, devis, factures, sites, photos, communications
- **Frontend archivage** :
  - Bouton "Voir archivés (X)" dans la liste clients
  - Bannière d'alerte sur client archivé
  - Boutons Restaurer / Supprimer définitivement
  - Dialog de confirmation pour suppression permanente
- **QR Code Paiement** :
  - `GET /api/entreprise/qr-validation` - Valide les infos entreprise requises
  - Champs requis: nom, email, telephone, adresse, ville, code_postal
  - Champs recommandés: iban, siret
  - Format EPC QR (European Payments Council) pour virements SEPA si IBAN présent
  - Fallback sur URL portail ou infos texte si pas d'IBAN

### 2026-04-28 - Affichage Sites + Relevés de Compte
- **Formulaire Ajouter un Site amélioré** :
  - Validation avec messages d'erreur clairs (champs obligatoires)
  - Layout responsive `sm:grid-cols-2` pour Code postal/Ville et Téléphone/Email
  - `max-h-[65vh] overflow-y-auto` pour scroll sur petits écrans
  - Composant `Separator` pour séparer les sections
- **Relevés de compte - Corrections** :
  - `numero_facture` utilisé au lieu de `numero` (plus de "N/A")
  - `total_ttc` au lieu de `montant_ttc`
  - `statut == 'payee'` au lieu de `paye == True`
  - Gestion du statut "Annulée"
- **Relevés de compte - Recherche** :
  - Barre de recherche fonctionnelle
  - Filtre par nom client et email
  - Affichage "X/Y" résultats
- **Relevés de compte - Partage** :
  - Bouton Share dropdown ajouté
  - Options : WhatsApp, Email, SMS, Copier le lien
  - Partage natif sur mobile (navigator.share)
  - Messages pré-remplis avec nom client et lien

### 2026-04-28 - Cohérence Données Rapports vs Analytics
- **Single Source of Truth implémentée** :
  - `/api/stats` refactorisé pour utiliser la même logique de calcul que `analytics_service.py`
  - Anciens champs incorrects (`paye: True`, `montant_ttc`) remplacés par les champs corrects (`statut: "payee"`, `total_ttc`)
- **Nouvelles métriques ajoutées à /stats** :
  - `techniciens_actifs` - Compte des techniciens actifs
  - `devis.total`, `devis.en_attente`, `devis.signes`, `devis.montant_total`
  - `factures.en_attente`, `factures.payees_mois`, `factures.en_retard`, `factures.pending_amount`, `factures.montant_moyen`
  - `taux_conversion` - Calculé comme `(devis_signes / devis_total) * 100`
- **Frontend Rapports.jsx mis à jour** :
  - Utilise les nouveaux noms de champs unifiés
  - KPIs avec données en temps réel
  - Tunnel de conversion avec pourcentages calculés dynamiquement
  - Section Résumé avec toutes les statistiques globales
- **Données vérifiées cohérentes** :
  - Clients: 13 (stats) = 13 (analytics) ✅
  - Devis: 7 total, 4 signés, 57.1% conversion ✅
  - Factures: 2 en attente, 300€ ✅
  - Interventions: 2 terminées ✅

### 2026-04-28 - Cohérence Paramètres Documents (Devis/Factures)
- **Nouveaux champs dans les paramètres documents** :
  - `message_client_devis` - Message par défaut pour les devis
  - `message_client_facture` - Message par défaut pour les factures
  - `validite_devis_jours` - Validité par défaut des devis
- **Logique de priorité implémentée** :
  - Valeur locale (dans le devis/facture) > Valeur globale (paramètres)
  - Si non défini localement, utilise la valeur des paramètres
- **Endpoints backend** :
  - `GET /api/settings/documents/defaults/devis` - Valeurs par défaut pour création devis
  - `GET /api/settings/documents/defaults/facture` - Valeurs par défaut pour création facture
- **Frontend amélioré** :
  - Formulaire de création de devis pré-rempli avec les paramètres globaux
  - Nouveaux champs dans Settings → Documents (Message au client, Validité)
  - Description mise à jour "(sauf si modifié localement)"
- **Génération PDF** :
  - Le champ `message_client` est maintenant affiché dans le PDF des devis

### 2026-04-28 - Mode Démo Cohérent et Professionnel
- **Réinitialisation automatique des données** :
  - Endpoint `POST /api/demo/init` réinitialise toutes les données à chaque connexion
  - Création automatique de données seed : 3 clients, 4 catégories, 1 technicien, 3 interventions, 1 devis
  - Les données ne sont pas conservées entre les sessions
- **Bannière démo professionnelle** :
  - Titre "Mode démonstration actif"
  - Message explicatif clair
  - Liste des fonctionnalités simulées (Emails, SMS/WhatsApp, Paiements, Données non persistantes)
  - Bouton CTA "Démarrer l'essai gratuit" (vert)
  - Bouton X pour quitter la démo
- **Contexte React DemoContext** :
  - Hook `useDemo()` pour accéder aux infos de démo
  - Méthodes : `initDemoSession`, `simulateAction`, `checkFeature`, `exitDemo`
  - Messages de restriction personnalisés
- **Page de chargement démo améliorée** :
  - Design moderne avec indicateurs d'étapes
  - Feedback visuel pendant l'initialisation
  - Réinitialisation automatique avant connexion
- **Endpoints Backend** :
  - `POST /api/demo/init` - Réinitialiser les données démo
  - `GET /api/demo/status` - Statut du mode démo
  - `GET /api/demo/feature-check/{feature}` - Vérifier disponibilité fonctionnalité
  - `POST /api/demo/simulate-action` - Simuler une action (email, SMS, etc.)
- **Messages de restriction professionnels** :
  - Remplacement des prix obsolètes (79€ → messages génériques)
  - Messages incitatifs pour pousser à l'abonnement

### 2026-04-22 - Authentification à Deux Facteurs (2FA)
- **2FA TOTP (Google Authenticator)** :
  - Génération QR code avec pyotp/qrcode
  - Secret key pour saisie manuelle
  - Validation avec tolérance de 1 fenêtre temporelle
- **2FA Email OTP** :
  - Code à 6 chiffres envoyé par email
  - Expiration après 5 minutes
  - Template email sécurisé
- **Codes de récupération** :
  - 8 codes générés lors de l'activation
  - Utilisables une seule fois
  - API de régénération
- **Endpoints 2FA** :
  - `GET /api/2fa/status` - Statut actuel
  - `POST /api/2fa/setup/start` - Démarrer configuration
  - `POST /api/2fa/setup/verify` - Valider et activer
  - `POST /api/2fa/verify-login` - Vérification lors du login
  - `POST /api/2fa/send-login-code` - Renvoyer code email
  - `POST /api/2fa/disable` - Désactiver 2FA
  - `GET /api/2fa/backup-codes` - Compter codes restants
  - `POST /api/2fa/regenerate-backup-codes` - Nouveaux codes
- **Interface utilisateur** :
  - Composant `TwoFactorSettings.jsx` dans Paramètres → Sécurité
  - Composant `TwoFactorVerify.jsx` pour le flux de connexion
  - `LoginPage` gère le flux 2FA automatiquement
  - `AuthContext` avec `complete2FALogin()` pour finaliser la connexion 2FA

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
