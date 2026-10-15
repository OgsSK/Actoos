# Actoos ID — Vision, Architecture et Plan de Migration

> **Statut :** En cours de mise en œuvre
> **Dernière mise à jour :** 11 septembre 2026
> **Responsable :** Équipe Actoos
> **Version :** 1.0

---

## 1. Vision

### 1.1 Le problème

Aujourd'hui, chaque produit Actoos fonctionne en silo :
- **Actoos Jobs** a sa propre authentification (Supabase Auth)
- **Actoos Studio** (dashboard client) utilise un système par token
- **Actoos Admin** utilise un mot de passe en dur
- **Actoos Pro** (à venir) aura sa propre auth

**Conséquences :**
- Un utilisateur doit jongler entre plusieurs identités
- Ajouter un nouveau produit = 2 semaines de dev auth
- Impossible de faire du SSO
- Pas d'expérience "écosystème"

### 1.2 La solution : Actoos ID

**Actoos ID** est l'infrastructure d'identité unique pour tous les produits Actoos.

**Principes :**
1. **Un compte unique** pour tous les produits
2. **La vitrine ne fait pas d'auth** — elle pointe vers Actoos ID
3. **SSO cross-domain** via cookie `.actoos.com`
4. **Multi-comptes** (switch entre comptes comme Google)
5. **Progressif** — chaque produit migre indépendamment

### 1.3 Ce que ça permet

| Avant | Après |
|-------|-------|
| 4 systèmes d'auth séparés | 1 système central |
| Un compte par produit | Un compte pour tout |
| Ajout produit = 2 semaines | Ajout produit = 1 jour |
| Pas de SSO | SSO natif |
| Duplication de code | Code partagé |

---

## 2. État actuel (11 sept. 2026)

### 2.1 Ce qui existe

| Composant | Technologie | Auth actuelle |
|-----------|-------------|---------------|
| **actoos-jobs** | React SPA (CRA 5) + FastAPI | Supabase Auth (complète) |
| **vitrine** (actoos.com) | Next.js 14 App Router | Aucune |
| **Studio** (dashboard client) | Next.js | Token dans l'URL |
| **Admin** | Next.js | Mot de passe en dur |
| **actoos-pro** | À venir | — |

### 2.2 Le package partagé (nouveau)

**Emplacement :** `packages/auth-client/`

**Contenu :**
packages/auth-client/
├── src/
│ ├── client.ts → createAuthClient (config Supabase)
│ ├── core.ts → createAuthCore (signIn, signUp, etc.)
│ ├── apiAuth.ts → createApiAuth (fetch authentifié)
│ ├── enrich.ts → buildBaseProfile + enrichProfile
│ ├── roles.ts → isAdmin, isCompany, isCandidate
│ ├── types.ts → Types TypeScript partagés
│ └── index.ts → exports publics
├── package.json
└── tsconfig.json

text

**Statut :** ✅ Créé, buildé, testé dans actoos-jobs

### 2.3 Monorepo

**Structure :**
~/Desktop/actoos/Actoos/
├── package.json (workspaces)
├── package-lock.json (lockfile unique)
├── .gitignore (propre, 68 lignes)
├── packages/
│ └── auth-client/ (nouveau)
├── actoos-jobs/
│ └── frontend/ (React SPA)
├── vitrine/ (Next.js)
└── actoos-pro/ (à venir)

text

