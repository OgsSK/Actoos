# 🚀 ACTOOS PRO - Guide de Déploiement Production

## 📋 Prérequis

### 1. Installer Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# Windows/Linux (via npm)
npm install -g supabase

# Vérifier l'installation
supabase --version
```

### 2. Se connecter à Supabase
```bash
supabase login
# → Ouvrira votre navigateur pour l'authentification
```

### 3. Lier votre projet
```bash
supabase link --project-ref zmngftlkdimwvkxmduvr
```

---

## 🔐 SECRETS À CONFIGURER

### A. Email - Resend (REQUIS pour l'envoi d'emails)

**Où l'obtenir :** https://resend.com/api-keys

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Configuration Resend :**
1. Créer un compte sur https://resend.com
2. Vérifier votre domaine `actoos.com` dans Settings > Domains
3. Créer une API key dans API Keys

---

### B. SMS - Twilio (REQUIS pour l'envoi de SMS)

**Où l'obtenir :** https://console.twilio.com

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_PHONE_NUMBER=+33xxxxxxxxx
```

**Configuration Twilio :**
1. Créer un compte sur https://www.twilio.com
2. Aller dans Console > Account Info pour SID et Token
3. Acheter un numéro de téléphone (Phone Numbers > Buy a Number)
   - Choisir un numéro français (+33) ou belge (+32)
   - Activer les capabilities SMS

---

### C. WhatsApp Business - Meta (OPTIONNEL pour relances WhatsApp)

**Où l'obtenir :** https://developers.facebook.com/apps/

```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxxxx
```

**Configuration WhatsApp Business API :**
1. Créer une app Meta Business sur https://developers.facebook.com
2. Ajouter le produit "WhatsApp"
3. Configurer un numéro de téléphone business
4. Créer des **templates de message** (obligatoire pour messages initiés par l'entreprise)
   
**Templates suggérés à créer dans Meta Business :**
- `devis_notification` - Notification nouveau devis
- `facture_reminder` - Relance facture impayée
- `intervention_reminder` - Rappel d'intervention

⚠️ **Important :** WhatsApp Business API nécessite des templates pré-approuvés par Meta pour envoyer des messages aux clients (sauf réponse dans les 24h suivant un message du client).

---

### D. Stripe Webhooks (REQUIS pour les paiements)

**Où l'obtenir :** https://dashboard.stripe.com/webhooks

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Configuration Stripe :**
1. Aller sur https://dashboard.stripe.com/webhooks
2. Cliquer "Add endpoint"
3. URL: `https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/stripe-webhook`
4. Événements à écouter:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copier le "Signing secret" (commence par `whsec_`)

---

## 📦 DÉPLOYER LES EDGE FUNCTIONS

Une fois les secrets configurés, déployez les fonctions :

```bash
# Se placer dans le dossier supabase
cd /chemin/vers/actoos/supabase

# Déployer chaque fonction
supabase functions deploy login --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy send-sms --no-verify-jwt
supabase functions deploy send-whatsapp --no-verify-jwt
supabase functions deploy generate-pdf --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

**Vérification :**
```bash
supabase functions list
```

---

## 🔒 APPLIQUER LES POLITIQUES RLS (Sécurité)

1. Aller sur https://supabase.com/dashboard/project/zmngftlkdimwvkxmduvr/sql/new
2. Copier-coller le contenu de `/supabase/migrations/002_rls_policies.sql`
3. Cliquer "Run"

**Fichier à exécuter :** `002_rls_policies.sql`

---

## ✅ CHECKLIST FINALE

| Étape | Action | Statut |
|-------|--------|--------|
| 1 | Supabase CLI installé | ⬜ |
| 2 | Connecté à Supabase (`supabase login`) | ⬜ |
| 3 | Projet lié (`supabase link`) | ⬜ |
| 4 | Secret `RESEND_API_KEY` configuré | ⬜ |
| 5 | Secrets Twilio configurés | ⬜ |
| 6 | Secrets WhatsApp configurés (optionnel) | ⬜ |
| 7 | Secret `STRIPE_WEBHOOK_SECRET` configuré | ⬜ |
| 8 | 6 Edge Functions déployées | ⬜ |
| 9 | Politiques RLS appliquées | ⬜ |
| 10 | Test de connexion réussi | ⬜ |

---

## 🧪 TESTS

### Tester la connexion
```bash
curl -X POST https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptbmdmdGxrZGltd3ZreG1kdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQwNDksImV4cCI6MjA5MzU5MDA0OX0.uxXVKg1oIcakCPtnRxri9PPj1ZvAsgi-JVe6VhQNE2c" \
  -d '{"email": "demo@actoos.com", "password": "demo2024"}'
```

### Tester l'envoi d'email
```bash
curl -X POST https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"to": "test@example.com", "subject": "Test ACTOOS", "html": "<p>Test</p>"}'
```

---

## 📞 SUPPORT

En cas de problème :
- Email : contact@actoos.com
- Documentation Supabase : https://supabase.com/docs

---

**Document généré le :** $(date)
**Version ACTOOS PRO :** 2.0 (Zero Railway Architecture)
