# 🚀 Guide de Déploiement Actoos sur Railway

## Prérequis

- [ ] Compte GitHub (gratuit) - https://github.com
- [ ] Compte Railway (gratuit pour commencer) - https://railway.app
- [ ] Nom de domaine `actoos.com` (optionnel mais recommandé)
- [ ] Clés Stripe LIVE (déjà configurées)

---

## Étape 1 : Sauvegarder le code sur GitHub

### Depuis Emergent :
1. Dans le chat, cliquez sur l'icône **GitHub** (ou "Save to GitHub")
2. Connectez votre compte GitHub si demandé
3. Choisissez un nom de repo : `actoos` ou `actoos-app`
4. Cliquez **"Push"**

Votre code est maintenant sur GitHub !

---

## Étape 2 : Créer un compte Railway

1. Allez sur https://railway.app
2. Cliquez **"Login"** → **"Login with GitHub"**
3. Autorisez Railway à accéder à vos repos

---

## Étape 3 : Déployer MongoDB

1. Dans Railway, cliquez **"New Project"**
2. Choisissez **"Provision MongoDB"**
3. Railway crée automatiquement une base MongoDB
4. Cliquez sur le service MongoDB → **"Variables"**
5. Copiez la variable `MONGO_URL` (elle ressemble à `mongodb://...`)

---

## Étape 4 : Déployer le Backend (FastAPI)

### 4.1 Ajouter le service Backend
1. Dans le même projet, cliquez **"+ New"** → **"GitHub Repo"**
2. Sélectionnez votre repo `actoos`
3. Railway détecte automatiquement le projet

### 4.2 Configurer le Backend
1. Cliquez sur le service créé → **"Settings"**
2. Dans **"Root Directory"**, mettez : `backend`
3. Dans **"Build Command"**, mettez : `pip install -r requirements.txt`
4. Dans **"Start Command"**, mettez : `uvicorn server:app --host 0.0.0.0 --port $PORT`

### 4.3 Variables d'environnement Backend
Allez dans **"Variables"** et ajoutez :

```
MONGO_URL=mongodb://... (copiée de l'étape 3)
DB_NAME=actoos_prod
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_minimum_32_caracteres
STRIPE_SECRET_KEY=sk_live_votre_cle_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret
STRIPE_PRICE_STARTUP=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
RESEND_API_KEY=re_votre_cle_resend
TWILIO_ACCOUNT_SID=votre_twilio_sid
TWILIO_AUTH_TOKEN=votre_twilio_token
TWILIO_PHONE_NUMBER=+32xxx
FRONTEND_URL=https://actoos.com
CORS_ORIGINS=https://actoos.com,https://www.actoos.com
```

### 4.4 Générer le domaine Backend
1. Allez dans **"Settings"** → **"Networking"**
2. Cliquez **"Generate Domain"**
3. Notez l'URL : `https://actoos-backend-production.up.railway.app`

---

## Étape 5 : Déployer le Frontend (React)

### 5.1 Ajouter le service Frontend
1. Cliquez **"+ New"** → **"GitHub Repo"**
2. Sélectionnez le même repo `actoos`

### 5.2 Configurer le Frontend
1. Cliquez sur le service → **"Settings"**
2. **Root Directory** : `frontend`
3. **Build Command** : `yarn install && yarn build`
4. **Start Command** : `npx serve -s build -l $PORT`

### 5.3 Variables d'environnement Frontend
```
REACT_APP_BACKEND_URL=https://actoos-backend-production.up.railway.app
NODE_ENV=production
```

### 5.4 Générer le domaine Frontend
1. **"Settings"** → **"Networking"** → **"Generate Domain"**
2. URL temporaire : `https://actoos-frontend-production.up.railway.app`

---

## Étape 6 : Configurer le domaine personnalisé (actoos.com)

