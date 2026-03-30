# Actoos - SaaS Gestion d'Interventions Terrain (anciennement FieldCommand)

## Problem Statement
SaaS multi-tenant pour entreprises de services (plomberie, électricité, maintenance, BTP, nettoyage) avec:
- Dashboard Admin pour pilotage entreprise
- Application technicien pour terrain (PWA)
- Portail client pour signature devis
- White-labeling (logo + couleurs par tenant)

## What's Implemented

### Phases 1-10 ✅ (Sessions précédentes)
- Multi-tenant, Auth JWT, CRUD complet
- PDF génération, Emails, Dashboard
- Planning drag-drop, App Technicien PWA
- SMS Twilio, Rapports, Paramètres

### Phase 11 - Corrections Finales ✅
- [x] Téléchargement PDF (méthode blob)
- [x] Signature visible dans devis/factures/PDF
- [x] Timezone Paris
- [x] Sélection multiple + batch delete
- [x] Annulation intervention

### Phase 12 - Bugs P0 App Technicien ✅ (Date: 2026-03-30)

#### Bugs corrigés
- [x] **Menu Profil** - Dropdown avec nom/email utilisateur + bouton "Se déconnecter" séparé (au lieu de logout direct)
- [x] **Création interventions/devis** - Techniciens peuvent créer interventions et devis via formulaires intégrés
- [x] **Navigation mobile** - Padding-bottom ajouté pour éviter le badge Emergent

#### Nouveaux composants TechnicianApp
- `ProfileMenu` - DropdownMenu avec infos utilisateur
- `CreateInterventionForm` - Formulaire création intervention (client, titre, date, durée, priorité)
- `CreateDevisForm` - Formulaire création devis avec lignes, calcul TVA automatique

### Phase 13 - Assignation Intelligente ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **Interventions disponibles** - Si technicien_id=null, l'intervention est visible par tous les techs
- [x] **Badge "Disponible"** - Badge orange avec animation pulse sur les interventions non assignées
- [x] **Bouton "Accepter cette mission"** - Permet au tech de réclamer l'intervention
- [x] **Endpoint /claim** - POST /api/interventions/{id}/claim assigne au premier tech qui clique
- [x] **Gestion des conflits** - Retourne 409 si l'intervention est déjà prise
- [x] **Notification SMS** - Envoie SMS aux techs quand une nouvelle intervention disponible est créée (si Twilio configuré)

#### Endpoints ajoutés
- `GET /api/interventions/available` - Liste les interventions non assignées
- `POST /api/interventions/{id}/claim` - Réclamer une intervention disponible
- `GET /api/interventions/today` - Modifié pour inclure les interventions disponibles pour les techs
- `GET /api/interventions?include_available=true` - Paramètre pour inclure les disponibles

### Phase 14 - Catégories avec Checklists Dynamiques ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **6 catégories par défaut** - Plomberie, Électricité, Nettoyage, Climatisation, BTP, Maintenance
- [x] **Checklists dynamiques** - Chaque catégorie a son template de checklist (checkbox, text, number, photo)
- [x] **Sélecteur de catégorie** - Dans le formulaire de création d'intervention avec couleurs
- [x] **Affichage checklist** - Dans les détails de l'intervention avec les items à remplir
- [x] **Sauvegarde checklist** - Les techniciens peuvent remplir et sauvegarder la checklist
- [x] **Auto-seeding** - Les catégories sont créées automatiquement lors du premier appel

#### Endpoints ajoutés
- `GET /api/categories` - Liste les catégories de l'entreprise
- `GET /api/categories/{id}` - Détails d'une catégorie avec son checklist_template
- `POST /api/categories` - Créer une nouvelle catégorie (admin)
- `PUT /api/categories/{id}` - Modifier une catégorie (admin)
- `PUT /api/interventions/{id}/checklist` - Sauvegarder les réponses de checklist

#### Modèles ajoutés
- `Categorie` - code, nom, icone, couleur, checklist_template
- `ChecklistItem` - id, label, type (checkbox/text/number/photo), required
- `ChecklistResponse` - item_id, checked, value, completed_at

### Phase 15 - EXIF Stripping & Historique Communications ✅ (Date: 2026-03-30)

#### EXIF Stripping (Confidentialité photos)
- [x] **Suppression EXIF** - Les métadonnées GPS sont supprimées des photos avant stockage
- [x] **Compression** - Images redimensionnées (max 1920px) et compressées (qualité 85, max 500KB)
- [x] **Validation** - Vérification que le fichier est une image valide avant traitement

