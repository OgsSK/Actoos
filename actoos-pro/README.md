# ACTOOS PRO

**Application SaaS B2B de gestion d'interventions terrain.**

---

## 📁 Structure

```
actoos-pro/
├── frontend/       → Application React PWA
├── backend/        → API FastAPI (Python)
├── supabase/       → Edge Functions & Migrations
└── docs/           → Documentation
```

---

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** >= 20.0.0
- **Python** >= 3.10
- **Yarn** : `npm install -g yarn`

---

### Étape 1 : Cloner le projet

```bash
git clone https://github.com/VOTRE_USERNAME/Actoos.git
cd Actoos/actoos-pro
```

---

### Étape 2 : Configuration

#### Frontend (`frontend/.env`)

Créer le fichier `frontend/.env` :

```env
REACT_APP_SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c
REACT_APP_BACKEND_URL=http://localhost:8001
```

#### Backend (`backend/.env`)

Créer le fichier `backend/.env` :

```env
# CORS
CORS_ORIGINS=http://localhost:3000,https://pro.actoos.com,https://actoos.com

# Supabase
SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
SUPABASE_KEY=sb_secret_Ko7Bmqkiql9GXZW9z4IOiA_gb2rU5UV
DATABASE_URL=postgresql://postgres:j5GWgugTM1lA9iXK@db.zmngftlkdimwvkxmduvr.supabase.co:5432/postgres
JWT_SECRET_KEY=actoos-pro-secret-key-2024-super-secure

# Email (Resend)
RESEND_API_KEY=re_UzozoySJ_FqrSrKwtP6TJr147aSZMnGVQ
SENDER_EMAIL=noreply@actoos.com

# Paiements (Stripe)
STRIPE_API_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_xtMUxHFtjs9VK715Nk16HHJVXnxhYmpt

# Push Notifications
VAPID_PUBLIC_KEY=BDEosOMy7hCZHnWBDqZu4tXgkG20SA8TPnpRVFKa9mDCjUBJeoNM9BZHTAbQWHjCtlnOHnLOZba7KiaBDH913mk
VAPID_PRIVATE_KEY=KzQjovJG3M3RJddeEfl-ZiLpalP9eNRjZhCV4DLN93M

# Redis
REDIS_URL=redis://default:gQAAAAAAAcWkAAIgcDIwMDIyZmZlMmZhZGU0MTQzYjlmYjhjM2U3MzhjMDdlMA@sure-dane-116132.upstash.io:6379

# Google Calendar
GOOGLE_CLIENT_ID=911847023552-ie19kpvng5hr3158g8oi93ucv7cnv14e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

---

### Étape 3 : Installation

#### Frontend

```bash
cd frontend
yarn install
```

#### Backend

```bash
cd backend
python -m venv venv

# Mac/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

---

### Étape 4 : Lancer les serveurs

**Ouvrir 2 terminaux :**

#### Terminal 1 - Backend (port 8001)

```bash
cd actoos-pro/backend
source venv/bin/activate
uvicorn server:app --port 8001 --reload
```

#### Terminal 2 - Frontend (port 3000)

```bash
cd actoos-pro/frontend
yarn start
```

---

### Étape 5 : Tester

| | |
|---|---|
| **URL** | http://localhost:3000 |
| **Email** | contact@actoos.com |
| **Mot de passe** | Salifkane&&7 |

---

## 📱 Pages Principales

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Connexion |
| `/dashboard` | Tableau de bord |
| `/tech` | App technicien (mobile) |
| `/interventions` | Gestion interventions |
| `/clients` | Gestion clients |
| `/devis` | Devis |
| `/factures` | Factures |

---

## 🛠 Stack Technique

- **Frontend** : React 18, Tailwind CSS, Shadcn/UI, PWA
- **Backend** : FastAPI, Python 3.10+
- **Database** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth + JWT
- **Paiements** : Stripe
- **Emails** : Resend

---

## ❓ Problèmes Courants

### Module not found
```bash
cd frontend && rm -rf node_modules && yarn install
```

### Erreur CORS
Vérifier `CORS_ORIGINS` dans `backend/.env`

### Port déjà utilisé
```bash
# Mac/Linux
lsof -i :3000 && kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📞 Contact

**Salif Kane** - Propriétaire du projet