### 6.1 Dans Railway (Frontend)
1. Service Frontend → **"Settings"** → **"Networking"**
2. Cliquez **"+ Custom Domain"**
3. Entrez : `actoos.com` et `www.actoos.com`
4. Railway vous donne des enregistrements DNS à configurer

### 6.2 Chez votre registrar (OVH, Gandi, Cloudflare, etc.)
Ajoutez ces enregistrements DNS :

```
Type    Nom     Valeur
CNAME   @       actoos-frontend-production.up.railway.app
CNAME   www     actoos-frontend-production.up.railway.app
```

Ou si votre registrar ne supporte pas CNAME sur @, utilisez un A record :
```
Type    Nom     Valeur
A       @       IP fournie par Railway
CNAME   www     actoos-frontend-production.up.railway.app
```

### 6.3 Configurer le sous-domaine API (optionnel mais recommandé)
Pour avoir `api.actoos.com` :
1. Dans Railway (Backend) → Custom Domain → `api.actoos.com`
2. DNS : `CNAME api actoos-backend-production.up.railway.app`

Puis mettez à jour :
- Frontend : `REACT_APP_BACKEND_URL=https://api.actoos.com`
- Backend : `FRONTEND_URL=https://actoos.com`

---

## Étape 7 : Configurer Stripe Webhook

1. Allez sur https://dashboard.stripe.com/webhooks
2. Cliquez **"Ajouter un endpoint"**
3. URL : `https://api.actoos.com/api/subscription/webhook` 
   (ou `https://actoos-backend-production.up.railway.app/api/subscription/webhook`)
4. Événements à sélectionner :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copiez le **Webhook Secret** (whsec_xxx)
6. Ajoutez-le dans Railway Backend : `STRIPE_WEBHOOK_SECRET=whsec_xxx`

---

## Étape 8 : Configurer Google OAuth (Calendrier)

1. Allez sur https://console.cloud.google.com
2. Sélectionnez votre projet
3. **APIs & Services** → **Credentials**
4. Modifiez votre OAuth Client ID
5. Ajoutez les URIs de redirection :
   - `https://actoos.com/api/calendar/callback`
   - `https://api.actoos.com/api/calendar/callback`

---

## Étape 9 : Vérifications post-déploiement

### Checklist :
- [ ] Page d'accueil charge : https://actoos.com
- [ ] Login fonctionne
- [ ] Inscription avec Stripe fonctionne (test avec carte 4242 4242 4242 4242)
- [ ] Webhook Stripe reçu (vérifier logs Railway)
- [ ] Google Calendar connexion fonctionne
- [ ] PWA Technicien : https://actoos.com/tech
- [ ] Emails envoyés (vérifier Resend dashboard)

### Voir les logs :
Dans Railway, cliquez sur un service → **"Logs"** pour débugger

---

## 💰 Coûts estimés Railway

| Ressource | Coût estimé |
|-----------|-------------|
| Backend (FastAPI) | ~$5/mois |
| Frontend (React) | ~$5/mois |
| MongoDB | ~$5-10/mois |
| **Total** | **~$15-20/mois** |

Railway offre $5 de crédit gratuit/mois pour commencer.

---

## 🔄 Mises à jour futures

### Option 1 : Via Emergent
1. Revenez sur Emergent
2. Faites vos modifications
3. "Save to GitHub"
4. Railway redéploie automatiquement !

### Option 2 : Via VS Code (local)
1. `git clone https://github.com/votre-username/actoos.git`
2. Modifiez le code
3. `git add . && git commit -m "Update" && git push`
4. Railway redéploie automatiquement !

---

## 🆘 Support

- **Railway Docs** : https://docs.railway.app
- **Railway Discord** : https://discord.gg/railway
- **Stripe Docs** : https://stripe.com/docs

---

## Commandes utiles

```bash
# Tester le backend localement
cd backend
pip install -r requirements.txt
uvicorn server:app --reload

# Tester le frontend localement  
cd frontend
yarn install
yarn start

# Build de production
cd frontend
yarn build
```

---

Bonne chance avec Actoos ! 🚀
