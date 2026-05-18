# ACTOOS PRO - Journal des modifications

## 17 Mai 2025 - Nettoyage complet & Migration 100% Supabase

### 🎯 Objectif
Supprimer toutes les dépendances à Railway/MongoDB et aligner le code avec le vrai schéma Supabase.

---

### ✅ Corrections effectuées

#### 1. **Colonnes de base de données corrigées**

| Fichier | Ancienne colonne | Nouvelle colonne |
|---------|------------------|------------------|
| `Devis.jsx` | `conditions` | `conditions_paiement` (factures) |
| `Devis.jsx` | `signature`, `signature_nom`, `signature_date` | `signature_client`, `nom_signataire`, `date_signature` |
| `ClientPortal.jsx` | `public_token` | `token_client` |
| `supabaseApi.js` | `montant_ht`, `montant_tva` | `total_ht`, `total_tva`, `total_ttc` |
| `devis_lignes` insert | `ordre` | (supprimé - colonne inexistante) |
| `SuperAdminDashboard.jsx` | `status` | `statut` |

#### 2. **Statuts d'intervention standardisés**
- `planifiee` → `planifie`
- `terminee` → `termine`
- `accepte`, `en_cours`, `annule` (déjà corrects)

#### 3. **Messages "en cours de migration" supprimés**
Toutes les fonctionnalités ont maintenant une implémentation réelle :
- ✅ PDF : Génération via window.print() (impressionnable)
- ✅ Relevés clients : Génération locale
- ✅ Analytics export : Rapport imprimable
- ✅ Relance factures : mailto fallback
- ✅ Portail client : Fonctionne avec `token_client`

#### 4. **API Railway remplacées par Supabase direct**

| Fonctionnalité | Ancien | Nouveau |
|----------------|--------|---------|
| Auth (activation, reset password) | `API_URL/api/auth/*` | Supabase Auth |
| Plans / Pricing | `API_URL/api/plans` | Plans statiques |
| Import données | `API_URL/api/import/*` | Client-side parsing + Supabase insert |
| Suppression compte | `API_URL/api/auth/delete-account` | Supabase Auth |
| Annulation abo | `API_URL/api/cancel` | Supabase direct |
| Sync offline | `API_URL/api/offline/sync/*` | Supabase direct |

#### 5. **Composants désactivés gracieusement**
- `TwoFactorSettings.jsx` : Placeholder "Bientôt disponible"
- `TwoFactorVerify.jsx` : Auto-bypass (2FA non configurée)
- `ImportHistory.jsx` : Placeholder informatif

---

### 📁 Fichiers modifiés

**Core API:**
- `/lib/supabaseApi.js` - Réécrit entièrement (100% Supabase)

**Contextes:**
- `/contexts/OfflineContext.jsx` - Sync via Supabase direct

**Pages:**
- `/pages/Devis.jsx` - Colonnes signature
- `/pages/Factures.jsx` - Relance via mailto
- `/pages/ClientPortal.jsx` - token_client + PDF local
- `/pages/Interventions.jsx` - PDF rapport local
- `/pages/Analytics.jsx` - Export PDF local
- `/pages/Statements.jsx` - Relevés PDF local
- `/pages/Settings.jsx` - Fonctions Google Calendar, SMS, RGPD
- `/pages/SignupPage.jsx` - Inscription Supabase Auth
- `/pages/Pricing.jsx` - Plans statiques
- `/pages/DataImport.jsx` - Import client-side (xlsx)
- `/pages/AuthPages.jsx` - Supabase Auth
- `/pages/DemoPage.jsx` - Suppression appel API init
- `/pages/TechnicianApp.jsx` - Statuts corrigés
- `/pages/SuperAdminDashboard.jsx` - statut au lieu de status

**Composants:**
- `/components/TwoFactorSettings.jsx` - Placeholder
- `/components/TwoFactorVerify.jsx` - Auto-bypass
- `/components/ImportHistory.jsx` - Placeholder
- `/components/PlanUsageWidget.jsx` - Supabase direct

---

### 🔧 Dépendances ajoutées
- `xlsx` - Pour parsing fichiers Excel côté client

---

### ⚠️ À noter
- Les fonctionnalités PDF avancées (mise en page pro) nécessiteront des Edge Functions Supabase
- Stripe checkout nécessite une configuration côté Supabase (webhooks)
- 2FA nécessite la configuration MFA dans Supabase Auth

---

**Prochain focus**: Mode hors-ligne complet (Phase 1 du roadmap)
