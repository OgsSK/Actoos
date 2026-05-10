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
- **Yarn** (pas npm) - Installer avec `npm install -g yarn`
- **Git**

---

## Étape 1 : Cloner le repo

```bash
git clone https://github.com/[VOTRE_REPO]/actoos.git
cd actoos
```

---

## Étape 2 : Configuration des variables d'environnement

### Frontend (`/frontend/.env`)

Créer le fichier `/frontend/.env` avec ce contenu :

```env
REACT_APP_SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Backend (`/backend/.env`)

Créer le fichier `/backend/.env` avec ce contenu :

```env
# Base de données locale (pour dev)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"

# CORS - Ajouter localhost pour le dev
CORS_ORIGINS="http://localhost:3000,https://pro.actoos.com,https://actoos.com,https://www.actoos.com"

# Supabase PostgreSQL
SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
SUPABASE_KEY=sb_secret_Ko7Bmqkiql9GXZW9z4IOiA_gb2rU5UV
DATABASE_URL=postgresql://postgres:j5GWgugTM1lA9iXK@db.zmngftlkdimwvkxmduvr.supabase.co:5432/postgres

# JWT Secret (doit correspondre à Supabase Edge Function)
JWT_SECRET_KEY=actoos-pro-secret-key-2024-super-secure

# Email (Resend)
RESEND_API_KEY=re_HSsCQxUj_HvzYvhZDoJzEHBciWmYDU3ZR
SENDER_EMAIL=noreply@actoos.com

# Stripe Paiements (LIVE - Attention!)
STRIPE_API_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_xtMUxHFtjs9VK715Nk16HHJVXnxhYmpt

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=BDEosOMy7hCZHnWBDqZu4tXgkG20SA8TPnpRVFKa9mDCjUBJeoNM9BZHTAbQWHjCtlnOHnLOZba7KiaBDH913mk
VAPID_PRIVATE_KEY=KzQjovJG3M3RJddeEfl-ZiLpalP9eNRjZhCV4DLN93M
VAPID_SUBJECT=mailto:support@actoos.com

# Redis (Upstash)
REDIS_URL=redis://default:gQAAAAAAAcWkAAIgcDIwMDIyZmZlMmZhZGU0MTQzYjlmYjhjM2U3MzhjMDdlMA@sure-dane-116132.upstash.io:6379

# Google Calendar OAuth
GOOGLE_CLIENT_ID=911847023552-ie19kpvng5hr3158g8oi93ucv7cnv14e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://actoos.com/api/calendar/callback

# Twilio SMS (Numéro à configurer)
TWILIO_ACCOUNT_SID=AC2a7c4efff4c2804c04389201afa13f25
TWILIO_AUTH_TOKEN=af95881a8a937ae79a546b1ac59bde99
TWILIO_PHONE_NUMBER=+32XXXXXXXXX

# S3/Cloudflare R2 Storage (optionnel)
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=actoos-files
S3_PUBLIC_URL=
S3_REGION=auto

# LLM Key (Emergent)
EMERGENT_LLM_KEY=sk-emergent-09805Bb39Ab57C6A7C
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

# Créer environnement virtuel Python
python -m venv venv

# Activer l'environnement virtuel
# Sur Mac/Linux :
source venv/bin/activate

# Sur Windows :
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

---

## Étape 4 : Démarrer les serveurs

**Ouvrir 2 terminaux séparés :**

### Terminal 1 - Backend (port 8001)

```bash
cd backend
source venv/bin/activate   # ou venv\Scripts\activate sur Windows
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Tu devrais voir :
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### Terminal 2 - Frontend (port 3000)

```bash
cd frontend
yarn start
```

Tu devrais voir :
```
Compiled successfully!
You can now view frontend in the browser.
  Local:            http://localhost:3000
```

---

## Étape 5 : Tester l'application

1. Ouvrir `http://localhost:3000` dans le navigateur
2. Se connecter avec :
   - **Email:** `contact@actoos.com`
   - **Password:** `Salifkane&&7`

---

## Pages principales

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

# Build production frontend
cd frontend && yarn build

# Arrêter les serveurs
# CTRL + C dans chaque terminal
```

---

## Problèmes courants

### "Module not found" sur le frontend
```bash
cd frontend
rm -rf node_modules yarn.lock
yarn install
```

### "Command not found: yarn"
```bash
npm install -g yarn
```

### Erreur Python "venv not found"
```bash
# Sur Ubuntu/Debian
sudo apt install python3-venv

# Sur Mac
brew install python3
```

### Erreur CORS
Le backend refuse les requêtes du frontend. Vérifier que `CORS_ORIGINS` dans `/backend/.env` contient `http://localhost:3000`

### Erreur Supabase 401 / "Invalid JWT"
Les clés sont correctes dans ce guide. Si l'erreur persiste, contacter Salif.

### Port 3000 ou 8001 déjà utilisé
```bash
# Trouver et tuer le processus sur le port
# Mac/Linux:
lsof -i :3000
kill -9 [PID]

# Windows:
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

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

---

## Contact

Questions ? Contacter **Salif** (propriétaire du projet)