**Workspaces npm :**
```json
"workspaces": [
  "packages/*",
  "actoos-jobs/frontend",
  "vitrine"
]
3. Architecture cible
3.1 Schéma d'ensemble
text
                  ┌─────────────────────────────┐
                  │      actoos.com             │
                  │      (VITRINE)              │
                  │                             │
                  │  Pas d'auth                 │
                  │  Bouton "Se connecter" ───┐ │
                  └───────────────────────────┼─┘
                                              │
                                              ▼
                  ┌─────────────────────────────┐
                  │      id.actoos.com          │
                  │      (IDENTITÉ)             │
                  │                             │
                  │  Login / Register           │
                  │  Mon compte / Mes produits  │
                  │  Multi-comptes              │
                  └───────────┬─────────────────┘
                              │
                              │ SSO cookie .actoos.com
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ jobs.actoos  │   │ pro.actoos   │   │ studio       │
│ (produit)    │   │ (produit)    │   │ (dashboard)  │
└──────────────┘   └──────────────┘   └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Supabase Auth   │
                    │  + tables users  │
                    │  + companies     │
                    │  + memberships   │
                    └──────────────────┘
3.2 Domaines
Domaine	Rôle	Auth
actoos.com	Vitrine marketing	❌
id.actoos.com	Identité centrale	✅
jobs.actoos.com	Produit Jobs	✅ (via Actoos ID)
pro.actoos.com	Produit Pro (futur)	✅ (via Actoos ID)
actoos.com/studio	Sur-mesure	✅ (via Actoos ID)
actoos.com/admin	Admin interne	✅ (via Actoos ID)
3.3 Le package partagé
Principe : une seule source de vérité pour la logique d'auth.

text
@actoos/auth-client
       │
       ├──→ actoos-jobs (React SPA)
       ├──→ vitrine (Next.js)
       ├──→ id.actoos.com (Next.js)
       └──→ actoos-pro (futur)
Ce qui est partagé :

Client Supabase configuré

Fonctions d'auth pures

Types TypeScript

Logique de rôles

Enrichissement du profil

Ce qui n'est pas partagé :

Composants UI (React SPA vs Next.js)

Hooks React spécifiques

Routage

4. Plan de migration
Phase 1 — Fondations ✅ TERMINÉE
Objectif : créer le package partagé

Actions :

☑ Créer packages/auth-client/
☑ Implémenter les 6 modules (client, core, apiAuth, enrich, roles, types)
☑ Configurer le build TypeScript
☑ Configurer npm workspaces
☑ Configurer craco pour actoos-jobs
☑ Hoister tailwind/postcss à la racine
☑ Tester l'import dans actoos-jobs
Résultat : package fonctionnel, testé, commité (921e2019)

Phase 2 — Migration d'actoos-jobs 🔄 EN COURS
Objectif : actoos-jobs utilise @actoos/auth-client

Actions :

□ Modifier AuthContext.jsx pour utiliser createAuthClient + createAuthCore
□ Remplacer apiAuth.js par createApiAuth du package
□ Remplacer buildBaseProfile / enrichProfile par ceux du package
□ Tester : login, register, reset password, logout
□ Tester : enrichissement du profil (companies, roles)
□ Tester : apiFetchAuth vers FastAPI
□ Nettoyer les fichiers dupliqués
Durée estimée : 2-3 jours

Critère de succès : actoos-jobs fonctionne exactement comme avant, mais utilise le package.

Phase 3 — Branchement de la vitrine (Studio)
Objectif : le Studio utilise @actoos/auth-client

Actions :

□ Créer un AuthProvider Next.js qui utilise le package
□ Remplacer le système par token par une vraie auth
□ Créer /studio/login, /studio/register, /studio/account
□ Migrer l'admin (password → Actoos ID)
Durée estimée : 3-5 jours

Critère de succès : Studio utilise Actoos ID au lieu du token.

Phase 4 — Création d'id.actoos.com
Objectif : portail d'identité dédié

Actions :

□ Créer une app Next.js apps/id/
□ Utiliser @actoos/auth-client
□ Pages : login, register, forgot, reset, account, projects
□ Configurer cookie .actoos.com (SSO cross-domain)
□ Rediriger les apps vers id.actoos.com pour l'auth
Durée estimée : 1-2 semaines

Critère de succès : un login sur id.actoos.com → connecté sur jobs.actoos.com et pro.actoos.com.

Phase 5 — Fonctionnalités avancées
Objectif : améliorer l'expérience

Actions :

□ Multi-comptes : switch entre comptes (comme Google)
□ Ajouter un compte : connecter plusieurs comptes simultanément
□ Déconnexion sélective : logout d'un compte ou de tous
□ 2FA : authentification à deux facteurs
□ OAuth : connexion Google, Microsoft, Apple
□ Magic link : connexion par email sans mot de passe
□ Organisations : gestion d'équipe multi-utilisateurs
□ Invitations : inviter des membres par email
Durée estimée : 2-3 semaines

5. Détails techniques
5.1 Le package @actoos/auth-client
Utilisation :

typescript
import {
  createAuthClient,
  createAuthCore,
  createApiAuth,
  isAdmin,
  isCompany,
  isCandidate,
} from '@actoos/auth-client';

// 1. Créer le client
const client = createAuthClient({
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL!,
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY!,
  appName: 'jobs',  // ou 'vitrine', 'pro', 'id'
});

// 2. Créer les fonctions d'auth
const auth = createAuthCore(client);

// 3. Créer le fetch authentifié
const apiAuth = createApiAuth(client, 'https://api.actoos.com');

// 4. Utiliser
await auth.signIn({ email, password });
await auth.signUp({ email, password, firstName, lastName, role: 'candidate' });
await auth.signOut();
await apiAuth.apiFetchAuth('/api/user/language');
5.2 Configuration de Supabase
Tables concernées :

users (id, email, role, first_name, last_name, language, preferences)

companies (id, name, owner_id, subscription_plan)

company_members (company_id, user_id, role, status)

candidate_profiles (user_id, title, skills, experience)

Supabase Auth gère :

Inscription / Connexion

Reset password

Google OAuth

Sessions JWT

Le package Actoos ID gère :

Configuration du client Supabase

Enrichissement du profil (jointures SQL)

Logique de rôles

Fetch authentifié vers FastAPI

5.3 Variables d'environnement
actoos-jobs (React SPA / CRA) :

text
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxx
REACT_APP_API_URL=https://actoos-jobs-api.onrender.com
vitrine (Next.js) :

text
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
NEXT_PUBLIC_APP_URL=https://actoos.com
id.actoos.com (Next.js) :

text
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
NEXT_PUBLIC_APP_NAME=id
5.4 SSO cross-domain (Phase 4)
Principe : un cookie sur .actoos.com est accessible depuis tous les sous-domaines.

Configuration Supabase :

typescript
createClient(url, key, {
  auth: {
    storage: customCookieStorage,  // Cookie au lieu de localStorage
    storageKey: 'actoos-auth',
    cookieOptions: {
      domain: '.actoos.com',
      secure: true,
      sameSite: 'lax',
    },
  },
});
Flux :

Utilisateur se connecte sur id.actoos.com

Cookie actoos-auth posé sur .actoos.com

Utilisateur va sur jobs.actoos.com

Le cookie est lu → utilisateur connecté automatiquement

5.5 Multi-comptes (Phase 5)
Principe : plusieurs tokens stockés, un seul actif.

Structure :

typescript
{
  accounts: [
    { userId: 'user1', token: 'xxx', email: 'perso@email.com' },
    { userId: 'user2', token: 'yyy', email: 'pro@email.com' },
  ],
  activeUserId: 'user1',
}
Opérations :

switchAccount(userId) → change le compte actif

addAccount() → ouvre le login, ajoute un compte

removeAccount(userId) → retire un compte

signOutCurrent() → déconnexion du compte actif uniquement

signOutAll() → déconnexion de tous les comptes

6. Décisions techniques
6.1 Décisions prises
Décision	Choix	Date	Raison
Monorepo	✅ Oui	11/09/26	Partage de code
Gestionnaire de paquets	npm workspaces	11/09/26	Simplicité, pas de nouvelle dépendance
Langage du package	TypeScript	11/09/26	Sécurité des types
Base d'auth	Supabase Auth	11/09/26	Déjà en place dans Jobs
SSO	Cookie .actoos.com	À venir	Standard de l'industrie
Multi-comptes	Oui (Phase 5)	À venir	UX Google-like
6.2 Décisions en attente
Inscription publique ou sur invitation ? (à décider avant Phase 4)

Modèle organisation vs utilisateur ? (à décider avant Phase 5)

2FA obligatoire ou optionnel ? (à décider avant Phase 5)

OAuth providers ? (Google uniquement, ou aussi Microsoft/Apple)

6.3 Ce qu'on ne fait PAS
❌ Pas d'auth sur la vitrine (actoos.com)

❌ Pas de refonte complète d'actoos-jobs

❌ Pas de migration cassante

❌ Pas de fonctionnalités avant que la base soit solide

7. Roadmap
Phase	Description	Durée	Statut
1	Fondations (package)	1 j	✅ Terminé
2	Migration actoos-jobs	2-3 j	🔄 En cours
3	Branchement vitrine	3-5 j	⏳ À venir
4	id.actoos.com + SSO	1-2 sem	⏳ À venir
5	Multi-comptes + 2FA	2-3 sem	⏳ À venir
Total estimé : 6-8 semaines de travail.

8. Backup et réversibilité
8.1 Points de restauration
Élément	Référence
Commit initial	1d554dee
Branche backup	backup-actoos-id
Tag backup	pre-actoos-id-2026-09-11
Archive physique	~/Desktop/Actoos-backup-2026-09-11.tar.gz
8.2 Comment revenir en arrière
Option 1 — Revenir au commit :

bash
git checkout 1d554dee
Option 2 — Revenir à la branche backup :

bash
git checkout backup-actoos-id
Option 3 — Restaurer l'archive :

bash
cd ~/Desktop/actoos/
mv Actoos Actoos-casse
tar -xzf Actoos-backup-2026-09-11.tar.gz
9. Ressources
9.1 Fichiers clés
Fichier	Rôle
packages/auth-client/src/index.ts	Point d'entrée du package
packages/auth-client/src/core.ts	Fonctions d'auth principales
packages/auth-client/src/enrich.ts	Enrichissement du profil
actoos-jobs/frontend/src/contexts/AuthContext.jsx	Wrapper React (à migrer)
actoos-jobs/frontend/craco.config.js	Config Webpack
package.json (racine)	Workspaces
9.2 Commandes utiles
bash
# Build du package
npm run build:auth

# Dev du package (watch)
npm run dev:auth

# Démarrer actoos-jobs
npm run dev:jobs

# Démarrer la vitrine
npm run dev:vitrine

# Réinstaller tout
rm -rf node_modules */node_modules */*/node_modules
npm install
9.3 En cas de problème
Le package ne se charge pas :

Vérifier node_modules/@actoos/auth-client (symlink)

Vérifier packages/auth-client/dist/ (build fait)

Relancer npm install

Tailwind ne fonctionne pas :

Vérifier node_modules/tailwindcss/package.json → 3.4.4

Vérifier postcss.config.js existe dans l'app

Vérifier .env avec SKIP_PREFLIGHT_CHECK=true

craco ne démarre pas :

Vérifier craco dans package.json scripts

Vérifier node_modules/@craco/craco

Utiliser npx craco start

10. Contacts et responsabilités
Rôle	Responsable
Vision produit	Équipe Actoos
Architecture technique	Équipe Actoos
Développement	Équipe Actoos
DevOps / Infrastructure	À définir
Fin du document.

text

---

## 📋 Étape 4 — Sauvegarder et commit

Une fois le contenu collé dans `docs/actoos-id.md` :

```bash
cd ~/Desktop/actoos/Actoos/

# 1. Vérifier le fichier
wc -l docs/actoos-id.md
head -20 docs/actoos-id.md

# 2. Commit
git add docs/actoos-id.md
git commit -m "docs: add Actoos ID vision and migration plan

- Vision de l'identité centralisée pour tous les produits
- Architecture cible (id.actoos.com + SSO cross-domain)
- Plan de migration en 5 phases
- Détails techniques (package, Supabase, multi-comptes)
- Roadmap et backup

Documentation de référence pour toute la migration."
