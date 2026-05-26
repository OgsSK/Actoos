# ACTOOS JOBS - Product Requirements Document

## Vision
Job board SaaS nouvelle generation international (jobs.actoos.com). Modele freemium, multi-tenant.

**Status**: MVP EN COURS - Stripe & CRUD en test
**Geographie**: International (base Belgique - textes universels, EUR)
**Contact**: +32 465743661

**Stack Technique**:
- Frontend: React 18 + Tailwind CSS v3 + Shadcn/UI
- Backend: FastAPI (Stripe) + Supabase (Auth + PostgreSQL + Storage)
- Paiements: Stripe (EUR)
- Deploiement: Emergent Platform → jobs.actoos.com

---

## Implemente (26 Mai 2026)

### Pages Publiques
- [x] Homepage avec offres recentes dynamiques (Supabase)
- [x] Page Recherche d'emploi (/emplois) avec filtres EUR
- [x] Page Detail Offre (/emplois/:id) avec candidature
- [x] Page Entreprises (/entreprises)
- [x] Page Tarifs (/tarifs) - 3 plans + Boosts avec Stripe
- [x] Page Blog (/blog)
- [x] Page Contact (/contact)
- [x] Page A propos (/a-propos)
- [x] Pages Legales (CGU, Confidentialite, Cookies)

### Authentification
- [x] Inscription candidat/entreprise (/inscription)
- [x] Connexion (/connexion)
- [x] Google OAuth (configure dans Supabase)
- [x] Routes protegees

### Espace Candidat
- [x] Dashboard (/dashboard)
- [x] Profil complet (/profil) avec:
  - Infos personnelles
  - Profil professionnel
  - Upload/Remplacer/Supprimer CV
  - Competences (CRUD)
  - Experiences (CRUD)
  - Formations (CRUD)
  - Liens sociaux

### Espace Entreprise
- [x] Dashboard (/dashboard/entreprise)
- [x] Creation entreprise (/dashboard/entreprise/creer)
- [x] Publication offre (/dashboard/entreprise/offres/nouvelle)
- [x] Modification offre (/dashboard/entreprise/offres/:id/modifier)
- [x] Gestion candidatures (Voir/Modifier/Supprimer/Pause/Publier)

### Backend & Paiements
- [x] FastAPI Backend (/app/actoos-jobs/backend)
- [x] Stripe Integration (test mode)
  - GET /api/pricing - Plans et Boosts
  - POST /api/checkout/session - Creation session paiement
  - GET /api/checkout/status/{session_id} - Status paiement
  - POST /api/webhook/stripe - Webhook Stripe

### Textes Universels (26 Mai 2026)
- [x] Suppression references Mali/Bamako
- [x] Devise EUR au lieu de FCFA/XOF
- [x] Numero telephone Belgique (+32)
- [x] Meta tags universels

---

## En Cours

### P0 - Prioritaire
- [ ] Test E2E flux complet (Inscription → Entreprise → Job → Postuler)
- [ ] Admin Dashboard (moderation jobs, validation entreprises)
- [ ] Activer preview Emergent

### P1 - Court terme
- [ ] Alertes email (Resend configure - cle disponible)
- [ ] SEO URLs localisees multilinguales

---

## Backlog

### P2 - Moyen terme
- [ ] Multilingue (FR/EN/NL)
- [ ] PWA
- [ ] Matching IA
- [ ] Chat temps reel

---

## Architecture

```
/app/actoos-jobs/
├── backend/
│   ├── main.py          (FastAPI - Stripe)
│   ├── requirements.txt
│   └── .env             (STRIPE_API_KEY)
├── frontend/
│   ├── src/
│   │   ├── components/  (Header, Footer, ui/)
│   │   ├── pages/       (17 pages)
│   │   ├── contexts/    (AuthContext)
│   │   └── lib/         (supabase, utils)
│   └── .env             (SUPABASE_URL, SUPABASE_KEY, BACKEND_URL)
└── docs/
    ├── SCHEMA.sql
    ├── MVP_P0_SETUP.sql
    └── GOOGLE_AUTH_SETUP.md
```

---

## API Endpoints

### Backend FastAPI (Port 8001)
- `GET /api/health` - Health check
- `GET /api/pricing` - Plans et Boosts
- `POST /api/checkout/session` - Creer session Stripe
- `GET /api/checkout/status/{session_id}` - Status paiement
- `POST /api/webhook/stripe` - Webhook Stripe

### Supabase
- Auth (Email + Google OAuth)
- PostgreSQL (candidates, companies, jobs, applications, saved_jobs)
- Storage (cvs, logos)

---

## Tests

### Iteration 5 (26 Mai 2026)
- Backend: 100% (8/8 tests)
- Frontend: 100%
- Corrections: CITIES_MALI alias, country code BE

---

**Derniere MAJ**: 26 Mai 2026
