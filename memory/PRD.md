# ACTOOS JOBS - Product Requirements Document

## Vision
Job board SaaS nouvelle generation pour le Mali (jobs.actoos.com). Modele freemium, multilingue (FR initialement).

**Status**: MVP Phase 1 - EN DEVELOPPEMENT

**Stack Technique**:
- Frontend: React 18 + Tailwind CSS v3 + Shadcn/UI
- Backend: Supabase (Auth + PostgreSQL + Storage)
- Deploiement: Emergent Platform

---

## Implemente (26 Mai 2026)

### Phase 1.1 - Core Pages
- Homepage premium avec Hero, Categories, Offres recentes
- Page Recherche d'emploi (`/emplois`) avec filtres UI
- Pages Auth: Inscription (`/inscription`), Connexion (`/connexion`)
- Header avec navigation responsive

### Phase 1.2 - Backend & Auth
- Supabase configure (Auth + PostgreSQL)
- Schema DB complet: users, candidates, companies, jobs, applications
- RLS Policies pour securite
- Inscription candidat fonctionnelle (Email confirmation activee)

### Phase 1.3 - Dashboard Candidat
- Dashboard Candidat (`/dashboard`, `/dashboard/candidat`)
- Page Profil Candidat (`/profil`) complete

### Phase 1.4 - Dashboard Entreprise
- Dashboard Entreprise (`/dashboard/entreprise`)
- Page Creation Entreprise (`/dashboard/entreprise/creer`)
- Page Publication Offre (`/dashboard/entreprise/offres/nouvelle`)

### Phase 1.5 - Page Detail Offre & Candidature
- Page Detail Offre (`/emplois/:id`)
- Modal Candidature avec message de motivation

### Phase 1.6 - Pages Legales & Footer (Aujourd'hui)
- CGU (`/cgu`)
- Politique de Confidentialite (`/confidentialite`)
- Politique de Cookies (`/cookies`)
- Page Contact (`/contact`)
- Page A propos (`/a-propos`)
- Footer complet avec liens et reseaux sociaux
- Fix z-index dropdowns sur page /emplois

---

## Routes Actives

### Publiques
- `/` - Homepage
- `/emplois` - Recherche d'emploi
- `/emplois/:id` - Detail offre
- `/connexion` - Login
- `/inscription` - Register
- `/cgu` - Conditions Generales
- `/confidentialite` - Politique Confidentialite
- `/cookies` - Politique Cookies
- `/contact` - Contact
- `/a-propos` - A propos

### Protegees (Candidat)
- `/dashboard` - Dashboard candidat
- `/profil` - Profil candidat

### Protegees (Entreprise)
- `/dashboard/entreprise` - Dashboard entreprise
- `/dashboard/entreprise/creer` - Creer entreprise
- `/dashboard/entreprise/offres/nouvelle` - Publier offre

---

## Prochaines Etapes

### P0 - MVP (Immediat)
- [ ] Configuration Resend pour emails transactionnels
- [ ] Tester flux complet (inscription -> publication -> candidature)

### P1 - Post-MVP
- Dashboard Admin (moderation offres, validation entreprises)
- Stripe Integration (plans freemium: Basic, Pro, Business)
- Page Tarifs complete
- Multilingue (Bambara, Anglais)
- SEO URLs localisees (/ml/emplois/bamako)
- Notifications email (nouvelles offres, candidatures)

### P2 - Evolutions
- PWA (Progressive Web App)
- Matching IA candidat/offre
- Chat temps reel employeur/candidat
- Alertes email personnalisees
- Analytics avancees

---

## Fichiers Cles

```
/app/actoos-jobs/frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── ui/
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── supabase.js
│   │   └── utils.js
│   ├── pages/
│   │   ├── Homepage.jsx
│   │   ├── JobsPage.jsx
│   │   ├── JobDetailPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── CandidateDashboard.jsx
│   │   ├── CandidateProfilePage.jsx
│   │   ├── CompanyDashboard.jsx
│   │   ├── CreateCompanyPage.jsx
│   │   ├── CreateJobPage.jsx
│   │   ├── CGUPage.jsx
│   │   ├── PrivacyPolicyPage.jsx
│   │   ├── CookiesPage.jsx
│   │   └── ContactPage.jsx
│   └── App.js
├── docs/
│   ├── SCHEMA.sql
│   └── MVP_P0_SETUP.sql (Execute)
└── .env
```

---

## Notes Techniques

1. **Supabase**: Emails de confirmation geres par Supabase Auth
2. **Storage Buckets**: `company-logos`, `cvs` (a creer via SQL)
3. **RLS**: Toutes les tables ont RLS active
4. **Dropdowns**: z-index fix a [100] pour eviter superposition

---

**Derniere mise a jour**: 26 Mai 2026
