# ACTOOS ONE - Product Requirements Document

## Projet
**ACTOOS ONE** - Super-app logistique et fintech pour l'Afrique de l'Ouest

## Vision Produit
"Tout. Tout de suite. Partout." - Une application mobile-first PWA optimisée pour les appareils Android bas de gamme et les réseaux 3G faibles.

## Localisation
- **Ville par défaut**: Bamako, Mali
- **Préfixe téléphone**: +223

## Architecture Technique
- **Frontend**: React PWA (Mobile-First) - `/app/actoos-one/`
- **Backend**: Supabase (PostgreSQL, RLS, Edge Functions)
- **Design System**: 
  - **MODE CLAIR** (Fond blanc)
  - Primary Orange: `#FF5A00`
  - Coins arrondis XXL (`rounded-3xl`)
  - Bottom Sheets au lieu de nouvelles pages
  - Tailwind CSS v3

## Philosophie
- **Guest-First**: Pas de login requis pour naviguer le catalogue
- **Simplicité > Intelligence**: UX simple et directe
- **Modules isolés**: Chaque feature est autonome
- **4 Modules dans 1 PWA**: Client, Partner, Driver, Admin

---

## CHANGELOG

### 2025-01-07 - Mission 6 Complete ✅
**ACTOOS PRO - KDS Restaurateur**

#### Composants implémentés:
- `PartnerKDSScreen.jsx` - Écran principal KDS avec tabs (Commandes / Mon Menu)
- `KDSOrderCard.jsx` - Carte commande avec:
  - Bannière rouge clignotante pour instructions spéciales
  - Bouton "MARQUER PRÊT" large et orange
  - Badges paiement (Mobile bleu / Cash jaune)
  - Temps écoulé depuis création
  - Bordure colorée selon statut (jaune/bleu/vert)
- `KDSMenuManager.jsx` - Gestionnaire de menu avec:
  - Toggle disponibilité par article
  - Compteur max par commande (+/-)
  - Badge "Rupture" en rouge
  - Stats articles disponibles/en rupture

#### Fonctionnalités:
- Auto-refresh toutes les 5 secondes
- Son de notification pour nouvelles commandes
- Toggle activation/désactivation son
- Layout optimisé tablette (grille responsive)
- Statistiques temps réel (En attente / En préparation / Prêtes)

#### Données mockées:
- `kdsData.js` - 3 commandes mock, 8 articles menu

---

### 2025-01-07 - Mission 5 Complete ✅
**Onboarding Funnels, Legal & Cookie Consent**

#### Composants implémentés:
- `DriverOnboardingScreen.jsx` - Funnel 3 étapes (Identité, Véhicule, Documents)
- `PartnerOnboardingScreen.jsx` - Funnel 3 étapes (Restaurant, Menu, Documents)
- `TermsScreen.jsx` - CGU complètes
- `LegalScreen.jsx` - Mentions légales + contact
- `CookieConsentSheet.jsx` - Bannière cookies moderne (style Uber)
- `PrivacySettingsSheet.jsx` - Paramètres granulaires cookies

#### SQL:
- `002_consents.sql` - Table `user_consents` pour conformité RGPD

---

### 2025-01-07 - Mission 4 Complete ✅
**Checkout Flow & OTP**

#### Composants implémentés:
- `CheckoutScreen.jsx` - Écran de paiement complet avec:
  - Récapitulatif commande
  - Sélecteur méthode paiement (Orange Money, Wave, Moov, Cash)
  - Champ téléphone +223
  - Modal OTP 4 chiffres avec autofocus
  - Confirmation commande

#### Services mockés:
- `otpService.js` - Mock OTP (code: 1366)
- `orderService.js` - Mock création commande

---

### 2025-01-07 - Mission 3 Complete ✅
**Restaurant Menu & Cart**

#### Composants implémentés:
- `RestaurantScreen.jsx` - Page menu restaurant avec catégories
- `MenuItemCard.jsx` - Carte article avec ajout au panier
- `AddToCartSheet.jsx` - Bottom sheet ajout panier avec quantité
- `CartSheet.jsx` - Récapitulatif panier flottant

#### Context:
- `CartContext.jsx` - État global panier

#### Données mockées:
- `menuData.js` - Menus complets pour 2 restaurants

---

### 2025-01-07 - Mission 2 Complete ✅
**Home PWA Guest-First UI**