#### Historique Communications
- [x] **Logging emails** - Chaque email envoyé (devis, facture, relance) est enregistré
- [x] **Logging SMS** - Chaque SMS envoyé est enregistré
- [x] **Historique par client** - Vue des communications envoyées à un client
- [x] **Statistiques** - Compteur emails/SMS envoyés, livrés, échoués

#### Endpoints ajoutés
- `GET /api/clients/{id}/communications` - Historique communications d'un client
- `GET /api/communications` - Liste toutes les communications
- `GET /api/communications/stats` - Statistiques des communications

#### Fichiers créés
- `/app/backend/image_utils.py` - Fonctions EXIF stripping et compression
- `/app/backend/communication_log.py` - Service de logging des communications

### Phase 16 - Stripe Onboarding SaaS ✅ (Date: 2026-03-30)

#### Plans d'abonnement
- [x] **Starter** (29€/mois) - 3 techniciens, 100 interventions/mois, 1 catégorie, support email
- [x] **Pro** (79€/mois) - 10 techniciens, illimité, toutes catégories, 100 SMS, support prioritaire
- [x] **Enterprise** (199€/mois) - Illimité, white-labeling, support 24/7, API accès

#### Flux d'inscription
- [x] **Page Pricing** (`/pricing`) - Affichage des 3 plans avec features et prix
- [x] **Page Signup** (`/signup?plan=xxx`) - Formulaire nom entreprise + email admin
- [x] **Stripe Checkout** - Paiement sécurisé via hosted checkout Stripe
- [x] **Création automatique** - Compte entreprise + admin créés après paiement réussi
- [x] **Email de bienvenue** - Credentials envoyés par email

#### Endpoints ajoutés
- `GET /api/plans` - Liste des plans d'abonnement (public)
- `POST /api/checkout/session` - Créer une session Stripe Checkout
- `GET /api/checkout/status/{session_id}` - Statut du paiement
- `POST /api/webhook/stripe` - Webhook Stripe pour événements paiement
- `GET /api/subscription/current` - Abonnement actuel de l'entreprise

#### Fichiers créés
- `/app/backend/subscription_service.py` - Définition des plans et limites
- `/app/frontend/src/pages/Pricing.jsx` - Pages Pricing, Signup, Success

### Phase 17 - Branding Actoos & White-labeling ✅ (Date: 2026-03-30)

#### Branding Officiel Actoos
- [x] **Logo favicon** - "A" géométrique bleu (`/actoos-favicon.png`)
- [x] **Logo avec texte** - Actoos (`/actoos-logo.jpg`)
- [x] **Logo avec slogan** - "Le logiciel tout-en-un pour piloter vos opérations terrain" (`/actoos-logo-slogan.png`)
- [x] **Manifest PWA** - Mis à jour avec icônes Actoos et couleur thème #2563EB

#### Pages mises à jour
- [x] **Login** - Logo avec slogan
- [x] **Pricing** - Logo + slogan en hero
- [x] **Dashboard** - Logo "A" dans la sidebar
- [x] **App Technicien** - Logo "A" dans le header

#### White-labeling (Paramètres > Personnalisation)
- [x] **Upload logo entreprise** - Stockage cloud, EXIF stripping automatique
- [x] **Sélecteur de couleur** - Color picker + presets (6 couleurs)
- [x] **Aperçu en temps réel** - Prévisualisation du branding

#### Endpoints ajoutés
- `POST /api/entreprise/logo` - Upload logo entreprise
- `PUT /api/entreprise/branding` - Mise à jour couleur primaire

### Phase 18 - PDF avec Logo/QR Code & Injection CSS Couleurs ✅ (Date: 2026-03-30)

#### PDF Génération Améliorée
- [x] **Logo entreprise sur Devis** - Le logo_url du tenant s'affiche en haut à gauche du PDF
- [x] **Logo entreprise sur Factures** - Même affichage que les devis
- [x] **QR Code paiement** - QR code généré sur les factures non payées (contient infos paiement)
- [x] **Design responsive** - Tableau logo + infos entreprise pour un rendu professionnel
- [x] **Factures payées** - Affichent "PAYÉE" en vert au lieu du QR code

