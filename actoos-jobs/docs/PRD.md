# ACTOOS JOBS - Product Requirements Document

## Vision Produit
Plateforme de recrutement moderne et internationale - "Indeed nouvelle génération" pour le Mali.

---

## Architecture

### Stack Technique
- **Frontend**: React 18 + Tailwind CSS 3.4 + Shadcn/UI
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **Paiements**: Stripe (prévu)
- **Déploiement**: Vercel (jobs.actoos.com)

### Structure du Repo
```
/app/actoos-jobs/
├── frontend/              ← React Application
│   ├── src/
│   │   ├── components/    (Header, UI components)
│   │   ├── pages/         (Homepage, Jobs, Auth, Dashboard)
│   │   ├── contexts/      (Auth context - à créer)
│   │   ├── lib/           (utils, supabase client - à créer)
│   │   └── hooks/         (custom hooks - à créer)
│   └── public/
└── docs/                  ← Documentation
```

---

## Configuration

### Pays de lancement
- **Mali** 🇲🇱 (Bamako, Sikasso, Mopti, Koutiala, Ségou, Kayes, Gao, etc.)

### Langue
- Français uniquement (pour l'instant)

### Devise
- FCFA (Franc CFA)

---

## Fonctionnalités Implémentées

### Phase 1 - MVP Frontend (EN COURS)

#### ✅ Homepage (FAIT - 23 Mai 2026)
- [x] Hero section premium avec gradient bleu
- [x] Moteur de recherche (mot-clé + ville)
- [x] Recherches populaires
- [x] Stats (offres, entreprises, candidats)
- [x] Catégories d'emploi (12 secteurs)
- [x] Offres récentes (mock data)
- [x] Section "Comment ça marche"
- [x] CTA Entreprises
- [x] Section avantages
- [x] Témoignages
- [x] Footer complet

#### ✅ Navigation/Header (FAIT)
- [x] Logo Actoos Jobs
- [x] Menu desktop (Emplois, Entreprises, Tarifs, Blog)
- [x] Boutons Connexion/Inscription/Recruter
- [x] Menu mobile responsive
- [x] Header transparent sur homepage, solid ailleurs
- [x] Effet scroll (header devient solid)

#### 🔲 Pages Placeholders (Structure créée)
- [ ] /emplois - Recherche d'emplois
- [ ] /emplois/:id - Détail offre
- [ ] /entreprises - Annuaire entreprises
- [ ] /tarifs - Page tarifs
- [ ] /blog - Blog/conseils
- [ ] /connexion - Login
- [ ] /inscription - Register candidat
- [ ] /entreprises/inscription - Register entreprise

---

## À Implémenter (MVP Prioritaire)

### Phase 2 - Auth & Profils
- [ ] Intégration Supabase Auth
- [ ] Connexion email/password
- [ ] Connexion Google OAuth
- [ ] Vérification email
- [ ] Page inscription candidat
- [ ] Page inscription entreprise
- [ ] Profil candidat complet
- [ ] Profil entreprise complet

### Phase 3 - Jobs & Search
- [ ] Page recherche d'emplois avec filtres
- [ ] Fiche offre détaillée
- [ ] Candidature rapide
- [ ] Sauvegarde d'offres

### Phase 4 - Dashboards
- [ ] Dashboard candidat
- [ ] Dashboard entreprise
- [ ] Dashboard admin

### Phase 5 - Monétisation
- [ ] Page tarifs
- [ ] Intégration Stripe
- [ ] Abonnements entreprises
- [ ] Boosts d'annonces

---

## Design System

### Couleurs
```css
--primary: #1e40af (Bleu foncé)
--primary-light: #3b82f6 (Bleu clair)
--accent: #22c55e (Vert)
--background: #ffffff
--foreground: #0f172a
--muted: #64748b
```

### Typographie
- **Titres**: Manrope (font-display)
- **Corps**: Inter (font-sans)

### Style
- Moderne, premium, mobile-first
- Cartes avec hover effects
- Gradients subtils
- Animations légères

---

## Schéma Base de Données (Prévu)

### Tables principales
- users (candidats + entreprises)
- companies
- jobs
- applications
- saved_jobs
- subscriptions
- payments
- notifications

---

## Configuration Supabase

**Status**: En attente des credentials utilisateur
- URL Supabase: (à fournir)
- Anon Key: (à fournir)

---

## Prochaines étapes

1. **Utilisateur fournit credentials Supabase**
2. Intégrer Supabase Auth
3. Créer pages Auth (login/register)
4. Implémenter profils candidat/entreprise
5. Créer page recherche d'emplois

---

**Dernière mise à jour**: 26 Mai 2026
