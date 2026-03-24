# FieldCommand - SaaS Gestion d'Interventions Terrain

## Problem Statement
SaaS multi-tenant pour entreprises de services (plomberie, électricité, maintenance) avec:
- Dashboard Admin pour pilotage entreprise
- Application technicien pour terrain
- Portail client pour signature devis

## Architecture

### Backend (FastAPI + MongoDB)
- **server.py**: API principale avec routes auth, clients, interventions, devis, factures, emails
- **models.py**: Modèles Pydantic (Entreprise, User, Client, Intervention, Devis, Facture, AuditLog)
- **auth.py**: JWT authentication avec rôles admin/tech
- **pdf_generator.py**: Génération PDF devis/factures avec ReportLab
- **storage.py**: Intégration Object Storage Emergent
- **email_service.py**: Envoi emails via Resend (devis, factures, relances)

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
- **TechnicianApp.jsx**: Application mobile technicien (agenda, photos, notes)

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

### Phase 3 - Dashboard Admin ✅
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

### Phase 5 - Emails Automatiques ✅
- [x] Envoi automatique devis par email (avec PDF)
- [x] Envoi automatique factures par email (avec PDF)
- [x] Relances paiement (bouton dédié)
- [x] Templates HTML professionnels
- [x] Lien portail client dans email devis

### Phase 6 - Application Technicien ✅
- [x] Vue agenda du jour (/tech)
- [x] Détail intervention avec actions rapides
- [x] Appel client / Itinéraire GPS
- [x] Démarrer / Terminer intervention
- [x] Notes terrain
- [x] Upload photos
- [x] Indicateur statut réseau (online/offline)
- [x] Cache local pour données hors ligne

## Prioritized Backlog

### P0 (Critique) - Prochaine itération
- [ ] Service Worker pour mode offline complet (PWA)
- [ ] Synchronisation automatique des brouillons

### P1 (Important)
- [ ] Planning calendrier drag-drop
- [ ] Rapports/statistiques avancés
- [ ] SMS notifications (Twilio)
- [ ] Relances automatiques programmées

### P2 (Nice to have)
- [ ] Checklist d'intervention configurable
- [ ] Catalogue prestations
- [ ] Intégration paiement en ligne
- [ ] Export comptable

### Reporté V2
- [ ] Optimisation tournées IA
- [ ] Chat temps réel
- [ ] Export Sage/EBP
- [ ] Multi-sites sophistiqué
- [ ] Gestion stock

## Next Tasks
1. Implémenter Service Worker pour PWA complète
2. Ajouter planning calendrier avec drag-drop
3. Implémenter relances automatiques programmées
4. Ajouter statistiques et rapports