#### Injection CSS Dynamique (White-labeling)
- [x] **Variables CSS** - `--tenant-primary`, `--primary` (HSL), `--tenant-primary-rgb` injectées dynamiquement
- [x] **AuthContext hook** - useEffect surveille `entreprise.couleur_primaire` et met à jour le DOM
- [x] **Classes utilitaires** - `.bg-tenant-primary`, `.text-tenant-primary`, `.border-tenant-primary`, etc.
- [x] **Shadcn compatible** - La variable `--primary` est en format HSL pour compatibilité Shadcn UI

#### Fonctions ajoutées (pdf_generator.py)
- `generate_qr_code(data, size)` - Génère image QR code avec la lib `qrcode`
- `load_logo_image(logo_url, max_width, max_height)` - Télécharge et redimensionne le logo
- `build_payment_qr_data(facture, entreprise, portal_url)` - Construit les données de paiement

#### Tests Validés
- Backend: 11/12 tests passés (1 ignoré - pas de facture payée)
- Frontend: 100% tests branding UI passés
- CSS injection vérifié: --tenant-primary change après sauvegarde couleur

### Phase 19 - Portail Client Web ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **Dashboard client** - Page publique accessible via token unique `/portal/client/{token}`
- [x] **Cartes résumé** - Total devis, en attente, factures, montant dû
- [x] **Onglet Aperçu** - Vue d'ensemble avec derniers devis, factures et interventions
- [x] **Onglet Devis** - Tableau complet avec signature en ligne via lien direct
- [x] **Onglet Factures** - Tableau avec téléchargement PDF
- [x] **Branding tenant** - Logo et couleur primaire affichés sur le portail
- [x] **Génération lien portail** - Bouton sur la fiche client pour obtenir/copier le lien

#### Endpoints ajoutés
- `GET /api/portal/client/{token}` - Dashboard client complet (public)
- `GET /api/portal/facture/{id}?token=xxx` - Détail facture (public)
- `GET /api/portal/facture/{id}/pdf?token=xxx` - PDF facture (public)
- `GET /api/clients/{id}/portal-link` - Obtenir/générer lien portail (auth)

#### Modèle modifié
- `Client` - Ajout du champ `portal_token` (UUID unique par client)

#### Tests Validés
- Backend: 15/15 tests passés (100%)
- Frontend: 100% tests portal UI passés

### Phase 20 - Notifications Push PWA ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **Service Worker push** - Réception et affichage des notifications
- [x] **Bouton toggle** - Activer/désactiver notifications dans l'app technicien
- [x] **VAPID keys** - Authentification sécurisée des notifications
- [x] **Inscription push** - Stockage des subscriptions par utilisateur
- [x] **Test notification** - Envoi de notification test pour vérification
- [x] **Intégration Smart Assignment** - Notification auto quand nouvelle mission disponible

#### Endpoints ajoutés
- `GET /api/push/vapid-key` - Clé publique VAPID (public)
- `POST /api/push/subscribe` - Inscription aux notifications (auth)
- `DELETE /api/push/unsubscribe` - Désinscription (auth)
- `GET /api/push/status` - Statut d'inscription (auth)
- `POST /api/push/test` - Envoyer notification test (auth)

#### Fichiers ajoutés
- `/app/backend/push_service.py` - Service notifications (pywebpush)
- `/app/frontend/src/hooks/usePushNotifications.js` - Hook React

#### Service Worker (sw.js)
- Gestionnaire `push` pour recevoir les notifications
- Gestionnaire `notificationclick` pour ouvrir l'app au clic
- Affichage natif avec titre, corps, icône et vibration

#### Tests Validés
- Backend: 13/13 tests passés (100%)
- Frontend: 100% tests push UI passés

### Phase 21 - Paiement en ligne Stripe (Portail Client) ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **Bouton "Payer"** - Sur chaque facture non payée avec montant > 0
- [x] **Montant affiché** - Bouton affiche "Payer 120,00€" avec le montant dû
- [x] **Stripe Checkout** - Redirection vers page de paiement sécurisée
- [x] **Traitement automatique** - Facture marquée "payée" après paiement
- [x] **Email de confirmation** - Envoyé automatiquement au client
- [x] **Gestion erreurs** - Factures à 0€ ou déjà payées n'affichent pas le bouton

#### Endpoints ajoutés
- `POST /api/portal/facture/{id}/pay?token=xxx` - Créer session Stripe Checkout
- `GET /api/portal/facture/{id}/payment-status?token=xxx&session_id=xxx` - Vérifier statut

