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

### Backlog V2
- [ ] React Native (si besoin app native)
- [ ] Intégration calendrier Google/Outlook
- [ ] API publique pour intégrations tierces
- [ ] Multi-devises et internationalisation
- [ ] Export PDF/Excel des rapports
- [ ] Relevés mensuels automatisés pour clients

## Next Tasks
1. Refactoring server.py en modules (routers/)
2. Multi-devises et internationalisation

