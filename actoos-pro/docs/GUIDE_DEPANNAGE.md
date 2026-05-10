# ACTOOS PRO - Guide de Dépannage & Architecture

**Document de référence pour diagnostiquer et résoudre les problèmes**

---

## 📋 Table des Matières

1. [Architecture Globale](#1-architecture-globale)
2. [Accès & Credentials](#2-accès--credentials)
3. [Guide de Dépannage par Fonctionnalité](#3-guide-de-dépannage-par-fonctionnalité)
4. [Erreurs Courantes & Solutions](#4-erreurs-courantes--solutions)
5. [Logs & Monitoring](#5-logs--monitoring)

---

# 1. Architecture Globale

## 🏗️ Infrastructure

| Composant | Hébergement | URL | Dashboard |
|-----------|-------------|-----|-----------|
| **Frontend** | Vercel | https://pro.actoos.com | https://vercel.com/dashboard |
| **Backend** | Railway | https://actoos-backend.up.railway.app | https://railway.app/dashboard |
| **Base de données** | Supabase (PostgreSQL) | - | https://supabase.com/dashboard |
| **Auth** | Supabase Auth | - | Supabase Dashboard > Authentication |
| **Storage (Photos)** | Supabase Storage | - | Supabase Dashboard > Storage |
| **Emails** | Resend | - | https://resend.com/emails |
| **Paiements** | Stripe | - | https://dashboard.stripe.com |
| **Cache** | Upstash Redis | - | https://console.upstash.com |
| **DNS/Domaine** | Vercel/Cloudflare | actoos.com | - |

## 📂 Structure du Code

```
actoos-pro/
├── frontend/                 # React PWA (Vercel)
│   ├── src/
│   │   ├── components/       # Composants UI réutilisables
│   │   ├── contexts/         # AuthContext (gestion session)
│   │   ├── lib/
│   │   │   ├── supabase.js   # Client Supabase + session persistence
│   │   │   └── supabaseApi.js # TOUTES les requêtes API Supabase
│   │   └── pages/            # Pages de l'application
│   │       ├── TechnicianApp.jsx  # App mobile technicien
│   │       ├── Devis.jsx          # Gestion devis (admin)
│   │       ├── Factures.jsx       # Gestion factures
│   │       └── Interventions.jsx  # Gestion interventions
│   └── public/               # Assets statiques, manifest PWA
│
├── backend/                  # FastAPI (Railway)
│   ├── server.py             # Point d'entrée principal
│   ├── routers/              # Routes API
│   │   ├── interventions.py
│   │   ├── rapports.py       # Génération PDF
│   │   └── ...
│   ├── pdf_generator.py      # Génération des PDF
│   ├── email_service.py      # Envoi d'emails (Resend)
│   └── subscription_service.py # Gestion abonnements Stripe
│
└── supabase/
    ├── functions/            # Edge Functions
    │   └── login/            # Authentification custom
    └── migrations/           # Schéma DB
```

---

# 2. Accès & Credentials

## 🔑 Supabase

| Clé | Valeur | Utilisation |
|-----|--------|-------------|
| URL | `https://zmngftlkdimwvkxmduvr.supabase.co` | Toutes les requêtes |
| Anon Key | `eyJhbGciOiJIUzI1NiIs...` | Frontend (public) |
| Service Key | `sb_secret_Ko7Bmqkiql9GXZW9z4IOiA_gb2rU5UV` | Backend (privé) |
| Database URL | `postgresql://postgres:j5GWgugTM1lA9iXK@db.zmngftlkdimwvkxmduvr.supabase.co:5432/postgres` | Connexion directe DB |

**Dashboard Supabase :** https://supabase.com/dashboard/project/zmngftlkdimwvkxmduvr

## 🔑 Autres Services

| Service | Dashboard | Clé API |
|---------|-----------|---------|
| Stripe | https://dashboard.stripe.com | `sk_live_51TCSJKIcKb...` |
| Resend | https://resend.com | `re_HSsCQxUj_Hvz...` |
| Upstash Redis | https://console.upstash.com | Dans l'URL Redis |

---

# 3. Guide de Dépannage par Fonctionnalité

---

## 🔐 AUTHENTIFICATION / CONNEXION

### Flux normal
```
1. Utilisateur entre email/password sur /login
2. Frontend appelle Edge Function /functions/v1/login (Supabase)
3. Si échec → Fallback sur supabase.auth.signInWithPassword()
4. Token JWT stocké dans localStorage + IndexedDB (iOS PWA)
5. Redirection vers /dashboard ou /tech selon le rôle
```

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `frontend/src/pages/Login.jsx` | Formulaire de connexion |
| `frontend/src/contexts/AuthContext.jsx` | Gestion de la session, login(), logout() |
| `frontend/src/lib/supabase.js` | Client Supabase, persistence session |
| `supabase/functions/login/` | Edge Function authentification |

### Problèmes & Solutions

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| "Invalid login credentials" | Email/password incorrect | Vérifier dans Supabase > Authentication > Users |
| Session perdue après fermeture app (iOS) | IndexedDB non persisté | Vérifier `supabase.js` lignes 50-150 (custom storage) |
| Erreur 401 sur Edge Function | Edge Function pas déployée | Redéployer via `supabase functions deploy login` |
| Boucle de redirection login | Token expiré mal géré | Vérifier `AuthContext.jsx` fonction `refreshSession()` |

### Comment tester
```bash
# Test direct de l'Edge Function
curl -X POST https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@actoos.com","password":"Salifkane&&7"}'
```

---

## 📝 DEVIS

### Flux normal - Création
```
1. Admin ou Technicien remplit le formulaire devis
2. Frontend appelle devisApi.create() dans supabaseApi.js
3. Insertion dans table "devis" + "devis_lignes"
4. Calcul automatique total_ht et total_ttc
```

### Flux normal - Signature
```
1. Client ouvre le devis sur l'app technicien
2. Signe avec le pad de signature
3. Frontend appelle technicianApi.signDevis()
4. Update statut → "signe" dans table "devis"
```

### Flux normal - Conversion en Facture
```
1. Admin clique "Convertir en facture" sur un devis signé
2. Frontend appelle devisApi.convertToFacture()
3. Création nouvelle entrée dans table "factures"
4. Copie des lignes dans "facture_lignes"
5. Update devis.statut → "facture"
```

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `frontend/src/pages/Devis.jsx` | Formulaire création/édition (admin) |
| `frontend/src/pages/TechnicianApp.jsx` | Création + Signature (technicien) |
| `frontend/src/lib/supabaseApi.js` | `devisApi.create()`, `devisApi.convertToFacture()`, `technicianApi.signDevis()` |

### Tables Supabase
| Table | Colonnes clés |
|-------|---------------|
| `devis` | id, numero_devis, client_id, entreprise_id, total_ht, total_ttc, statut, signature, signature_nom |
| `devis_lignes` | id, devis_id, description, quantite, prix_unitaire, tva |

### Problèmes & Solutions

| Problème | Cause probable | Vérifier | Solution |
|----------|----------------|----------|----------|
| Montant affiché 0,00€ | Lignes non créées | Table `devis_lignes` dans Supabase | Vérifier `devisApi.create()` dans `supabaseApi.js` (lignes 265-340) |
| "Column not found: created_by" | Colonne inexistante | Schéma table `devis` | Supprimer `created_by` du code |
| "Column not found: numero" | Mauvais nom colonne | Schéma table `devis` | Utiliser `numero_devis` pas `numero` |
| Signature échoue | Colonnes signature manquantes | Table `devis` | Ajouter colonnes `signature`, `signature_nom`, `signature_date` OU utiliser le fallback (juste update statut) |
| Devis pas visible technicien | Mauvais statut | Table `devis` colonne `statut` | Doit être "envoye" pas "brouillon" |
| Conversion facture échoue | Table factures/facture_lignes | Supabase | Vérifier que les tables existent |

### Comment debugger
```javascript
// Dans la console du navigateur (F12)
// Tester la création de devis
const { devisApi } = await import('./lib/supabaseApi.js');
const result = await devisApi.create({
  client_id: 'UUID_CLIENT',
  entreprise_id: 'UUID_ENTREPRISE',
  lignes: [{ description: 'Test', quantite: 1, prix_unitaire: 100, tva: 20 }]
});
console.log(result);
```

---

## 🧾 FACTURES

### Flux normal
```
1. Création depuis devis (convertToFacture) OU création directe
2. Insertion dans table "factures" + "facture_lignes"
3. Génération PDF via backend /api/factures/{id}/pdf
4. Envoi email au client (optionnel)
```

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `frontend/src/pages/Factures.jsx` | Liste et gestion factures |
| `frontend/src/pages/FactureForm.jsx` | Création/édition facture |
| `frontend/src/lib/supabaseApi.js` | `facturesApi` |
| `backend/pdf_generator.py` | Génération PDF |
| `backend/routers/factures.py` | API endpoint PDF |

### Tables Supabase
| Table | Colonnes clés |
|-------|---------------|
| `factures` | id, numero_facture, client_id, entreprise_id, total_ht, total_ttc, statut, date_echeance |
| `facture_lignes` | id, facture_id, description, quantite, prix_unitaire, tva |

### Problèmes & Solutions

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| PDF ne se génère pas | Backend down ou erreur | Vérifier logs Railway |
| PDF vide ou mal formaté | Données manquantes | Vérifier `pdf_generator.py` |
| Email non envoyé | Clé Resend invalide | Vérifier `RESEND_API_KEY` dans Railway |

---

## 🔧 INTERVENTIONS

### Flux normal
```
1. Admin crée intervention (client, date, technicien)
2. Technicien voit dans son agenda (/tech)
3. Technicien accepte → statut "accepte"
4. Technicien démarre → statut "en_cours"
5. Technicien prend photos, notes
6. Technicien fait signer client
7. Technicien complète → statut "termine"
8. Génération rapport PDF
```

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `frontend/src/pages/Interventions.jsx` | CRUD interventions (admin) |
| `frontend/src/pages/TechnicianApp.jsx` | Vue technicien complète |
| `frontend/src/lib/supabaseApi.js` | `interventionsApi`, `technicianApi` |
| `backend/routers/interventions.py` | API interventions |
| `backend/routers/rapports.py` | Génération rapport PDF |
| `backend/pdf_generator.py` | Template PDF |

### Table Supabase
| Colonne | Description |
|---------|-------------|
| `id` | UUID |
| `titre` | Titre intervention |
| `client_id` | FK vers clients |
| `technicien_id` | FK vers users |
| `entreprise_id` | FK vers entreprises |
| `statut` | planifie, accepte, en_cours, termine, annule |
| `date_intervention` | Date prévue |
| `heure_debut`, `heure_fin` | Heures |
| `signature_client` | Base64 signature |
| `nom_signataire` | Nom du signataire |
| `rapport` | Notes du technicien |

### Problèmes & Solutions

| Problème | Cause probable | Fichier à vérifier | Solution |
|----------|----------------|-------------------|----------|
| "Accepter" ne fonctionne pas | Mauvais ID utilisateur | `TechnicianApp.jsx` ligne ~504 | Vérifier `user.id` vs `user_id` |
| "Démarrer" échoue | Colonne inexistante (geo_start) | `supabaseApi.js` `technicianApi.startIntervention()` | Supprimer les colonnes non existantes |
| Signature échoue | Colonne `signature_nom` vs `nom_signataire` | `supabaseApi.js` | Utiliser le bon nom de colonne |
| Photos non visibles | State écrasé après upload | `TechnicianApp.jsx` ligne ~2230 | Ne pas recharger depuis API après upload |
| Rapport PDF vide | Intervention pas trouvée | `backend/routers/rapports.py` | Vérifier l'ID intervention |

---

## 📸 PHOTOS (Upload)

### Flux normal
```
1. Technicien prend photo sur l'intervention
2. Photo uploadée vers Supabase Storage (bucket "photos")
3. URL stockée dans table "photos"
4. Affichage dans l'UI
```

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `frontend/src/pages/TechnicianApp.jsx` | Composant PhotoUpload (ligne ~744) |
| `frontend/src/lib/supabaseApi.js` | `photosApi.upload()` |

### Configuration Supabase Storage
1. Aller dans Supabase Dashboard > Storage
2. Créer bucket "photos" si inexistant
3. Configurer les policies RLS :

```sql
-- Policy INSERT (upload)
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Policy SELECT (voir)
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');
```

### Problèmes & Solutions

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| "Bucket not found" | Bucket pas créé | Créer bucket "photos" dans Supabase Storage |
| Erreur 403 Forbidden | RLS policies manquantes | Ajouter les policies ci-dessus |
| Photo uploadée mais invisible | State mal géré | Vérifier `setPhotos()` dans TechnicianApp |

---

## 💳 PAIEMENTS (Stripe)

### Flux normal - Abonnement
```
1. Client choisit un plan sur /pricing
2. Redirection vers Stripe Checkout
3. Paiement traité par Stripe
4. Webhook Stripe appelle backend /api/webhooks/stripe
5. Backend met à jour le plan dans Supabase
```

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `frontend/src/pages/Pricing.jsx` | Page tarifs |
| `backend/subscription_service.py` | Gestion abonnements |
| `backend/webhook_service.py` | Réception webhooks Stripe |

### Configuration Stripe
- **Dashboard :** https://dashboard.stripe.com
- **Webhooks :** Dashboard > Developers > Webhooks
- **Endpoint webhook :** `https://actoos-backend.up.railway.app/api/webhooks/stripe`

### Problèmes & Solutions

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| Paiement OK mais plan pas mis à jour | Webhook pas reçu | Vérifier webhook dans Stripe Dashboard |
| Erreur 400 sur webhook | Signature invalide | Vérifier `STRIPE_WEBHOOK_SECRET` |
| "No such price" | ID prix incorrect | Vérifier les price IDs dans Stripe |

---

## 📧 EMAILS (Resend)

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `backend/email_service.py` | Toute la logique d'envoi |

### Configuration
- **Dashboard :** https://resend.com/emails
- **Domaine vérifié :** actoos.com
- **Expéditeur :** noreply@actoos.com

### Problèmes & Solutions

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| Email non reçu | Clé API invalide | Vérifier `RESEND_API_KEY` dans Railway |
| Email en spam | Domaine pas vérifié | Vérifier DNS dans Resend Dashboard |
| Erreur 401 | Clé expirée | Générer nouvelle clé sur Resend |

---

# 4. Erreurs Courantes & Solutions

## Erreurs Supabase

| Code erreur | Message | Cause | Solution |
|-------------|---------|-------|----------|
| 401 | "Invalid JWT" | Token expiré ou invalide | Se reconnecter |
| 403 | "Row level security violation" | RLS policy bloque | Vérifier policies dans Supabase |
| 404 | "Relation does not exist" | Table inexistante | Créer la table |
| 400 | "Column X not found" | Colonne inexistante | Ajouter colonne OU modifier le code |
| 400 | "null value in column X violates not-null" | Valeur requise manquante | Fournir la valeur OU rendre nullable |

## Erreurs Frontend

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Module not found" | Dépendance manquante | `yarn install` |
| Écran blanc | Erreur JS | Ouvrir Console (F12) > Onglet Console |
| "Network Error" | Backend down | Vérifier Railway |
| CORS error | Backend refuse requête | Vérifier `CORS_ORIGINS` |

## Erreurs Backend

| Erreur | Cause | Solution |
|--------|-------|----------|
| 500 Internal Server Error | Bug code | Vérifier logs Railway |
| "Connection refused" | DB down | Vérifier Supabase status |
| ImportError | Module manquant | Ajouter dans requirements.txt |

---

# 5. Logs & Monitoring

## Où trouver les logs

| Service | Où | Comment |
|---------|-----|---------|
| **Frontend (Vercel)** | Vercel Dashboard | Projet > Deployments > View Logs |
| **Backend (Railway)** | Railway Dashboard | Projet > Deployments > View Logs |
| **Supabase** | Supabase Dashboard | Logs > API Logs |
| **Stripe** | Stripe Dashboard | Developers > Logs |
| **Resend** | Resend Dashboard | Emails > Activity |

## Debug Frontend (Navigateur)

```
1. Ouvrir l'app dans Chrome
2. F12 (ou Cmd+Option+I sur Mac)
3. Onglet "Console" → Erreurs JS
4. Onglet "Network" → Requêtes API (filtrer par XHR)
5. Onglet "Application" → localStorage, IndexedDB
```

## Debug Backend (Railway)

```
1. Aller sur https://railway.app/dashboard
2. Cliquer sur le projet actoos-backend
3. Onglet "Deployments"
4. Cliquer sur le déploiement actif
5. "View Logs" pour voir les logs en temps réel
```

---

# 📞 Checklist de Dépannage Rapide

Quand quelque chose ne fonctionne pas :

```
□ 1. Ouvrir la Console navigateur (F12) → Erreur JS ?
□ 2. Onglet Network → Requête échouée ? (rouge)
     → Cliquer dessus → Voir la réponse d'erreur
□ 3. Vérifier Railway → Backend en ligne ?
□ 4. Vérifier Supabase → Tables/données OK ?
□ 5. Vérifier les variables d'environnement
□ 6. Chercher le fichier concerné dans ce guide
□ 7. Tester avec les commandes curl fournies
```

---

# 📚 Référence Rapide des Fichiers

| Fonctionnalité | Fichier Frontend | Fichier Backend |
|----------------|------------------|-----------------|
| Login | `AuthContext.jsx`, `Login.jsx` | Edge Function |
| Interventions | `Interventions.jsx`, `TechnicianApp.jsx` | `routers/interventions.py` |
| Devis | `Devis.jsx`, `TechnicianApp.jsx` | - (Supabase direct) |
| Factures | `Factures.jsx`, `FactureForm.jsx` | `pdf_generator.py` |
| Photos | `TechnicianApp.jsx` (PhotoUpload) | - (Supabase Storage) |
| Clients | `Clients.jsx` | - (Supabase direct) |
| Paiements | `Pricing.jsx` | `subscription_service.py` |
| Emails | - | `email_service.py` |
| PDF | - | `pdf_generator.py` |

---

**Document créé le 10 Mai 2026**
**Dernière mise à jour : 10 Mai 2026**
