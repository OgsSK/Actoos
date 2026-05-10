# ACTOOS PRO

Application SaaS B2B de gestion d'interventions terrain.

## 📁 Structure

```
actoos-pro/
├── frontend/       # Application React PWA
├── backend/        # API FastAPI (Python)
├── supabase/       # Edge Functions & Migrations
└── docs/           # Documentation
```

## 🚀 Démarrage Rapide

### Prérequis

- Node.js >= 20.0.0
- Python >= 3.10
- Yarn (`npm install -g yarn`)

### 1. Configuration

**Frontend** (`frontend/.env`) :
```env
REACT_APP_SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Backend** (`backend/.env`) :
```env
CORS_ORIGINS=http://localhost:3000,https://pro.actoos.com,https://actoos.com

# Supabase
SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
SUPABASE_KEY=sb_secret_Ko7Bmqkiql9GXZW9z4IOiA_gb2rU5UV
DATABASE_URL=postgresql://postgres:j5GWgugTM1lA9iXK@db.zmngftlkdimwvkxmduvr.supabase.co:5432/postgres
JWT_SECRET_KEY=actoos-pro-secret-key-2024-super-secure

# Services
RESEND_API_KEY=re_HSsCQxUj_HvzYvhZDoJzEHBciWmYDU3ZR
SENDER_EMAIL=noreply@actoos.com
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

### 2. Installation

```bash
# Frontend
cd frontend
yarn install

# Backend
cd ../backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Lancer les serveurs

**Terminal 1 - Backend :**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --port 8001 --reload
```

**Terminal 2 - Frontend :**
```bash
cd frontend
yarn start
```

### 4. Tester

- URL : http://localhost:3000
- Login : `contact@actoos.com` / `Salifkane&&7`

---

## 📱 Pages Principales

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Connexion |
| `/dashboard` | Tableau de bord admin |
| `/tech` | Interface technicien mobile |
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
- **Push** : Web Push (VAPID)

---

## 📞 Contact

Questions ? Contacter **Salif** (propriétaire du projet)
