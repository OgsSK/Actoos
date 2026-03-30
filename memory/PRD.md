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

### Backlog (Nice to have)
- [x] QR Code paiement sur facture ✅
- [x] Injection CSS dynamique des couleurs dans toute l'interface ✅
- [x] Logo visible sur les PDF générés ✅
- [ ] Portail client web (consultation factures/devis, historique)
- [ ] Notifications push PWA

### Backlog V2
- [ ] Optimisation tournées IA
- [ ] Offline avancé (IndexedDB/SQLite sync)
- [ ] React Native (si besoin natif)
- [ ] Intégration calendrier Google/Outlook
- [ ] API publique pour intégrations tierces

## Next Tasks
1. Offline avancé (IndexedDB/SQLite sync) pour l'app technicien
2. Portail client web