#### Composants implémentés:
- `Header.jsx` - Logo, slogan, sélecteur d'adresse, barre de recherche
- `CategoryFilter.jsx` - Filtrage horizontal par catégorie cuisine
- `RestaurantCard.jsx` - Cartes restaurant avec lazy-loading images, badges
- `RestaurantFeed.jsx` - Feed avec skeleton loaders
- `BottomNav.jsx` - Navigation 5 onglets (Eats, Health, Wallet, Black, Profil)
- `BottomSheet.jsx` - Composant modal bottom-up réutilisable
- `DisabledModuleSheet.jsx` - Info modules désactivés + "Me notifier"
- `Footer.jsx` - CTA Devenir Partenaire/Livreur + Accès KDS Demo
- `OfflineBanner.jsx` - Alerte connexion perdue

#### Hooks personnalisés:
- `useOnlineStatus.js` - Détection état réseau
- `useLazyImage.js` - Lazy-loading images avec IntersectionObserver

#### Données mockées:
- 6 restaurants avec images, ratings, temps livraison
- 6 catégories cuisine
- 5 items navigation (1 actif, 4 désactivés)

---

### 2025-01-07 - Mission 1 Complete ✅
**Foundation SQL Schema**
- 14 tables créées sur Supabase (users, wallets, ledger_transactions, orders, partners, etc.)
- Foreign keys, RLS policies, indexes configurés
- Fichier: `/app/supabase/actoos_one/001_foundation.sql`

---

## ROADMAP

### P0 - Complété ✅
- [x] Mission 1: Foundation SQL
- [x] Mission 2: Home PWA Guest-First UI
- [x] Mission 3: Restaurant Menu & Cart
- [x] Mission 4: Checkout Flow & OTP
- [x] Mission 5: Onboarding Funnels, Legal, Cookie Consent
- [x] Mission 6: KDS Restaurateur (ACTOOS PRO)

### P1 - Prochaines étapes
- [ ] Mission 7: Module Chauffeur (Driver App)
- [ ] Mission 8: Admin Fallback UI
- [ ] Connecter Supabase JS Client au frontend

### P2 - À venir
- [ ] OTP réel côté serveur (Supabase Edge Functions)
- [ ] Wallet Engine (SQL transactions `SELECT FOR UPDATE`)
- [ ] Modules Health, Black

### P3 - Backlog
- [ ] Push Notifications
- [ ] PWA Service Worker (offline caching)
- [ ] Analytics & Tracking

---

## Structure Fichiers ACTOOS ONE

```
/app/actoos-one/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── CategoryFilter.jsx
│   │   ├── RestaurantCard.jsx
│   │   ├── RestaurantFeed.jsx
│   │   ├── RestaurantScreen.jsx
│   │   ├── MenuItemCard.jsx
│   │   ├── AddToCartSheet.jsx
│   │   ├── CartSheet.jsx
│   │   ├── CheckoutScreen.jsx
│   │   ├── DriverOnboardingScreen.jsx
│   │   ├── PartnerOnboardingScreen.jsx
│   │   ├── PartnerKDSScreen.jsx
│   │   ├── KDSOrderCard.jsx
│   │   ├── KDSMenuManager.jsx
│   │   ├── TermsScreen.jsx
│   │   ├── LegalScreen.jsx
│   │   ├── CookieConsentSheet.jsx
│   │   ├── PrivacySettingsSheet.jsx
│   │   ├── BottomNav.jsx
│   │   ├── BottomSheet.jsx
│   │   ├── DisabledModuleSheet.jsx
│   │   ├── Footer.jsx
│   │   └── OfflineBanner.jsx
│   ├── context/
│   │   └── CartContext.jsx
│   ├── data/
│   │   ├── mockData.js
│   │   ├── menuData.js
│   │   └── kdsData.js
│   ├── hooks/
│   │   ├── useOnlineStatus.js
│   │   └── useLazyImage.js
│   ├── services/
│   │   ├── otpService.js
│   │   └── orderService.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── tailwind.config.js
├── postcss.config.js
└── package.json

/app/supabase/actoos_one/
├── 001_foundation.sql
└── 002_consents.sql
```

---

## Credentials & Config (MOCK)
- **Mock OTP pour tests**: `1366`
- **Ville par défaut**: Bamako, Mali
- **Préfixe téléphone**: +223

---

## RÈGLES CRITIQUES
1. **MODE CLAIR OBLIGATOIRE** - Fond blanc + Orange #FF5A00
2. **1 PWA, 4 Modules** - Ne PAS créer 4 apps séparées
3. **Localisation Bamako** - Pas Abidjan
4. **Guest-First** - Navigation sans login
