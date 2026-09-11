# Actoos ID — Vision, Architecture et Plan de Migration

> **Statut :** En cours de mise en œuvre
> **Dernière mise à jour :** 11 septembre 2026
> **Responsable :** Équipe Actoos
> **Version :** 1.0

---

## 1. Vision

### 1.1 Le problème

Aujourd'hui, chaque produit Actoos fonctionne en silo :
- **Actoos Jobs** a sa propre authentification (Supabase Auth)
- **Actoos Studio** (dashboard client) utilise un système par token
- **Actoos Admin** utilise un mot de passe en dur
- **Actoos Pro** (à venir) aura sa propre auth

**Conséquences :**
- Un utilisateur doit jongler entre plusieurs identités
- Ajouter un nouveau produit = 2 semaines de dev auth
- Impossible de faire du SSO
- Pas d'expérience "écosystème"

### 1.2 La solution : Actoos ID

**Actoos ID** est l'infrastructure d'identité unique pour tous les produits Actoos.

**Principes :**
1. **Un compte unique** pour tous les produits
2. **La vitrine ne fait pas d'auth** — elle pointe vers Actoos ID
3. **SSO cross-domain** via cookie `.actoos.com`
4. **Multi-comptes** (switch entre comptes comme Google)
5. **Progressif** — chaque produit migre indépendamment

### 1.3 Ce que ça permet

| Avant | Après |
|-------|-------|
| 4 systèmes d'auth séparés | 1 système central |
| Un compte par produit | Un compte pour tout |
| Ajout produit = 2 semaines | Ajout produit = 1 jour |
| Pas de SSO | SSO natif |
| Duplication de code | Code partagé |

---

## 2. État actuel (11 sept. 2026)

### 2.1 Ce qui existe

| Composant | Technologie | Auth actuelle |
|-----------|-------------|---------------|
| **actoos-jobs** | React SPA (CRA 5) + FastAPI | Supabase Auth (complète) |
| **vitrine** (actoos.com) | Next.js 14 App Router | Aucune |
| **Studio** (dashboard client) | Next.js | Token dans l'URL |
| **Admin** | Next.js | Mot de passe en dur |
| **actoos-pro** | À venir | — |

### 2.2 Le package partagé (nouveau)

**Emplacement :** `packages/auth-client/`

**Contenu :**