# 🚀 Guide de Déploiement ACTOOS PRO sur Railway

## Prérequis
- Compte Railway (gratuit pour commencer)
- Tables créées dans Supabase ✅ (déjà fait)
- Upstash Redis configuré ✅ (déjà fait)

---

## Étape 1 : Créer un projet Railway

1. Allez sur **[railway.app](https://railway.app)**
2. Connectez-vous (GitHub recommandé)
3. Cliquez **"New Project"**
4. Choisissez **"Deploy from GitHub repo"**
5. Sélectionnez votre repo ACTOOS PRO

---

## Étape 2 : Configurer les Variables d'Environnement

Dans Railway Dashboard → Votre projet → **Variables**, ajoutez :

### 🗄️ Base de données (Supabase)
```
DATABASE_URL=postgresql://postgres:j5GWgugTM1lA9iXK@db.zmngftlkdimwvkxmduvr.supabase.co:5432/postgres
SUPABASE_URL=https://zmngftlkdimwvkxmduvr.supabase.co
SUPABASE_KEY=sb_secret_Ko7Bmqkiql9GXZW9z4IOiA_gb2rU5UV
```

### ⚡ Cache (Upstash Redis)
```
REDIS_URL=redis://default:gQAAAAAAAcWkAAIgcDIwMDIyZmZlMmZhZGU0MTQzYjlmYjhjM2U3MzhjMDdlMA@sure-dane-116132.upstash.io:6379
```

### 🔐 Authentification
```
JWT_SECRET=actoos-pro-secret-key-2024-super-secure
JWT_ALGORITHM=HS256
```

### 💳 Stripe (Paiements)
```
STRIPE_API_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_Dfppf81BRfCu3zxBAxvbvAMbIWxW7tQH
```

### 📧 Email (Resend)
```
RESEND_API_KEY=re_HSsCQxUj_HvzYvhZDoJzEHBciWmYDU3ZR
SENDER_EMAIL=contact@actoos.com
```

### 📱 SMS (Twilio)
```
TWILIO_ACCOUNT_SID=AC2a7c4efff4c2804c04389201afa13f25
TWILIO_AUTH_TOKEN=af95881a8a937ae79a546b1ac59bde99
TWILIO_PHONE_NUMBER=+32XXXXXXXXX
```

### 🌐 URLs
```
CORS_ORIGINS=https://pro.actoos.com,https://actoos.com
FRONTEND_URL=https://pro.actoos.com
```

### 🔔 Push Notifications
```
VAPID_PUBLIC_KEY=BDEosOMy7hCZHnWBDqZu4tXgkG20SA8TPnpRVFKa9mDCjUBJeoNM9BZHTAbQWHjCtlnOHnLOZba7KiaBDH913mk
VAPID_PRIVATE_KEY=KzQjovJG3M3RJddeEfl-ZiLpalP9eNRjZhCV4DLN93M
VAPID_SUBJECT=mailto:support@actoos.com
```

### 🤖 IA (Optionnel)
```
EMERGENT_LLM_KEY=sk-emergent-09805Bb39Ab57C6A7C
```

---

## Étape 3 : Configuration du Build

Railway détectera automatiquement le `Dockerfile` et `railway.toml`.

Si nécessaire, dans **Settings** :
- **Root Directory** : `/backend`
- **Build Command** : (laisser vide, utilise Dockerfile)
- **Start Command** : `uvicorn server:app --host 0.0.0.0 --port $PORT --workers 4`

---

## Étape 4 : Déployer

1. Cliquez **Deploy** 
2. Attendez que le build se termine (~3-5 minutes)
3. Cliquez sur le lien de votre app pour voir le health check

---

## Vérification

Accédez à `https://votre-app.railway.app/health`

Vous devriez voir :
```json
{
  "status": "healthy",
  "service": "actoos-api",
  "version": "2.0.0",
  "postgresql": "connected",
  "redis": "connected",
  "mongodb": "not_configured"
}
```

🎉 **HIGH PERFORMANCE MODE activé quand PostgreSQL + Redis sont connectés !**

---

## Domaine personnalisé

1. Dans Railway → Settings → Domains
2. Ajoutez `api.actoos.com` ou `pro.actoos.com`
3. Configurez les DNS chez votre registrar

---

## Support
- Email : contact@actoos.com
- Documentation : /app/memory/DEPLOYMENT_GUIDE_PRO.md
