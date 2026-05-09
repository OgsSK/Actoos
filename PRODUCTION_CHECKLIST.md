# 🚀 ACTOOS PRO - Checklist Production

## État Actuel : 🟡 75% Prêt

---

## 1. 🔐 SÉCURITÉ & AUTHENTIFICATION

### ✅ Fait
- [x] Authentification Supabase Auth
- [x] JWT tokens
- [x] Session persistence PWA
- [x] Logout sécurisé avec cache clear
- [x] CORS configurable via .env (restrictif en prod)

### 🟡 À Faire en Production
- [ ] **RLS Policies** - Réactiver avec policies optimisées
- [ ] **CORS_ORIGINS** - Changer "*" → "https://actoos.com,https://app.actoos.com"
- [ ] **Sanitization** - Vérifier XSS/SQL injection sur tous les inputs

---

## 2. 📱 NOTIFICATIONS

### ✅ Fait
- [x] Structure VAPID keys configurée
- [x] Service Worker pour PWA
- [x] Hook `usePushNotifications` fonctionnel
- [x] Table `push_subscriptions` dans Supabase
- [x] Bouton toggle dans TechnicianApp
- [x] Email via Resend (`noreply@actoos.com`)

### ⏸️ Reporté
- [ ] **SMS Notifications** - Reporté (utilisation Push + Email uniquement)

---

## 3. 💳 PAIEMENTS

### ✅ Fait
- [x] Stripe API Key configurée (LIVE)
- [x] Webhook secret configuré
- [x] Plans Startup/Pro/Enterprise définis
- [x] Interface changement de plan
- [x] Interface résiliation

### 🟡 À Vérifier
- [ ] **Test webhook Stripe** - Vérifier que les événements arrivent
- [ ] **Facturation automatique** - Tester le cycle de paiement
- [ ] **Gestion échecs paiement** - Emails de relance

---

## 4. 📧 EMAILS

### ✅ Fait
- [x] Resend API Key configurée
- [x] Domaine `actoos.com` vérifié (SPF/DKIM)
- [x] SENDER_EMAIL: `noreply@actoos.com`

### 🟡 À Faire (optionnel)
- [ ] **Templates emails personnalisés** :
  - [ ] Bienvenue
  - [ ] Confirmation intervention
  - [ ] Rappel paiement
  - [ ] Résiliation confirmée

---

## 5. 🗄️ BASE DE DONNÉES

### ✅ Fait
- [x] Supabase PostgreSQL configuré
- [x] Tables créées (users, entreprises, interventions, etc.)
- [x] Relations foreign keys

### 🔴 À Faire
- [ ] **Backups automatiques** - Configurer dans Supabase (Pro plan)
- [ ] **Indexes** - Vérifier les indexes sur les colonnes fréquentes
- [ ] **RLS Policies** - Réactiver pour sécurité

---

## 6. 📁 STOCKAGE FICHIERS

### ✅ Fait
- [x] Supabase Storage bucket `chat-attachments`

### 🔴 À Faire
- [ ] **S3/R2 Configuration** - Compléter S3_ENDPOINT, S3_ACCESS_KEY, etc.
- [ ] **Limite taille fichiers** - Configurer max upload size
- [ ] **Nettoyage fichiers orphelins** - Cron job

---

## 7. 📊 MONITORING & ANALYTICS

### 🔴 À Faire
- [ ] **Sentry** - Error tracking (créer compte + ajouter DSN)
- [ ] **Google Analytics** - Ajouter tracking ID
- [ ] **Logs centralisés** - Configurer log aggregation
- [ ] **Uptime monitoring** - BetterUptime ou similaire

---

## 8. ⚖️ LÉGAL & CONFORMITÉ

### ✅ Fait
- [x] **Mentions Légales** - `/legal`
- [x] **CGU** - Conditions Générales d'Utilisation `/terms`
- [x] **Politique de Confidentialité** - RGPD compliant `/privacy`
- [x] **Cookies** - Bandeau cookie consent

### 🟡 À Vérifier
- [ ] **CGV** - Conditions Générales de Vente (pour facturation)
- [ ] **DPA** - Data Processing Agreement pour clients B2B (optionnel)

---

## 9. 🌐 INFRASTRUCTURE

### ✅ Fait
- [x] Preview URL fonctionne
- [x] SSL/HTTPS

### 🔴 À Faire
- [ ] **Domaine custom** - actoos.com ou app.actoos.com
- [ ] **DNS Configuration** - A record, CNAME
- [ ] **CDN** - Cloudflare ou similaire
- [ ] **Environnement staging** - Pour tests avant prod

---

## 10. 🧪 TESTS

### ✅ Fait
- [x] Comptes test créés (Startup/Pro/Enterprise)
- [x] Login/Logout testé
- [x] Plans d'abonnement testés

### 🔴 À Faire
- [ ] **Test E2E complet** - Parcours utilisateur complet
- [ ] **Test paiement réel** - Avec carte test Stripe
- [ ] **Test mobile** - iOS Safari, Android Chrome
- [ ] **Test hors-ligne** - Mode offline PWA

---

## 11. 📱 PWA & MOBILE

### ✅ Fait
- [x] Manifest.json configuré
- [x] Service Worker
- [x] Icons PWA
- [x] Installable

### 🟡 À Vérifier
- [ ] **iOS Safari** - Tester installation PWA
- [ ] **Splash screens** - Images de démarrage
- [ ] **App Store** - Envisager PWA Builder pour stores

---

## 12. 🎨 UI/UX FINAL

### ✅ Fait
- [x] Dashboard Admin
- [x] Dashboard Technicien
- [x] Super Admin Control Center
- [x] Chat avec notes vocales

### 🟡 À Vérifier
- [ ] **Responsive** - Tester toutes les tailles d'écran
- [ ] **Accessibilité** - Contraste, aria-labels
- [ ] **Loading states** - Spinners partout
- [ ] **Error states** - Messages d'erreur clairs

---

## PRIORITÉ POUR LANCEMENT

### Phase 1 - Critique (Avant lancement)
1. ✅ Push Notifications (infrastructure prête)
2. 🟡 RLS Policies Supabase (désactivé pour dev, à réactiver avec policies sécurisées)
3. 🔴 CORS restrictif
4. 🔴 Domaine custom
5. 🔴 Pages légales (CGU, CGV, Confidentialité)

### Phase 2 - Important (Semaine 1)
1. 🟡 Emails transactionnels
2. 🟡 Sentry error tracking
3. 🟡 Test paiement Stripe complet
4. 🟡 Numéro Twilio réel

### Phase 3 - Nice to have (Mois 1)
1. 🟢 Analytics
2. 🟢 Backups automatiques
3. 🟢 CDN
4. 🟢 App stores (PWA Builder)

---

## CREDENTIALS À OBTENIR

| Service | Besoin | Status |
|---------|--------|--------|
| Firebase | Project ID + Server Key | 🔴 À créer |
| Twilio | Vrai numéro français | 🔴 À acheter |
| Domaine | actoos.com DNS | 🔴 À configurer |
| Resend | Domaine vérifié | 🔴 À configurer |
| Sentry | DSN | 🔴 À créer |

