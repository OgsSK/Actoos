# 🚀 Guide de Déploiement - pro.actoos.com

## Architecture des Domaines ACTOOS

```
actoos.com          → Vitrine Corporate (Hub)
├── pro.actoos.com  → ACTOOS PRO (SaaS B2B) ← CE GUIDE
├── one.actoos.com  → ACTOOS ONE (Super-App Afrique)
└── api.actoos.com  → API Gateway (optionnel)
```

---

## 📋 Prérequis

### 1. DNS Configuration
Configurer les enregistrements DNS chez votre registrar :

```
pro.actoos.com    A      [IP_SERVEUR]
pro.actoos.com    AAAA   [IPv6_SERVEUR]  (optionnel)
```

Ou avec un CDN (Cloudflare, Vercel, etc.) :
```
pro.actoos.com    CNAME  votre-app.vercel.app
```

### 2. Certificat SSL
- Let's Encrypt (gratuit, auto-renouvelé)
- Ou certificat Cloudflare (si proxy activé)

---

## ⚙️ Variables d'Environnement Production

### Backend (.env)
```env
# Base de données
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/actoos_prod
DB_NAME=actoos_prod

# JWT
JWT_SECRET=votre-secret-production-ultra-securise-min-64-chars

# URLs
FRONTEND_URL=https://pro.actoos.com

# Stripe (LIVE keys)
STRIPE_API_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTUP_MONTHLY=price_xxx
STRIPE_PRICE_STARTUP_YEARLY=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://pro.actoos.com/api/calendar/callback

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+32xxx

# Redis (optionnel, recommandé)
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379

# Storage
STORAGE_PATH=/data/uploads
STORAGE_URL=https://pro.actoos.com/uploads
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://pro.actoos.com
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_xxx
REACT_APP_VAPID_PUBLIC_KEY=xxx
```

---

## 🔧 Configurations à Mettre à Jour

### 1. Stripe Dashboard
- **Webhooks** : Ajouter `https://pro.actoos.com/api/stripe/webhook`
- **Domaines autorisés** : Ajouter `pro.actoos.com`

### 2. Google Cloud Console
- **OAuth 2.0** : 
  - Origines JavaScript autorisées : `https://pro.actoos.com`
  - URI de redirection : `https://pro.actoos.com/api/calendar/callback`

### 3. Resend Dashboard
- **Domaine vérifié** : `actoos.com` (pour envoyer depuis @actoos.com)

### 4. Twilio
- **Numéro vérifié** pour SMS

---

## 🐳 Déploiement Docker

### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - MONGO_URL=${MONGO_URL}
      - JWT_SECRET=${JWT_SECRET}
      # ... autres variables
    ports:
      - "8001:8001"
    volumes:
      - uploads:/app/uploads
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=https://pro.actoos.com
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  uploads:
```

### nginx.conf (exemple)
```nginx
server {
    listen 443 ssl http2;
    server_name pro.actoos.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }

    # Uploads
    location /uploads/ {
        alias /app/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 80;
    server_name pro.actoos.com;
    return 301 https://$server_name$request_uri;
}
```

---

## ☁️ Déploiement Vercel/Railway/Render

### Vercel (Frontend)
1. Connecter le repo GitHub
2. Variables d'environnement :
   - `REACT_APP_BACKEND_URL=https://pro.actoos.com`
3. Domaine custom : `pro.actoos.com`

### Railway (Backend)
1. Déployer depuis GitHub
2. Variables d'environnement (voir ci-dessus)
3. Domaine custom pour l'API

---

## ✅ Checklist Pré-Déploiement

- [ ] DNS configuré pour `pro.actoos.com`
- [ ] Certificat SSL actif
- [ ] Variables d'environnement production définies
- [ ] Stripe webhooks configurés
- [ ] Google OAuth URLs mises à jour
- [ ] Resend domaine vérifié
- [ ] MongoDB Atlas (ou autre) configuré
- [ ] Redis configuré (optionnel mais recommandé)
- [ ] Backup automatique base de données
- [ ] Monitoring/alertes configurés

---

## 🔒 Sécurité Production

1. **JWT_SECRET** : Minimum 64 caractères, généré aléatoirement
2. **CORS** : Restreindre aux domaines autorisés
3. **Rate Limiting** : Activé via Redis
4. **HTTPS** : Obligatoire partout
5. **Headers sécurité** : CSP, X-Frame-Options, etc.

---

## 📊 Monitoring Recommandé

- **Uptime** : UptimeRobot, Pingdom
- **Erreurs** : Sentry
- **Logs** : LogTail, Papertrail
- **Métriques** : Grafana + Prometheus

---

## 🆘 Rollback

En cas de problème :
1. Revenir à la version précédente du container
2. Ou utiliser le feature "Rollback" Emergent
3. Conserver toujours les 3 dernières versions

---

*Document généré le 5 Mai 2026 - ACTOOS PRO v2.0*
