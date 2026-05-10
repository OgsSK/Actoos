# Guide de Démarrage - ACTOOS PRO

## Structure du Projet

Le repo contient plusieurs projets. **ACTOOS PRO** est composé de :

```
/frontend/     <-- Application React (PWA)
/backend/      <-- API FastAPI (Python)
/supabase/     <-- Edge Functions Supabase
```

**Ignorer ces dossiers** (autres projets) :
- `/actoos-one/` et `/actoos-one-backup/` - Autre projet (PAUSED)
- `/vitrine/` - Site vitrine Next.js

---

## Prérequis

- **Node.js** >= 20.0.0
- **Python** >= 3.10
- **Yarn** (pas npm)
- Accès au projet **Supabase** (demander les clés à Salif)

---

## Étape 1 : Cloner le repo

```bash
git clone https://github.com/[VOTRE_REPO]/actoos.git
cd actoos
```

---

## Étape 2 : Configuration des variables d'environnement

### Frontend (`/frontend/.env`)

Créer le fichier `/frontend/.env` :

```env
REACT_APP_SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
REACT_APP_SUPABASE_ANON_KEY=[DEMANDER_A_SALIF]
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Backend (`/backend/.env`)

Créer le fichier `/backend/.env` :

```env
# Supabase
SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
SUPABASE_SERVICE_KEY=[DEMANDER_A_SALIF]
SUPABASE_JWT_SECRET=[DEMANDER_A_SALIF]

# CORS (autoriser le frontend local)
CORS_ORIGINS=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=[DEMANDER_A_SALIF]
EMAIL_FROM=noreply@actoos.com

# Stripe (optionnel pour le dev)
STRIPE_SECRET_KEY=[DEMANDER_A_SALIF]
STRIPE_WEBHOOK_SECRET=[DEMANDER_A_SALIF]
```

---

## Étape 3 : Installation des dépendances

### Frontend

```bash
cd frontend
yarn install
```

### Backend

```bash
cd backend
python -m venv venv

# Sur Mac/Linux :
source venv/bin/activate

# Sur Windows :
venv\Scripts\activate

pip install -r requirements.txt
```

---

## Étape 4 : Démarrer les serveurs

### Terminal 1 - Backend (port 8001)

```bash
cd backend
source venv/bin/activate   # ou venv\Scripts\activate sur Windows
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Le backend sera accessible sur : `http://localhost:8001`

### Terminal 2 - Frontend (port 3000)

```bash
cd frontend
yarn start
```

Le frontend sera accessible sur : `http://localhost:3000`

---

## Étape 5 : Tester l'application

1. Ouvrir `http://localhost:3000` dans le navigateur
2. Se connecter avec les identifiants de test :
   - Email: `contact@actoos.com`
   - Password: `Salifkane&&7`

---

## Architecture Technique

### Frontend (React PWA)
- **Framework** : React 18 avec Create React App
- **UI** : Tailwind CSS + Shadcn/UI
- **État** : Context API (AuthContext)
- **Auth** : Supabase Auth avec session persistence
- **Routing** : React Router v6

### Backend (FastAPI)
- **Framework** : FastAPI (Python)
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : JWT via Supabase
- **Email** : Resend
- **Paiements** : Stripe

### Pages principales
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Connexion |
| `/dashboard` | Tableau de bord admin |
| `/tech` | Interface technicien (PWA mobile) |
| `/interventions` | Gestion interventions |
| `/clients` | Gestion clients |
| `/devis` | Devis |
| `/factures` | Factures |

---

## Commandes utiles

```bash
# Linter frontend
cd frontend && yarn lint

# Linter backend
cd backend && ruff check .

# Build production frontend
cd frontend && yarn build
```

---

## Problèmes courants

### "Module not found" sur le frontend
```bash
cd frontend
rm -rf node_modules yarn.lock
yarn install
```

### Erreur CORS
Vérifier que `CORS_ORIGINS` dans `/backend/.env` contient `http://localhost:3000`

### Erreur Supabase 401
Les clés Supabase sont incorrectes ou expirées. Demander les nouvelles clés à Salif.

---

## Contact

Pour les clés API et questions : contacter **Salif** (propriétaire du projet)