#### Flux de paiement
1. Client clique sur "Payer X€" dans le portail
2. Redirection vers Stripe Checkout (mode test)
3. Paiement par carte
4. Retour au portail avec `?payment=success`
5. Facture marquée comme payée + email de confirmation

#### Tests Validés
- Backend: 11/11 tests passés (100%)
- Frontend: 100% tests payment UI passés

### Phase 22 - Support Offline Avancé (IndexedDB/Dexie.js) ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **IndexedDB avec Dexie.js** - Base de données locale 'ActoosOfflineDB' avec 6 stores
- [x] **Cache interventions** - Stockage automatique quand chargées
- [x] **Cache clients/catégories** - Disponibles hors ligne
- [x] **File d'attente actions** - pendingActions pour sync différée
- [x] **Mises à jour optimistes** - Start/Complete intervention fonctionne offline
- [x] **Auto-sync** - Synchronisation automatique au retour en ligne
- [x] **SyncStatus amélioré** - Affiche temps depuis dernière sync

#### Stores IndexedDB
- `interventions` - Interventions avec indexation technicien_id, statut
- `clients` - Liste clients avec indexation entreprise_id
- `categories` - Catégories avec checklists
- `pendingActions` - Actions en attente de sync
- `pendingPhotos` - Photos à uploader
- `syncMeta` - Métadonnées de synchronisation

#### Action Types supportés
- `start_intervention`, `complete_intervention`
- `update_notes`, `update_checklist`
- `claim_intervention`, `upload_photo`

#### Fichiers ajoutés
- `/app/frontend/src/lib/offlineDb.js` - Wrapper Dexie.js
- OfflineContext.jsx entièrement réécrit avec Dexie

#### Tests Validés
- Frontend: 100% (9/9 tests offline passés)
- IndexedDB: 12 interventions, 6 catégories en cache validés

### Phase 23 - Optimisation Tournées IA ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **Bouton optimisation** - Visible quand 2+ interventions planifiées (icône étoile amber)
- [x] **Modal RouteOptimizerModal** - Interface pour lancer l'optimisation
- [x] **IA GPT-4o** - Analyse adresses, priorités, créneaux et suggère ordre optimal
- [x] **Score de tournée** - Évaluation simple sans IA (0-100)
- [x] **Application de l'ordre** - Bouton pour appliquer la suggestion
- [x] **Fallback gracieux** - Si IA échoue, ordre original retourné

#### Endpoints ajoutés
- `POST /api/interventions/optimize-route` - Optimisation IA
- `GET /api/interventions/route-score` - Score de tournée simple
- `POST /api/interventions/apply-optimized-order` - Appliquer ordre (admin)

#### Fichiers ajoutés
- `/app/backend/route_optimizer.py` - Service d'optimisation avec GPT-4o

#### Format de réponse IA
```json
{
  "optimized_order": ["id1", "id2", ...],
  "total_estimated_time_minutes": 340,
  "route_summary": "Description du parcours optimisé",
  "tips": ["Conseil 1", "Conseil 2"],
  "zones": [{"name": "Zone Nord", "interventions": [...]}],
  "ai_optimized": true
}
```

#### Tests Validés
- Backend: 16/16 tests passés (100%)
- Frontend: 100% UI fonctionne

### Phase 24 - Rapports & Analytics ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **Page Analytics** - Dashboard complet accessible depuis la sidebar
- [x] **4 KPI Cards** - CA, Factures en attente, Interventions, Taux conversion
- [x] **Graphique évolution CA** - Barres sur 30 jours
- [x] **Interventions par statut** - Progress bars colorées avec pourcentages
- [x] **Performance techniciens** - Tableau avec classement et badges
- [x] **Top Clients** - Ranking par chiffre d'affaires
- [x] **Cards résumé** - Devis, Clients, Factures avec détails
- [x] **Sélecteur période** - Semaine, Mois, Trimestre, Année

#### Endpoints ajoutés (admin uniquement)
- `GET /api/analytics/revenue` - Métriques revenus et croissance
- `GET /api/analytics/interventions` - Stats par statut/priorité/catégorie
- `GET /api/analytics/technicians` - Performance des techniciens
- `GET /api/analytics/clients` - Stats clients et top clients
- `GET /api/analytics/devis` - Conversion devis et délais
- `GET /api/analytics/trends` - Données quotidiennes pour graphiques
- `GET /api/analytics/summary` - Résumé complet

#### Fichiers ajoutés
- `/app/backend/analytics_service.py` - Service d'analytics MongoDB
- `/app/frontend/src/pages/Analytics.jsx` - Page dashboard

