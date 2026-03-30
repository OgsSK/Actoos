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

### P0 (Critique) - Complété ✅
- [x] **Logique assignation intelligente** - Intervention sans technicien → visible par tous → premier à accepter = assigné

### P1 (Important) - Complété ✅
- [x] **Catégories/Modules** : Support multi-secteurs (BTP, Nettoyage, Maintenance) avec checklists dynamiques
- [x] **EXIF stripping** : Suppression métadonnées GPS des photos avant upload
- [x] **Historique communications** : Emails et SMS envoyés par client

### P2 (Nice to have) - En cours
- [ ] **Stripe + Onboarding SaaS** : Page d'inscription publique avec plans d'abonnement
- [ ] **White-labeling complet** : Upload logo + couleur primaire + injection CSS dynamique
- [ ] QR Code paiement sur facture

### Backlog V2
- [ ] Optimisation tournées IA
- [ ] Offline avancé (IndexedDB/SQLite sync)
- [ ] React Native (si besoin natif)

## Next Tasks
1. Stripe + Onboarding SaaS (plans d'abonnement)
2. White-labeling complet (logo + couleurs dynamiques)
3. QR Code paiement sur facture
