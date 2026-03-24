# FieldCommand - SaaS Gestion d'Interventions Terrain

## Problem Statement
SaaS multi-tenant pour entreprises de services (plomberie, électricité, maintenance) avec:
- Dashboard Admin pour pilotage entreprise
- Application technicien pour terrain (PWA mobile)
- Portail client pour signature devis

## Architecture

### Backend (FastAPI + MongoDB)
- **server.py**: API principale avec routes auth, clients, interventions, devis, factures, emails, SMS
- **models.py**: Modèles Pydantic (Entreprise, User, Client, Intervention, Devis, Facture, AuditLog)
- **auth.py**: JWT authentication avec rôles admin/tech
- **pdf_generator.py**: Génération PDF devis/factures avec ReportLab
- **storage.py**: Intégration Object Storage Emergent
- **email_service.py**: Envoi emails via Resend (devis, factures, relances)
- **sms_service.py**: Envoi SMS via Twilio (rappels interventions, notifications)

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
- **TechnicianApp.jsx**: Application mobile technicien PWA (agenda jour/semaine, photos, notes, offline)
- **Planning.jsx**: Calendrier drag-and-drop pour organiser les interventions

### PWA / Offline Support
- **manifest.json**: Configuration PWA (installable, standalone, icônes)
- **sw.js**: Service Worker pour cache et mode offline
- **OfflineContext.jsx**: Gestion état réseau et sync IndexedDB

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
- [x] Vue agenda semaine (onglet Semaine)
- [x] Détail intervention avec actions rapides
- [x] Appel client / Itinéraire GPS
- [x] Démarrer / Terminer intervention
- [x] Notes terrain
- [x] Upload photos
- [x] Indicateur statut réseau (online/offline)
- [x] Cache local pour données hors ligne

### Phase 7 - Planning Calendrier ✅
- [x] Vue calendrier hebdomadaire
- [x] Navigation entre semaines
- [x] Affichage interventions par jour
- [x] Filtres par technicien et statut
- [x] Drag-and-drop pour replanifier
- [x] Dialogue de replanification (heure + technicien)
- [x] Légende (aujourd'hui, priorités, drag-drop)

### Phase 8 - PWA & Mode Offline ✅
- [x] Manifest PWA (installable sur mobile)
- [x] Service Worker avec stratégies de cache
- [x] IndexedDB pour données offline
- [x] Synchronisation automatique des actions en attente
- [x] Indicateur de statut réseau

### Phase 9 - SMS Notifications ✅
- [x] Service Twilio intégré
- [x] API SMS intervention reminder
- [x] API SMS devis notification
- [x] API SMS facture notification
- [x] API SMS relance paiement
- [x] Templates SMS en français

### Phase 10 - Relances Automatiques ✅
- [x] Tâche de fond pour relances factures impayées
- [x] Tâche de fond pour rappels interventions (J-1)
- [x] Configuration via variable d'environnement
- [x] Tracking des relances envoyées

## Configuration requise

### Variables d'environnement Backend (.env)
```
MONGO_URL=mongodb://...
DB_NAME=fieldcommand

# Email (Resend)
RESEND_API_KEY=re_xxxxx

# SMS (Twilio) - Optionnel
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx

# Relances automatiques
ENABLE_AUTO_REMINDERS=true  # false pour désactiver
```

## Test Coverage
- Backend: 100% (12/12 tests - /app/backend/tests/test_pwa_sms_features.py)
- Frontend: 100% fonctionnel (PWA + Week View + Offline validés)

## Prioritized Backlog

### P0 (Critique) - DONE
- [x] PWA Mode offline complet ✅
- [x] Vue semaine agenda technicien ✅
- [x] SMS Notifications ✅
- [x] Relances automatiques ✅

### P1 (Important)
- [ ] Statistiques et rapports avancés
- [ ] Configuration des relances dans les paramètres
- [ ] Export comptable (CSV/Excel)

### P2 (Nice to have)
- [ ] Checklist d'intervention configurable
- [ ] Catalogue prestations
- [ ] Intégration paiement en ligne (Stripe)
- [ ] Historique des SMS envoyés

### Reporté V2
- [ ] Optimisation tournées IA
- [ ] Chat temps réel technicien-admin
- [ ] Export Sage/EBP
- [ ] Multi-sites sophistiqué
- [ ] Gestion stock
- [ ] White-labeling

## Next Tasks
1. Ajouter interface de configuration Twilio dans Settings
2. Ajouter page de rapports/statistiques
3. Implémenter export CSV des données
4. Ajouter historique des communications (emails + SMS)