#### Tests Validés
- Backend: 18/18 tests passés (100%)
- Frontend: 100% UI fonctionnel

### Phase 25 - Skills & Categories Matching ✅ (Date: 2026-03-30)

#### Fonctionnalités
- [x] **Champ skills sur User** - Liste de categorie_id représentant les compétences du technicien
- [x] **Filtrage interventions** - Les techs ne voient que les interventions correspondant à leurs skills
- [x] **Comportement polyvalent** - Un tech sans skills assignés peut voir TOUTES les interventions
- [x] **Notifications qualifiées** - Push/SMS envoyés uniquement aux techs compétents
- [x] **Interface Admin** - Colonne "Compétences" avec badges colorés et bouton d'édition
- [x] **Dialog de gestion** - Multi-sélection avec checkboxes et descriptions des catégories
- [x] **Affichage profil PWA** - "Mes compétences" visible dans le menu profil technicien

#### Endpoints ajoutés
- `PUT /api/users/{id}/skills` - Mise à jour des compétences (admin only)
- `GET /api/users/{id}/skills` - Récupération des compétences avec détails catégories

#### Modifications endpoints existants
- `GET /api/interventions/available` - Filtré par compétences du tech
- `GET /api/interventions/today` - Filtré par compétences du tech
- `GET /api/interventions?include_available=true` - Filtré par compétences

#### Fichiers modifiés
- `/app/backend/models.py` - UserBase.skills, UserSkillsUpdate
- `/app/backend/server.py` - Endpoints skills + filtrage interventions
- `/app/backend/push_service.py` - notify_new_intervention_available_to_techs
- `/app/frontend/src/pages/Techniciens.jsx` - SkillsManager + colonne compétences
- `/app/frontend/src/pages/TechnicianApp.jsx` - ProfileMenu avec skills

#### Tests Validés
- Backend: 16/16 tests passés (100%)
- Frontend: 100% UI fonctionnel

## Configuration requise

### Variables d'environnement Backend (.env)
```
MONGO_URL=mongodb://...
DB_NAME=fieldcommand
RESEND_API_KEY=re_xxxxx
SENDER_EMAIL=onboarding@resend.dev
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx
VAPID_PUBLIC_KEY=BDEosOMy7hCZHnW...
VAPID_PRIVATE_KEY=KzQjovJG3M3RJd...
```

## Credentials Test
- Admin: `admin@testplomberie.fr` / `password123`
- Tech: `tech@testplomberie.fr` / `technicien123`

## Prioritized Backlog

### P0-P2 - Complété ✅
- [x] **Logique assignation intelligente** 
- [x] **Catégories/Modules avec checklists**
- [x] **EXIF stripping photos**
- [x] **Historique communications**
- [x] **Stripe + Onboarding SaaS**
- [x] **White-labeling complet** (logo + couleur primaire)
- [x] **Portail Client Web** (devis/factures/interventions)
- [x] **Notifications Push PWA**
- [x] **Paiement en ligne Stripe** (portail client)
- [x] **Support Offline Avancé** (IndexedDB/Dexie.js)
- [x] **Optimisation Tournées IA** (GPT-4o)
- [x] **Rapports et Analytics** (Dashboard business)

### Backlog (Nice to have)
- [x] QR Code paiement sur facture ✅
- [x] Injection CSS dynamique des couleurs dans toute l'interface ✅
- [x] Logo visible sur les PDF générés ✅
- [x] Portail client web (consultation factures/devis, historique) ✅
- [x] Notifications push PWA ✅
- [x] Paiement en ligne via Stripe (sur facture depuis portail) ✅
- [x] Offline avancé (IndexedDB/Dexie.js sync) ✅
- [x] Optimisation tournées IA ✅
- [x] Rapports et analytics avancés ✅
- [x] Skills & Categories Matching (techniciens qualifiés) ✅
- [x] Gestion des catégories (création/édition/suppression par admin) ✅
- [x] Refactoring server.py Phase 1 (3716 → 2831 lignes, 7 routers créés) ✅
- [x] Refactoring server.py Phase 2 (2831 → 2582 lignes, 11 routers total) ✅
- [x] Multi-devises (EUR, USD, XOF, GBP, CHF, CAD, MAD) et sélecteur de locale ✅
- [x] Formatage devise dans Dashboard, Analytics, Devis, Factures ✅
- [x] Export CSV/JSON des rapports Analytics ✅

