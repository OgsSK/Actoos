# ACTOOS - Product Requirements Documents

## Projets

### 1. ACTOOS PRO (EN PAUSE)
Application SaaS B2B de gestion d'interventions terrain pour les entreprises de services en Europe.

**Status**: EN PAUSE - Projet temporairement suspendu pour développer ACTOOS Jobs

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

### ✅ Phase 1.3 - Dashboard Candidat
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

### ✅ Phase 1.4 - Dashboard Entreprise (Aujourd'hui)
- Dashboard Entreprise (`/dashboard/entreprise`)
  - Stats: offres publiées, candidatures, nouvelles candidatures, vues
  - Liste des offres d'emploi avec actions (modifier, supprimer, pause/republier)
  - Candidatures récentes
  - Profil entreprise résumé
  - Indicateur plan abonnement

- Page Création Entreprise (`/dashboard/entreprise/creer`)
  - Upload logo
  - Informations de base (nom, description, secteur, taille)
  - Coordonnées (site web, email, téléphone)
  - Localisation (ville, adresse)

- Page Publication Offre (`/dashboard/entreprise/offres/nouvelle`)
  - Informations de base (titre, catégorie, type contrat, expérience)
  - Description complète (description, missions, profil recherché, avantages)
  - Compétences requises (ajout dynamique)
  - Localisation et télétravail
  - Rémunération
  - Dates (deadline, date début)
  - Publication en brouillon ou directe

### ✅ Phase 1.5 - Page Détail Offre & Candidature
- Page Détail Offre (`/emplois/:id`)
  - Header avec logo entreprise, titre, badges (urgent, featured)
  - Infos: type contrat, expérience, salaire, postes disponibles, deadline
  - Sections: description, missions, profil, avantages, compétences
  - Carte entreprise avec lien vers profil
  - Offres similaires
  - Actions: Postuler, Sauvegarder, Partager

- Modal Candidature
  - Message de motivation optionnel
  - CV joint automatiquement
  - Vérification si déjà postulé

---

## ACTOOS Jobs - Prochaines Étapes

### P0 - MVP (En cours)
1. ✅ Dashboard Candidat
2. ✅ Dashboard Entreprise
3. ✅ Page Détail Offre + Candidature
4. ⏳ **Tests complets et validation** (À faire)
5. ⏳ **Exécuter MVP_P0_SETUP.sql** dans Supabase (À faire par l'utilisateur)

### P1 - Post-MVP
- Dashboard Admin (modération offres, validation entreprises)
- Stripe Integration (plans freemium: Basic, Pro, Business)
- Multilingue (Bambara, Anglais)
- SEO URLs localisées (/ml/emplois/bamako)
- Notifications email (nouvelles offres, candidatures)

### P2 - Évolutions
- PWA (Progressive Web App)
- Matching IA candidat/offre
- Chat temps réel employeur/candidat
- Alertes email personnalisées
- Analytics avancées

---

## Fichiers Clés - ACTOOS Jobs

```
/app/actoos-jobs/frontend/
├── src/
│   ├── pages/
│   │   ├── Homepage.jsx
│   │   ├── JobsPage.jsx
│   │   ├── JobDetailPage.jsx ✅ NEW
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── CandidateDashboard.jsx
│   │   ├── CandidateProfilePage.jsx
│   │   ├── CompanyDashboard.jsx ✅ NEW
│   │   ├── CreateCompanyPage.jsx ✅ NEW
│   │   └── CreateJobPage.jsx ✅ NEW
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── supabase.js
│   │   └── utils.js
│   └── App.js
├── docs/
│   ├── SCHEMA.sql
│   ├── FIX_RLS.sql
│   ├── DISABLE_TRIGGER.sql
│   ├── MVP_P0_SETUP.sql ✅ NEW (À exécuter)
│   └── PRD.md
└── .env (Supabase keys)
```

---

## Routes Actives

### Publiques
- `/` - Homepage
- `/emplois` - Recherche d'emploi
- `/emplois/:id` - Détail offre
- `/connexion` - Login
- `/inscription` - Register

### Protégées (Candidat)
- `/dashboard` - Dashboard candidat
- `/dashboard/candidat` - Dashboard candidat
- `/profil` - Profil candidat

### Protégées (Entreprise)
- `/dashboard/entreprise` - Dashboard entreprise
- `/dashboard/entreprise/creer` - Créer entreprise
- `/dashboard/entreprise/offres/nouvelle` - Publier offre
- `/dashboard/entreprise/offres/:id/modifier` - Modifier offre

---

## Action Requise par l'Utilisateur

Exécuter le fichier SQL `/app/actoos-jobs/docs/MVP_P0_SETUP.sql` dans l'éditeur SQL de Supabase pour:
- Créer la table `saved_jobs` (favoris)
- Créer les fonctions RPC (`increment_job_views`, `increment_applications_count`)
- Ajouter les buckets Storage (company-logos, cvs)
- Configurer les RLS policies pour entreprises, offres et candidatures
- Insérer les catégories d'emploi et villes

---

## Notes Techniques

1. **Supervisor Config**: Frontend utilise `react-scripts` directement via `/app/actoos-jobs/frontend/node_modules/.bin/react-scripts start`

2. **RLS Policies**: Toutes les tables ont RLS activé. Fallback côté frontend si les fonctions RPC n'existent pas encore.

3. **Email Confirmation**: Activée dans Supabase Auth.

4. **Storage Buckets**: Requis pour upload CV et logos entreprise.

---

**Dernière mise à jour**: 26 Mai 2026
