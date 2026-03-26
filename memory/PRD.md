# FieldCommand - SaaS Gestion d'Interventions Terrain

## Problem Statement
SaaS multi-tenant pour entreprises de services (plomberie, électricité, maintenance) avec:
- Dashboard Admin pour pilotage entreprise
- Application technicien pour terrain (PWA)
- Portail client pour signature devis

## Architecture

### Backend (FastAPI + MongoDB)
- **server.py**: API principale avec routes auth, clients, interventions, devis, factures, emails, SMS, rapports
- **models.py**: Modèles Pydantic (Entreprise, User, Client, Intervention, Devis, Facture, AuditLog)
- **auth.py**: JWT authentication avec rôles admin/tech
- **pdf_generator.py**: Génération PDF devis/factures avec ReportLab + signature image
- **storage.py**: Intégration Object Storage Emergent
- **email_service.py**: Envoi emails via Resend
- **sms_service.py**: Envoi SMS via Twilio

### Frontend (React + Shadcn UI)
- Pages admin: Dashboard, Clients, Interventions, Devis, Factures, Techniciens, Planning, Rapports, Settings
- TechnicianApp: PWA mobile avec vue jour/semaine, offline mode
- ClientPortal: Portail public pour signature devis

## What's Implemented (Date: 2026-03-26)

### Phase 1-7 ✅ (Sessions précédentes)
- Multi-tenant, Auth JWT, CRUD complet, PDF, Emails, Dashboard, Planning drag-drop, App Technicien

### Phase 8 - PWA & Mode Offline ✅
- Service Worker, Manifest PWA, IndexedDB, Sync automatique

### Phase 9 - SMS Notifications ✅
- Service Twilio intégré (credentials configurés, numéro à ajouter)
- API SMS pour interventions, devis, factures, relances

### Phase 10 - Rapports ✅
- Page rapports avec KPIs, graphiques CA, tunnel conversion
- Export CSV (devis, factures, clients, interventions)

### Phase 11 - Corrections & Améliorations ✅ (Session actuelle)

#### Bugs corrigés
- [x] **Téléchargement PDF** - Fonctionne avec token auth en query param
- [x] **Signature visible** - Image signature affichée dans devis, portail client et PDF
- [x] **Timezone** - Dates en heure locale Paris (+1h)
- [x] **Compteur interventions dashboard** - Compte uniquement les interventions du jour
- [x] **Planning mobile** - Scroll horizontal fonctionnel

#### Nouvelles fonctionnalités
- [x] **Suppression devis** - DELETE /api/devis/{id} (brouillon/envoyé uniquement)
- [x] **Suppression intervention** - DELETE /api/interventions/{id} (non démarrée)
- [x] **Annulation intervention** - POST /api/interventions/{id}/cancel → statut "annulee"
- [x] **Suppression facture** - DELETE /api/factures/{id} (brouillon uniquement)
- [x] **Suppression technicien** - DELETE /api/users/{id} (sans interventions actives)
- [x] **Alertes cliquables** - Navigation vers les détails depuis le dashboard
- [x] **Bouton "Lien client"** - Copier le lien du portail client
- [x] **Bouton "Voir devis"** - Navigation facture → devis associé
- [x] **Stats dashboard améliorées** - devis_expires, factures_en_retard

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
ENABLE_AUTO_REMINDERS=true
```

## Test Coverage
- Backend: 100% (16/16 tests - iteration_5)
- Frontend: 100% fonctionnel

## Prioritized Backlog

### P0 (Critique) - À faire
- [ ] **Logique assignation technicien**:
  - Assigné → seul ce technicien voit
  - Non assigné → tous voient, premier qui prend notifie les autres
- [ ] **Traçabilité complète** - Audit trail de toutes les actions
- [ ] **Photos avant/après** - Envoi en un clic au client/dashboard

### P1 (Important)
- [ ] Localisation dynamique (timezone, formats selon pays)
- [ ] Historique communications (emails + SMS envoyés)
- [ ] Configuration relances automatiques dans Settings

### P2 (Nice to have)
- [ ] QR Code paiement sur facture
- [ ] Intégration paiement en ligne (Stripe)
- [ ] Checklist intervention configurable

### Reporté V2
- [ ] **Abonnements SaaS** - Tiers de prix (50€/80€/99€) avec fonctionnalités limitées
- [ ] Optimisation tournées IA
- [ ] White-labeling

## Flux métier clarifiés

### "En retard" s'applique quand:
- **Intervention**: date_prevue passée et statut = planifiee
- **Devis**: date_expiration passée et statut = envoye
- **Facture**: date_echeance passée et statut = emise

### Flux invitation technicien:
1. Admin entre email + nom + prénom + téléphone
2. Le système génère un token d'invitation
3. Un lien d'activation est créé (à envoyer par admin)
4. Le technicien clique sur le lien et définit son mot de passe
5. Compte activé et prêt à l'emploi

## Next Tasks
1. Implémenter la logique d'assignation intelligente des interventions
2. Ajouter audit trail complet pour traçabilité
3. Améliorer le flux photos technicien (avant/après avec envoi rapide)