### Phase 26 - Exports Analytics & Relevés Mensuels ✅ (Date: 2026-03-31)

#### Export Analytics
- [x] **Export PDF Dashboard** - Génération PDF des statistiques complètes
- [x] **Export CSV** - Export données brutes pour analyse externe
- [x] **Sélecteur période** - Export filtré par période sélectionnée

#### Relevés Mensuels (Statements)
- [x] **Page Relevés** (`/statements`) - Interface admin complète
- [x] **Génération par période** - Sélection mois/année avec génération batch
- [x] **PDF par client** - Relevé détaillé avec factures, statuts, totaux
- [x] **Téléchargement individuel** - Bouton PDF par client
- [x] **Envoi groupé par email** - Envoi automatique avec pièce jointe PDF
- [x] **Historique des envois** - Log des relevés envoyés
- [x] **Support multi-devise** - Montants formatés selon devise entreprise

#### Endpoints ajoutés
- `GET /api/statements/generate` - Génère relevés pour tous clients avec factures
- `GET /api/statements/preview/{client_id}` - Télécharge PDF d'un client
- `POST /api/statements/send` - Envoi batch par email
- `GET /api/statements/history` - Historique des envois

#### Fichiers créés
- `/app/backend/statement_generator.py` - Générateur PDF ReportLab
- `/app/backend/routers/statements.py` - Router FastAPI
- `/app/frontend/src/pages/Statements.jsx` - Interface React

### Phase 27 - Refactoring server.py Phase 3 (Architecture Modulaire Complète) ✅ (Date: 2026-03-31)

#### Migrations effectuées
- [x] **Interventions** (~600 lignes) → `/app/backend/routers/interventions.py`
- [x] **Devis** (~250 lignes) → `/app/backend/routers/devis.py`
- [x] **Factures** (~280 lignes) → `/app/backend/routers/factures.py`
- [x] **Portal** (~400 lignes) → `/app/backend/routers/portal.py`
- [x] **SMS** (~130 lignes) → `/app/backend/routers/sms.py`
- [x] **Subscription** (~320 lignes) → `/app/backend/routers/subscription.py`
- [x] **Photos** (~70 lignes) → `/app/backend/routers/photos.py`
- [x] **Rapports** (~150 lignes) → `/app/backend/routers/rapports.py`
- [x] **Audit** → `/app/backend/routers/audit.py`

#### Résultat
- **server.py** réduit de ~2585 lignes à ~235 lignes (réduction de 91%)
- **21 routers modulaires** dans `/app/backend/routers/`
- Architecture maintenable et scalable
- API Version 2.0.0 (Modular Architecture)

### Phase 28 - API Publique pour Intégrations Tierces ✅ (Date: 2026-03-31)

#### Gestion des clés API
- [x] **Création de clés** - Génération sécurisée avec permissions granulaires
- [x] **Révocation** - Désactivation immédiate des clés compromises
- [x] **Permissions** - read, write, webhook, admin
- [x] **Expiration** - Option de validité limitée (30j, 90j, 1an)
- [x] **Tracking** - Dernière utilisation enregistrée

#### Webhooks
- [x] **13 événements** - Interventions, Devis, Factures, Clients
- [x] **Signature HMAC-SHA256** - Sécurité des payloads
- [x] **Test intégré** - Envoi d'événement test
- [x] **Historique livraisons** - Logs des envois
- [x] **Auto-désactivation** - Après 10 échecs consécutifs

#### Endpoints REST externes (v1.1.0)
**Lecture (GET)**
- [x] `GET /api/public-api/v1/clients` - Liste clients paginée
- [x] `GET /api/public-api/v1/clients/{id}` - Détail client
- [x] `GET /api/public-api/v1/clients/by-external-id/{external_id}` - Par ID externe
- [x] `GET /api/public-api/v1/interventions` - Liste interventions
- [x] `GET /api/public-api/v1/interventions/by-external-id/{external_id}` - Par ID externe
- [x] `GET /api/public-api/v1/devis` - Liste devis
- [x] `GET /api/public-api/v1/factures` - Liste factures

**Écriture (POST/PUT/DELETE)**
- [x] `POST /api/public-api/v1/clients` - Créer client
- [x] `PUT /api/public-api/v1/clients/{id}` - Modifier client
- [x] `POST /api/public-api/v1/interventions` - Créer intervention
- [x] `PUT /api/public-api/v1/interventions/{id}` - Modifier intervention
- [x] `DELETE /api/public-api/v1/interventions/{id}` - Annuler intervention

