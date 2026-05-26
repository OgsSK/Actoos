# ACTOOS JOBS - Product Requirements Document

## Vision Produit
Plateforme de recrutement moderne et internationale - "Indeed nouvelle génération" pour le Mali 🇲🇱

---

## Configuration

### Supabase
- **URL**: https://anfamlpwootbrzswnpyp.supabase.co
- **Anon Key**: Configuré dans .env

### Pays de lancement
- Mali (Bamako, Sikasso, Mopti, Koutiala, Ségou, Kayes, Gao, etc.)

### Langue
- Français

### Devise
- FCFA (Franc CFA)

---

## Fonctionnalités Implémentées

### ✅ Phase 1 - MVP Frontend (FAIT - 26 Mai 2026)

#### Homepage
- [x] Hero section premium avec gradient bleu
- [x] Moteur de recherche (mot-clé + ville)
- [x] Stats (offres, entreprises, candidats)
- [x] 12 catégories d'emploi avec icônes
- [x] Offres récentes avec badges
- [x] Section "Comment ça marche"
- [x] CTA Entreprises
- [x] Témoignages
- [x] Footer complet

#### Page Recherche d'emplois (/emplois)
- [x] Barre de recherche sticky
- [x] Filtres sidebar (contrat, ville, salaire, expérience, catégorie)
- [x] Cartes offres avec badges (Mise en avant, Urgent, Télétravail)
- [x] Infos: entreprise, ville, contrat, salaire FCFA, compétences
- [x] Boutons favoris et voir offre
- [x] Tri par date/salaire
- [x] Filtres actifs avec badges
- [x] Version mobile avec modal filtres

#### Authentification
- [x] Page connexion (/connexion)
  - Bouton Google OAuth
  - Formulaire email/mot de passe
  - Lien mot de passe oublié
- [x] Page inscription (/inscription)
  - Étape 1: Choix du profil (Candidat/Entreprise)
  - Étape 2: Formulaire complet
  - Bouton Google OAuth
- [x] AuthContext avec Supabase
- [x] Routes protégées

---

## À Configurer dans Supabase

### IMPORTANT: Exécuter le schéma SQL

Le fichier `/app/actoos-jobs/docs/SCHEMA.sql` doit être exécuté dans **Supabase SQL Editor** pour créer :

1. Tables:
   - users, candidate_profiles, companies, company_members
   - jobs, applications, saved_jobs, job_alerts
   - countries, cities, job_categories, notifications

2. Enums:
   - user_role, job_status, application_status
   - contract_type, experience_level, subscription_plan

3. Triggers:
   - Création automatique du profil user après inscription
   - Création automatique du profil candidat

4. Politiques RLS (Row Level Security)

5. Données initiales:
   - Mali + 10 villes
   - 12 catégories d'emploi

### Configuration Google OAuth (optionnel)

1. Google Cloud Console → Créer projet
2. APIs & Services → Credentials → OAuth 2.0
3. Redirect URI: `https://anfamlpwootbrzswnpyp.supabase.co/auth/v1/callback`
4. Supabase Dashboard → Authentication → Providers → Google
5. Coller Client ID et Client Secret

---

## Prochaines étapes (MVP Phase 2)

### En attente de création des tables Supabase:
- [ ] Test complet de l'authentification
- [ ] Page profil candidat avec CV upload
- [ ] Page profil entreprise
- [ ] Dashboard candidat
- [ ] Dashboard entreprise
- [ ] Publication d'offres (vraies données)

### Phase 3:
- [ ] Page détail offre
- [ ] Système de candidature
- [ ] Notifications
- [ ] Dashboard admin

### Phase 4:
- [ ] Abonnements Stripe
- [ ] Boosts d'annonces
- [ ] Alertes emploi

---

## Structure du projet

```
/app/actoos-jobs/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           (Shadcn components)
│   │   │   └── Header.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   └── utils.js
│   │   ├── pages/
│   │   │   ├── Homepage.jsx
│   │   │   ├── JobsPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── App.js
│   │   └── index.css
│   └── .env
└── docs/
    ├── PRD.md
    └── SCHEMA.sql
```

---

**Dernière mise à jour**: 26 Mai 2026
