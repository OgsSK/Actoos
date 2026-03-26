# FieldCommand - SaaS Gestion d'Interventions Terrain

## Problem Statement
SaaS multi-tenant pour entreprises de services (plomberie, électricité, maintenance) avec:
- Dashboard Admin pour pilotage entreprise
- Application technicien pour terrain (PWA)
- Portail client pour signature devis

## What's Implemented (Date: 2026-03-26)

### Phases 1-10 ✅ (Sessions précédentes)
- Multi-tenant, Auth JWT, CRUD complet
- PDF génération, Emails, Dashboard
- Planning drag-drop, App Technicien PWA
- SMS Twilio, Rapports, Paramètres

### Phase 11 - Corrections Finales ✅ (Session actuelle)

#### Bugs corrigés
- [x] **Téléchargement PDF** - Utilise API avec Bearer token (méthode blob)
- [x] **Signature visible** - Image affichée dans devis, portail client, PDF
- [x] **Timezone** - Dates en heure locale Paris (+1h)
- [x] **Compteur interventions** - Ne compte que les interventions du jour
- [x] **Planning mobile** - Scroll horizontal fonctionnel

#### Nouvelles fonctionnalités
- [x] **Sélection multiple devis** - Cases à cocher + bouton supprimer en lot
- [x] **Sélection multiple factures** - Cases à cocher + bouton supprimer en lot
- [x] **Suppression individuelle** - Devis, Interventions, Factures, Techniciens
- [x] **Annulation intervention** - Nouveau statut "annulée"
- [x] **Alertes cliquables** - Navigation vers les détails depuis dashboard
- [x] **Bouton "Lien client"** - Copier le lien du portail client
- [x] **Bouton "Voir devis"** - Navigation facture → devis associé

## Restrictions métier

### Suppressions
- **Devis** : Seulement brouillon ou envoyé (pas signé/facturé)
- **Factures** : Seulement brouillon (pas émise/payée)
- **Interventions** : Seulement planifiée ou annulée (pas en cours/terminée)
- **Techniciens** : Pas d'interventions actives

## Configuration requise

### Variables d'environnement Backend (.env)
```
MONGO_URL=mongodb://...
DB_NAME=fieldcommand
RESEND_API_KEY=re_xxxxx
SENDER_EMAIL=onboarding@resend.dev
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx  # À ajouter
```

## Prioritized Backlog

### P0 (Critique) - À faire
- [ ] **Logique assignation technicien** : Assigné vs tous voient
- [ ] **Traçabilité complète** : Audit trail détaillé
- [ ] **Photos avant/après** : Envoi rapide au client/dashboard

### P1 (Important)
- [ ] Localisation dynamique (timezone, formats selon pays)
- [ ] Historique communications (emails + SMS envoyés)
- [ ] Configuration relances automatiques dans Settings

### P2 (Nice to have)
- [ ] QR Code paiement sur facture
- [ ] Intégration paiement en ligne (Stripe)

### Reporté V2
- [ ] **Abonnements SaaS** - Tiers de prix avec fonctionnalités limitées
- [ ] Optimisation tournées IA
- [ ] White-labeling

## Next Tasks
1. Implémenter la logique d'assignation intelligente des interventions
2. Ajouter audit trail complet pour traçabilité
3. Améliorer le flux photos technicien (avant/après avec envoi rapide)