#### Fonctionnalités ERP/CRM
- [x] **external_id** - Champ de liaison avec systèmes externes
- [x] **Détection doublons** - Vérification email et external_id
- [x] **Tracking origine** - `created_via: api`, `api_key_id`
- [x] **Webhooks automatiques** - Déclenchés à chaque création/modification

#### Frontend
- [x] **Page API Settings** (`/dashboard/api-settings`) - Interface complète
- [x] **Documentation intégrée** - Tous endpoints avec exemples curl
- [x] **Onglets** - Clés API, Webhooks, Documentation

#### Fichiers créés/modifiés
- `/app/backend/models_api.py` - Modèles Pydantic API (APIClientCreate, APIInterventionCreate, etc.)
- `/app/backend/webhook_service.py` - Service envoi webhooks
- `/app/backend/routers/public_api.py` - Router API publique (22 endpoints)
- `/app/frontend/src/pages/APISettings.jsx` - Interface admin enrichie

### Phase 29 - Validation Limites Plans & Widget Usage ✅ (Date: 2026-03-31)

#### Backend - Validation des limites
- [x] **plan_limits.py** - Service central de validation des limites
- [x] **check_technician_limit()** - Vérifie limite techniciens avant invitation
- [x] **check_intervention_limit()** - Vérifie limite interventions/mois
- [x] **check_category_limit()** - Vérifie limite catégories
- [x] **get_usage_stats()** - Retourne statistiques d'usage complètes
- [x] **Endpoint /api/usage** - Récupère usage et limites actuels

#### Frontend - Widget d'usage
- [x] **PlanUsageWidget.jsx** - Composant réutilisable
- [x] **Mode compact** - Affichage sidebar/dashboard
- [x] **Mode complet** - Page Settings avec tous les détails
- [x] **Barres de progression** - Visualisation usage vs limite
- [x] **Indicateurs couleur** - Vert/Jaune/Rouge selon usage
- [x] **Dialog upgrade** - Comparaison des plans avec Stripe checkout

#### Intégration
- [x] **Dashboard** - Widget compact en bas de page
- [x] **Settings** - Nouvel onglet "Abonnement" avec vue complète
- [x] **Erreurs 403** - Messages clairs quand limite atteinte

#### Fichiers créés/modifiés
- `/app/backend/plan_limits.py` - Service validation limites
- `/app/backend/routers/auth.py` - Validation invitation technicien
- `/app/backend/routers/interventions.py` - Validation création intervention
- `/app/backend/routers/categories.py` - Validation création catégorie
- `/app/backend/routers/subscription.py` - Endpoint /usage
- `/app/frontend/src/components/PlanUsageWidget.jsx` - Widget UI
- `/app/frontend/src/pages/Settings.jsx` - Onglet Abonnement
- `/app/frontend/src/pages/Dashboard.jsx` - Widget compact

### Backlog V2
- [ ] React Native (si besoin app native)
- [ ] Intégration calendrier Google/Outlook

### Phase 30 - Workflow E2E: Signature + Géolocalisation + Photos dans PDF ✅ (Date: 2026-03-31)

#### Fonctionnalités
- [x] **Signature client PWA** - SignaturePad avec canvas tactile pour signature manuscrite
- [x] **Géolocalisation** - Capture GPS au démarrage et à la fin de l'intervention
- [x] **Sauvegarde signature** - Stockage base64 PNG dans MongoDB
- [x] **Photos d'intervention dans PDF** - Grille 2 colonnes avec légendes
- [x] **Signature dans PDF** - Section "Signature du client" avec image et nom du signataire
- [x] **Endpoint complete-with-signature** - Termine intervention + capture signature + geo en une requête

#### Endpoints modifiés
- `POST /api/interventions/{id}/complete-with-signature` - Body: signature + nom_signataire, Query: geo_latitude/longitude/accuracy
- `POST /api/interventions/{id}/signature` - Sauvegarde signature seule (avant completion)
- `GET /api/factures/{id}/pdf` - Inclut photos et signature si intervention_id lié
- `GET /api/factures/{id}/pdf-download` - Idem avec token auth
- `POST /api/factures/{id}/emit` - PDF envoyé par email inclut photos/signature

