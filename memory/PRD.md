# ACTOOS - Product Requirements Document

## Aperçu
**ACTOOS ONE** : Super-app PWA monolithique de logistique et fintech pour l'Afrique de l'Ouest.
**ACTOOS PRO** : SaaS B2B de gestion d'interventions terrain pour l'Europe.

---

## ACTOOS PRO - Bug Fixes (9 Mai 2026 - Session 2)

### 1. Logout Redirect Fix ✅
**Problème:** Le logout ne redirige pas vers /login (utilisateur reste sur /dashboard)
**Cause:** `window.location.replace('/login')` était intercepté par le Service Worker qui cachait les pages authentifiées
**Solution:**
- Changé `window.location.replace()` → `window.location.href` avec setTimeout
- Ajouté cache busting `?t=timestamp`
- Ajouté `caches.keys().then(names => names.forEach(name => caches.delete(name)))` pour nettoyer le cache Service Worker

### 2. Plan Limits Fix ✅
**Problème:** Le compte Enterprise (`contact@actoos.com`) affichait "Passer à Entreprise" au lieu de "Ajouter un site"
**Cause:** `plan_limits` retourné par Supabase Edge Function était vide `{}`, donc `canUseMultiSites` retournait `false`
**Solution:**
- Ajouté `DEFAULT_PLAN_LIMITS` avec fallback par type de plan (startup/pro/enterprise)
- Si `plan_limits` est vide, utilise les valeurs par défaut selon `currentPlan`

### 3. Super Admin Stats Fix ✅
**Problème:** Les statistiques affichaient 0 pour tout (Entreprises, Utilisateurs, MRR)
**Cause:** Structure de `stats` incompatible - `setStats` définissait `total_entreprises` mais le rendu attendait `stats.entreprises.total`
**Solution:**
- Restructuré complètement `loadData()` pour fournir la bonne structure
- Stats maintenant: `stats.entreprises.total`, `stats.users.total`, `stats.revenue.mrr`, etc.
- Ajouté calcul de répartition par plan et par facturation

### Fichiers Modifiés
- `/app/frontend/src/contexts/AuthContext.jsx` (lignes 490-526, 541-595)
- `/app/frontend/src/pages/SuperAdminDashboard.jsx` (loadData refactorisé)

---

## ACTOOS PRO - Voice Notes Feature (9 Mai 2026)

### Fonctionnalité Implémentée
- **Bouton micro** : Apparaît à côté du champ de texte (visible quand le champ est vide)
- **Enregistrement** : Max 1 minute avec indicateur de durée et animation
- **Prévisualisation** : Écouter, supprimer ou envoyer avant confirmation
- **Lecteur audio** : Barre de progression waveform dans les bulles de chat

### Status: ⏸️ BLOQUÉ (iOS Safari)
- L'enregistrement audio sur iOS Safari retourne des blobs vides
- Nécessite une approche différente (ex: `<input type="file" accept="audio/*" capture="microphone">`)

### Fichiers Créés/Modifiés
- `/app/frontend/src/components/VoiceRecorder.jsx` - Composant d'enregistrement
- `/app/frontend/src/components/AudioPlayer.jsx` - Lecteur audio compact
- `/app/frontend/src/components/ChatWidget.jsx` - Intégration complète

### Action Requise dans Supabase

1. **Créer le bucket de stockage** :
   - Aller dans Storage > Create bucket
   - Nom: `chat-attachments`
   - Public: Oui (pour que les audios soient lisibles)

2. **Ajouter les colonnes à chat_messages** :
```sql
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
```

3. **Politique RLS pour le bucket** (si RLS activé):
```sql
-- Permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Permettre la lecture publique
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'chat-attachments');
```

---

## ACTOOS PRO - Chat Edit Feature (9 Mai 2026)

### Fonctionnalité Implémentée
- **Modification des messages** : L'expéditeur peut modifier ses propres messages pendant 15 minutes max
- **Tag "(modifié)"** : S'affiche en italique à côté de l'heure pour les messages édités
- **Suppression interdite** : Aucun bouton de suppression n'est disponible

### Fichiers Modifiés
- `/app/frontend/src/components/ChatWidget.jsx` - UI d'édition complète
- `/app/backend/routers/chat.py` - Endpoint PUT /messages/{id} avec validation 15min

### Action Requise pour l'Utilisateur
Pour persister le tag "(modifié)" après rechargement, ajouter dans Supabase:
```sql
ALTER TABLE chat_messages 
ADD COLUMN is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN edited_at TIMESTAMPTZ;
```

---

## ACTOOS PRO - UI Branding Fix (9 Mai 2026)

### Problème Résolu
L'agent précédent avait utilisé les icônes carrées PWA (`actoos-pro-icon.png`) pour le branding de l'interface web, alors que le logo horizontal avec texte devait être utilisé.

