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

### P0 (Critique) - En cours
- [ ] **Logique assignation intelligente** : Si intervention sans technicien → notifier tous les techs → premier à accepter = assigné
- [ ] **Traçabilité complète** : Audit trail détaillé

### P1 (Important)
- [ ] **Catégories/Modules** : Support multi-secteurs (BTP, Nettoyage, Maintenance) avec checklists dynamiques
- [ ] **EXIF stripping** : Supprimer métadonnées GPS des photos avant upload
- [ ] Historique communications (emails + SMS envoyés)

### P2 (Nice to have)
- [ ] **Stripe + Onboarding SaaS** : Page d'inscription publique avec plans d'abonnement
- [ ] **White-labeling complet** : Upload logo + couleur primaire + injection CSS dynamique
- [ ] QR Code paiement sur facture

### Backlog V2
- [ ] Optimisation tournées IA
- [ ] Offline avancé (IndexedDB/SQLite sync)
- [ ] React Native (si besoin natif)

## Next Tasks
1. Implémenter la logique d'assignation intelligente (claim mission)
2. Ajouter catégories avec checklists dynamiques
3. Améliorer le flux photos (compression + EXIF strip)