#### Fichiers modifiés
- `/app/backend/routers/interventions.py` - Endpoint complete-with-signature avec query params geo
- `/app/backend/routers/factures.py` - Injection intervention_photos et intervention_signature
- `/app/backend/routers/portal.py` - Portal PDF inclut photos/signature
- `/app/backend/pdf_generator.py` - build_photos_section() et build_signature_section()
- `/app/frontend/src/pages/TechnicianApp.jsx` - Envoi geo en query params
- `/app/frontend/src/components/SignaturePad.jsx` - Composant canvas signature

#### Bug corrigé
- **422 Unprocessable Entity** sur complete-with-signature: FastAPI ne supportait pas multiple body params. Geo déplacé en query params.

#### Tests
- `/app/backend/tests/test_signature_pdf_integration.py` - 12 tests (100% pass)
- PDF avec signature: +1161 bytes vs PDF basic

## Next Tasks
1. **P1**: Intégration Google Calendar/Outlook (requiert credentials OAuth)

### Backlog V2
- [ ] React Native (si besoin app native)
- [ ] Intégration calendrier Google/Outlook

---

### Phase 31 - Support Multi-sites ✅ (Date: 2026-03-31)

#### Fonctionnalités
- [x] **Modèle Site** - Nouveau modèle pour gérer les adresses multiples d'un client
- [x] **CRUD Sites API** - Endpoints complets pour créer, lire, modifier, supprimer des sites
- [x] **UI Gestion Sites** - Section Sites dans la fiche client avec formulaire modal
- [x] **Sélecteur Site** - Dans le formulaire d'intervention, choix du site si le client en a plusieurs
- [x] **Auto-remplissage adresse** - L'adresse est pré-remplie selon le site sélectionné
- [x] **Soft delete** - Les sites avec interventions liées sont désactivés, pas supprimés

#### Structure Site
```
{
  nom: string,           // "Entrepôt Nord"
  adresse: string,
  ville: string,
  code_postal: string,
  contact_nom?: string,  // Contact sur place
  contact_telephone?: string,
  contact_email?: string,
  horaires_acces?: string,      // "Lun-Ven 8h-18h"
  instructions_acces?: string,  // "Code portail: 1234"
  notes?: string,
  actif: boolean
}
```

#### Endpoints API
- `POST /api/sites` - Créer un site
- `GET /api/sites` - Liste des sites (filtrable par client_id)
- `GET /api/sites/client/{client_id}` - Sites actifs d'un client
- `GET /api/sites/{site_id}` - Détail d'un site
- `PUT /api/sites/{site_id}` - Modifier un site
- `DELETE /api/sites/{site_id}` - Supprimer/désactiver un site
- `POST /api/sites/{site_id}/activate` - Réactiver un site

#### Fichiers modifiés/créés
- `/app/backend/models.py` - Modèles Site, SiteCreate, SiteUpdate, SiteResponse
- `/app/backend/routers/sites.py` - Router CRUD complet
- `/app/backend/server.py` - Import du router sites
- `/app/frontend/src/pages/Clients.jsx` - Section Sites + SiteForm + gestion CRUD
- `/app/frontend/src/pages/Interventions.jsx` - Sélecteur de site dans le formulaire

---

### Phase 32 - Documentation UI Conflits Offline (LWW) ✅ (Date: 2026-03-31)

#### Fonctionnalités
- [x] **SyncStatusPanel** - Composant complet de gestion de synchronisation
- [x] **Historique de sync** - Table `syncHistory` dans IndexedDB pour traçabilité
- [x] **Statistiques de sync** - Compteurs réussies/échouées/conflits
- [x] **Logging LWW** - Enregistrement automatique des conflits résolus
- [x] **Onglet Aide** - Documentation utilisateur sur le mode hors ligne et LWW

#### Composants UI
- **État** : Statut connexion, dernière sync, cache local, stats
- **Historique** : Liste chronologique des événements de sync avec indicateurs visuels
- **Aide** : Documentation complète (Mode hors ligne, Résolution conflits LWW, Bonnes pratiques)

#### Fichiers modifiés/créés
- `/app/frontend/src/components/SyncStatusPanel.jsx` - Nouveau composant (400+ lignes)
- `/app/frontend/src/lib/offlineDb.js` - Table syncHistory + méthodes getSyncHistory, getSyncStats, logSyncEvent
- `/app/frontend/src/contexts/OfflineContext.jsx` - Logging des événements de sync + exposition getSyncHistory/Stats
- `/app/frontend/src/pages/TechnicianApp.jsx` - Intégration SyncStatusPanel dans header