### Solution Implémentée
- **Logo horizontal** (`/logo-actoos-pro-full.png`) pour l'UI web :
  - AuthPages.jsx (Login, Forgot Password, Reset Password)
  - LandingPage.jsx (Header, Footer)
  - PricingPage.jsx (Header, Footer)
  - SignupPage.jsx (Header, Footer)
  - FeaturesPage.jsx (Header)
  - SectorsPage.jsx (Header)
  - Pricing.jsx (ancienne page)

- **Icônes carrées** restent uniquement pour :
  - Manifests PWA (`manifest.json`, `manifest-admin.json`, `manifest-tech.json`)
  - Favicons (`favicon.ico`, `favicon-*.png`)
  - Apps internes (Dashboard, TechnicianApp) où l'icône carrée est appropriée

---

## ACTOOS PRO - Simplified Session Architecture (9 Mai 2026)

### Problème Résolu
Bug récurrent de persistance de session PWA. Les utilisateurs étaient déconnectés lors de:
- Fermeture de l'app PWA
- Rafraîchissement de page
- Navigation entre pages

### Cause Racine
L'ancien système utilisait des préfixes (`admin_token`, `tech_token`) dans localStorage, ce qui causait des conflits et des bugs de nettoyage de session.

### Solution Implémentée
Fichier modifié: `/app/frontend/src/contexts/AuthContext.jsx`

**Architecture simplifiée (session unique) :**
- Clés sans préfixe: `token`, `user`, `entreprise`
- Migration automatique des anciennes clés (`cleanupOldSystem()`)
- Marqueur `cleanup_v3_done` pour éviter les migrations répétées

**Améliorations logout :**
- Clear du cache Service Worker avant redirection
- `window.location.href` avec timestamp anti-cache
- setTimeout pour permettre le nettoyage d'état

**Fallback plan_limits :**
- `DEFAULT_PLAN_LIMITS` par type de plan
- Enterprise: multi_sites, offline_mode, geolocation, etc. = true
- Pro: offline_mode, geolocation = true, multi_sites = false
- Startup: toutes features = false

---

### Comptes de Test ACTOOS PRO
| Email | Rôle | Plan | Mot de passe |
|-------|------|------|--------------|
| contact@actoos.com | Admin | Enterprise | Salifkane&&7 |
| startup@actoos.com | Admin | Startup | Salifkane&&7 |
| pro@actoos.com | Admin | Pro | Salifkane&&7 |
| demo@actoos.com | Admin | Demo | Salifkane&&7 |
| tech.enterprise@actoos.com | Technicien | Enterprise | Salifkane&&7 |
| tech.startup@actoos.com | Technicien | Startup | Salifkane&&7 |
| tech.pro@actoos.com | Technicien | Pro | Salifkane&&7 |
| tech.demo@actoos.com | Technicien | Demo | Salifkane&&7 |

---

## Backlog ACTOOS PRO

### P0 (Complété) ✅
- ✅ Session persistence fix
- ✅ Logout redirect fix
- ✅ Plan limits fallback

### P1 (En attente vérification utilisateur)
- ⏳ **Vérification PWA session sur iPhone** - L'utilisateur doit tester manuellement

### P2 (Backlog)
- 📋 **Firebase Push Notifications** - Pas encore installé dans le projet
- 📋 **Voice Notes iOS Fix** - Bloqué, approche alternative nécessaire

### P3 (Future)
- [ ] Intégration TouchPay/Orange Money réelle (clés API à obtenir)
- [ ] Module Twilio SMS pour Actoos One

---

## ACTOOS ONE - Détails (PAUSED)

### Aperçu
ACTOOS ONE est une super-app PWA monolithique de logistique et fintech pour l'Afrique de l'Ouest. Actuellement en pause - priorité donnée à ACTOOS PRO.

## Stack Technique
- **Frontend**: React PWA, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **APIs**: Nominatim OpenStreetMap (Géocodage inverse), localStorage (persistance panier)
- **Maps**: Leaflet / react-leaflet (suivi temps réel)
- **Push Notifications**: Firebase (structure en place, clés à configurer)
- **Paiements Mobile Money**: TouchPay API (structure en place, mode démo actif)

## Architecture Multi-Pays (Afrique de l'Ouest)
| Pays | Code | Drapeau | Préfixe | Statut |
|------|------|---------|---------|--------|
| Mali | ML | 🇲🇱 | +223 | ✅ LANCÉ (16 restaurants Bamako) |
| Sénégal | SN | 🇸🇳 | +221 | ✅ LANCÉ (4 restaurants Dakar) |
| Côte d'Ivoire | CI | 🇨🇮 | +225 | 🔜 BIENTÔT |
| Burkina Faso | BF | 🇧🇫 | +226 | 🔜 BIENTÔT |
| + 6 autres pays | ... | ... | ... | 🔜 BIENTÔT |

---

## Notes Importantes
- **LANGUE**: Toujours répondre en français
- **PROACTIVITÉ**: Ne pas mocker si table Supabase existe
- **AuthContext**: NE PAS réintroduire les préfixes `admin_`/`tech_` - c'était la cause du bug
- **Settlement**: S'exécute au Handshake #A42
- **Cash Flow**: Caution livreur débitée pour paiements cash
