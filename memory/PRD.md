# ACTOOS ONE - Product Requirements Document

## Projet
**ACTOOS ONE** - Super-app logistique et fintech pour l'Afrique de l'Ouest

## Vision Produit
"Commande. Paye. Vis." - Une application mobile-first PWA optimisée pour les appareils Android bas de gamme et les réseaux 3G faibles.

## Architecture Technique
- **Frontend**: React PWA (Mobile-First) - `/app/actoos-one/`
- **Backend**: Supabase (PostgreSQL, RLS, Edge Functions)
- **Design System**: 
  - Primary Orange: `#FF5A00`
  - Dark Background: `#111827`
  - Coins arrondis XXL (`rounded-3xl`)
  - Bottom Sheets au lieu de nouvelles pages

## Philosophie
- **Guest-First**: Pas de login requis pour naviguer le catalogue
- **Simplicité > Intelligence**: UX simple et directe
- **Modules isolés**: Chaque feature est autonome

---

## CHANGELOG

### 2024-12-XX - Mission 2 Complete ✅
**Home PWA Guest-First UI**

#### Composants implémentés:
- `Header.jsx` - Logo, slogan, sélecteur d'adresse, barre de recherche
- `CategoryFilter.jsx` - Filtrage horizontal par catégorie cuisine
- `RestaurantCard.jsx` - Cartes restaurant avec lazy-loading images, badges
- `RestaurantFeed.jsx` - Feed avec skeleton loaders pendant chargement
- `BottomNav.jsx` - Navigation 5 onglets (Eats, Health, Wallet, Black, Profil)
- `BottomSheet.jsx` - Composant réutilisable pour modales bottom-up
- `DisabledModuleSheet.jsx` - Info modules désactivés + "Me notifier"
- `Footer.jsx` - CTA Devenir Partenaire/Livreur
- `OfflineBanner.jsx` - Alerte connexion perdue

#### Hooks personnalisés:
- `useOnlineStatus.js` - Détection état réseau
- `useLazyImage.js` - Lazy-loading images avec IntersectionObserver

#### Données mockées:
- 6 restaurants avec images, ratings, temps livraison
- 6 catégories cuisine
- 5 items navigation (1 actif, 4 désactivés)

### 2024-12-XX - Mission 1 Complete ✅
**Foundation SQL Schema**
- 14 tables créées sur Supabase (users, wallets, ledger_transactions, orders, partners, etc.)
- Foreign keys, RLS policies, indexes configurés
- Fichier: `/app/supabase/actoos_one/001_foundation.sql`

---

## ROADMAP

### P0 - En cours ✅
- [x] Mission 1: Foundation SQL
- [x] Mission 2: Home PWA Guest-First UI

### P1 - Prochaines étapes
- [ ] Mission 3: Formulaires, Consentement & Conformité
  - Bottom Sheet Cookie Consent (RGPD)
  - Formulaire Onboarding Partenaire
  - Formulaire Onboarding Livreur
- [ ] Connecter Supabase JS Client au frontend

### P2 - À venir
- [ ] Checkout Guest-First avec OTP Handshake
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
│   │   ├── BottomNav.jsx
│   │   ├── BottomSheet.jsx
│   │   ├── DisabledModuleSheet.jsx
│   │   ├── Footer.jsx
│   │   └── OfflineBanner.jsx
│   ├── data/
│   │   └── mockData.js
│   ├── hooks/
│   │   ├── useOnlineStatus.js
│   │   └── useLazyImage.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Credentials & Config
- **Supabase Project**: ACTOOS ONE (nouveau projet séparé d'ACTOOS PRO)
- **Port développement**: 3001
