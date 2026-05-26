# ACTOOS JOBS - Product Requirements Document

## Vision
Job board SaaS nouvelle generation pour le Mali (jobs.actoos.com). Modele freemium, multilingue (FR initialement).

**Status**: MVP COMPLET - Pret pour deploiement

**Stack Technique**:
- Frontend: React 18 + Tailwind CSS v3 + Shadcn/UI
- Backend: Supabase (Auth + PostgreSQL + Storage)
- Deploiement: Emergent Platform → jobs.actoos.com

---

## MVP Complet (26 Mai 2026)

### Pages Publiques
- [x] Homepage avec offres recentes dynamiques (Supabase)
- [x] Page Recherche d'emploi (/emplois) avec filtres
- [x] Page Detail Offre (/emplois/:id) avec candidature
- [x] Page Entreprises (/entreprises)
- [x] Page Tarifs (/tarifs) - 3 plans
- [x] Page Blog (/blog)
- [x] Page Contact (/contact)
- [x] Page A propos (/a-propos)
- [x] Pages Legales (CGU, Confidentialite, Cookies)

### Authentification
- [x] Inscription candidat/entreprise (/inscription)
- [x] Connexion (/connexion)
- [x] Google OAuth (a configurer dans Supabase - voir GOOGLE_AUTH_SETUP.md)
- [x] Routes protegees

### Espace Candidat
- [x] Dashboard (/dashboard)
- [x] Profil complet (/profil) avec:
  - Infos personnelles
  - Profil professionnel
  - Upload CV
  - Competences
  - Experiences (CRUD)
  - Formations (CRUD)
  - Liens sociaux

### Espace Entreprise
- [x] Dashboard (/dashboard/entreprise)
- [x] Creation entreprise (/dashboard/entreprise/creer)
- [x] Publication offre (/dashboard/entreprise/offres/nouvelle)
- [x] Modification offre (/dashboard/entreprise/offres/:id/modifier)
- [x] Gestion candidatures

### Infrastructure
- [x] Supabase configure (Auth + DB + Storage)
- [x] Schema DB complet
- [x] RLS Policies
- [x] Buckets Storage (CVs, logos)
- [x] Footer global
- [x] Navigation responsive

---

## Pour deployer sur jobs.actoos.com

### 1. Configurer Google OAuth
Suivre `/app/actoos-jobs/docs/GOOGLE_AUTH_SETUP.md`

### 2. Executer le SQL dans Supabase
Executer `/app/actoos-jobs/docs/MVP_P0_SETUP.sql` (deja fait)

### 3. Configurer le domaine
- Pointer jobs.actoos.com vers le serveur
- Configurer SSL

### 4. Variables d'environnement production
```
REACT_APP_SUPABASE_URL=https://anfamlpwootbrzswnpyp.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
```

---

## Post-MVP (Backlog)

### P1 - Court terme
- [ ] Dashboard Admin (moderation)
- [ ] Integration Stripe (paiements)
- [ ] Alertes email (Resend configure - cle disponible)
- [ ] SEO URLs localisees

### P2 - Moyen terme
- [ ] Multilingue (Bambara, Anglais)
- [ ] PWA
- [ ] Matching IA
- [ ] Chat temps reel

---

## Fichiers Cles

```
/app/actoos-jobs/frontend/
├── src/
│   ├── pages/           (16 pages)
│   ├── components/      (Header, Footer, ui/)
│   ├── contexts/        (AuthContext)
│   └── lib/             (supabase, utils)
├── docs/
│   ├── SCHEMA.sql
│   ├── MVP_P0_SETUP.sql
│   └── GOOGLE_AUTH_SETUP.md
└── .env
```

---

## Tests Effectues (95% succes)
- Toutes les pages chargent correctement
- Navigation fonctionnelle
- Routes protegees redirect vers login
- Supabase integration OK
- Footer unique (corrige)

---

**Derniere mise a jour**: 26 Mai 2026 - MVP COMPLET
