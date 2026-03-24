# FieldCommand - SaaS Gestion d'Interventions Terrain

## Problem Statement
SaaS multi-tenant pour entreprises de services (plomberie, électricité, maintenance) avec:
- Dashboard Admin pour pilotage entreprise
- Application technicien pour terrain
- Portail client pour signature devis

## Architecture

### Backend (FastAPI + MongoDB)
- **server.py**: API principale avec routes auth, clients, interventions, devis, factures
- **models.py**: Modèles Pydantic (Entreprise, User, Client, Intervention, Devis, Facture, AuditLog)
- **auth.py**: JWT authentication avec rôles admin/tech
- **pdf_generator.py**: Génération PDF devis/factures avec ReportLab
- **storage.py**: Intégration Object Storage Emergent

### Frontend (React + Shadcn UI)
- **AuthPages.jsx**: Login, Register, Activate
- **Dashboard.jsx**: Overview avec KPIs, alertes, éléments récents
- **Clients.jsx**: CRUD clients
- **Interventions.jsx**: CRUD interventions avec assignation technicien
- **Devis.jsx**: Création devis avec lignes, signature, conversion facture
- **Factures.jsx**: Suivi factures et paiements
- **Techniciens.jsx**: Gestion équipe, invitations
- **Settings.jsx**: Paramètres entreprise
- **ClientPortal.jsx**: Portail client public (signature devis)

## Core Requirements (Statique)
1. Multi-tenant avec isolation par entreprise_id
2. Auth JWT avec rôles admin/technicien
3. Workflow: Intervention → Devis → Signature → Facture
4. Génération PDF professionnels
5. Portail client par lien sécurisé

## What's Implemented (Date: 2026-03-24)

### Phase 1 - Fondations ✅
- [x] Architecture multi-tenant (entreprise_id partout)
- [x] Auth complète (register, login, invitation, activation)
- [x] Modèles de données complets
- [x] JWT avec rôles admin/tech
- [x] Audit logs basiques

### Phase 2 - Cœur Métier ✅
- [x] CRUD Clients (particulier/professionnel)
- [x] CRUD Interventions (planification, assignation, statuts)
- [x] Devis complets (lignes, TVA, totaux automatiques)
- [x] Numérotation légale (D2026-XXXXX, F2026-XXXXX)
- [x] Signature client tactile
- [x] Génération PDF devis/factures
- [x] Portail client (accès par token)

### Phase 3 - Dashboard ✅
- [x] KPIs (interventions, devis, factures, CA)
- [x] Alertes (retards, expirés, impayés)
- [x] Éléments récents
- [x] Recherche globale
- [x] Actions rapides

### Phase 4 - Factures ✅
- [x] Création depuis devis signé
- [x] Suivi statuts (brouillon, émise, payée, en retard)
- [x] Enregistrement paiements
- [x] PDF factures

## Prioritized Backlog

### P0 (Critique)
- [ ] Mode offline/brouillons technicien (PWA avec IndexedDB)
- [ ] Synchronisation automatique

### P1 (Important)
- [ ] Application mobile technicien (agenda du jour)
- [ ] Upload photos intervention
- [ ] Envoi emails (devis/factures via SendGrid/Resend)
- [ ] SMS notifications (Twilio)

### P2 (Nice to have)
- [ ] Planning calendrier drag-drop
- [ ] Relances automatiques factures
- [ ] Rapports/statistiques avancés
- [ ] Intégration paiement en ligne

### Reporté V2
- [ ] Optimisation tournées IA
- [ ] Chat temps réel
- [ ] Export comptable (Sage/EBP)
- [ ] Multi-sites sophistiqué
- [ ] Gestion stock

## Next Tasks
1. Implémenter mode offline pour techniciens (IndexedDB + Service Worker)
2. Intégrer envoi email transactionnel
3. Améliorer l'app technicien mobile avec agenda du jour
4. Ajouter upload photos sur interventions
