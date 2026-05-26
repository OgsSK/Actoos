# ACTOOS - Product Requirements Documents

## Projets

### 1. ACTOOS PRO (EN PAUSE)
Application SaaS B2B de gestion d'interventions terrain pour les entreprises de services en Europe.

**Status**: EN PAUSE - Projet temporairement suspendu pour développer ACTOOS Jobs

**Dernières fonctionnalités (Mai 2026)**:
- Mode Hors-ligne (Indicateur PWA)
- Dispatch Board Temps Réel (Kanban)
- Carte GPS Techniciens
- Devis Multi-options (Good/Better/Best)
- Pricebook (En cours)

---

### 2. ACTOOS JOBS (EN COURS)

**Vision**: Job board SaaS nouvelle génération pour le Mali (jobs.actoos.com). Modèle freemium, multilingue (FR initialement).

**Status**: MVP Phase 1 - EN DÉVELOPPEMENT

**Stack Technique**:
- Frontend: React 18 + Tailwind CSS v3 + Shadcn/UI
- Backend: Supabase (Auth + PostgreSQL + Storage)
- Déploiement: Emergent Platform

---

## ACTOOS Jobs - Implémenté (26 Mai 2026)

### ✅ Phase 1.1 - Core Pages
- Homepage premium avec Hero, Catégories, Offres récentes
- Page Recherche d'emploi (`/emplois`) avec filtres UI
- Pages Auth: Inscription (`/inscription`), Connexion (`/connexion`)
- Header avec navigation responsive

### ✅ Phase 1.2 - Backend & Auth
- Supabase configuré (Auth + PostgreSQL)
- Schéma DB complet: users, candidates, companies, jobs, applications
- RLS Policies pour sécurité
- Inscription candidat fonctionnelle (Email confirmation activée)

### ✅ Phase 1.3 - Dashboard Candidat (Aujourd'hui)
- Dashboard Candidat (`/dashboard`, `/dashboard/candidat`)
  - Stats: candidatures, vues profil, offres sauvegardées
  - Liste candidatures récentes avec statuts
  - Offres sauvegardées
  - Indicateur de complétude du profil
  - Actions rapides et conseils

- Page Profil Candidat (`/profil`)
  - Formulaire infos personnelles
  - Profil professionnel (titre, bio, niveau)
  - Upload CV (Supabase Storage)
  - Compétences (ajout/suppression dynamique)
  - Expériences professionnelles (CRUD)
  - Formations (CRUD)
  - Liens (LinkedIn, Portfolio)
  - Prétentions salariales

---

## ACTOOS Jobs - Prochaines Étapes

### P0 - MVP (Priorité Haute)
1. **Dashboard Entreprise**
   - Profil entreprise
   - Publication d'offres d'emploi
   - Gestion des candidatures reçues

2. **Page Détail Offre**
   - Affichage complet de l'offre
   - Bouton "Postuler"
   - Sauvegarde en favoris

3. **Flux de Candidature**
   - Formulaire de candidature
   - Upload CV/Lettre de motivation
   - Suivi des candidatures

### P1 - Post-MVP
- Dashboard Admin (modération)
- Stripe Integration (plans freemium)
- Multilingue (Bambara, Anglais)
- SEO URLs localisées

### P2 - Évolutions
- PWA (Progressive Web App)
- Matching IA candidat/offre
- Chat temps réel
- Alertes email personnalisées

---

## Fichiers Clés - ACTOOS Jobs

```
/app/actoos-jobs/frontend/
├── src/
│   ├── pages/
│   │   ├── Homepage.jsx
│   │   ├── JobsPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── CandidateDashboard.jsx ✅
│   │   └── CandidateProfilePage.jsx ✅
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── supabase.js
│   │   └── utils.js
│   └── App.js
├── docs/
│   ├── SCHEMA.sql
│   └── PRD.md
└── .env (Supabase keys)
```

---

## Credentials Test - ACTOOS Jobs
- Supabase Project: anfamlpwootbrzswnpyp.supabase.co
- Test Account: Créer via `/inscription` (Email confirmation requise)

---

## Notes Techniques

1. **Supervisor Config**: Le frontend doit utiliser `react-scripts` directement, pas `yarn start` (conflit avec l'ancien craco d'actoos-pro)

2. **RLS Policies**: Toutes les tables ont RLS activé. Les candidats peuvent voir/modifier uniquement leurs propres données.

3. **Email Confirmation**: Activée dans Supabase Auth. Les utilisateurs doivent confirmer leur email pour se connecter.

---

**Dernière mise à jour**: 26 Mai 2026
