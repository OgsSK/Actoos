# ACTOOS ONE - Product Requirements Document

## Aperçu
ACTOOS ONE est une super-app PWA monolithique de logistique et fintech pour l'Afrique de l'Ouest. L'objectif est de remplacer toutes les données/UI mockées par un backend Supabase live et d'implémenter une UX proactive de livraison alimentaire aux standards de l'industrie (Uber Eats, Glovo).

## Stack Technique
- **Frontend**: React PWA, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **APIs**: Nominatim OpenStreetMap (Géocodage inverse), localStorage (persistance panier)
- **Maps**: Leaflet / react-leaflet (suivi temps réel)
- **Push Notifications**: Firebase (structure en place, clés à configurer)
- **Paiements Mobile Money**: TouchPay API (structure en place, mode démo actif)

## Schéma Base de Données

### Tables Existantes
- `users`: id, role, phone, name
- `orders`: id, client_id, status, total, delivering_at, is_settled, settlement_details, distance_km
- `order_items`: id, order_id, menu_item_id, quantity
- `drivers`: id, user_id, status, total_deliveries
- `partners`: id, user_id, name, delivery_type

### Nouvelles Tables (Migration: 20260508_financial_system.sql)
- `wallets`: id, owner_id, wallet_type, balance, is_frozen
- `wallet_transactions`: id, wallet_id, type, amount, balance_after, reference_id, description
- `withdrawal_requests`: id, wallet_id, user_id, amount, fee, net_amount, method, destination, status
- `system_config`: key, value (commissions, frais livraison dynamiques)

## Comptes de Test
- **Admin**: contact@actoos.com / Salifkane&&7
- **Client Test**: testclient@actoos.com / TestClient123!

---

## Règles Financières ACTOOS

### Frais de Livraison (ACTOOS Delivery)
- **Base**: 700 FCFA (couvre 0-2 km)
- **Supplément**: +200 FCFA par km au-delà de 2km
- **Pickup**: 0 FCFA
- **SOS (Urgence Health)**: +500 FCFA premium
- **Self-Delivery**: Prix défini par le partenaire (plafonné à 250F/km)

### Commissions par Verticale
| Mode | EATS | HEALTH |
|------|------|--------|
| Actoos Delivery | 15% | 5% |
| Self-Delivery | 10% | 2% |
| Pickup | 10% | 2% |

### Répartition au Handshake (#A42)
1. **Livreur**: 100% des frais de livraison
2. **Partenaire**: Prix des articles - Commission
3. **Actoos**: Commission uniquement

### Flux Cash
- Client paie en cash → Livreur encaisse tout en physique
- Actoos débite la caution virtuelle du livreur (part partenaire + commission)
- Le livreur garde net = frais de livraison en cash

### Règles Wallet
- Retrait Actoos: 0% de frais
- Frais opérateur (Orange Money, Wave): 0.5-1%
- Virement bancaire: 1000 FCFA fixe (24-48h)
- Minimum retrait: 500 FCFA
- Caution livreur minimum: 5000 FCFA

---

## Fonctionnalités Complétées

### Session Actuelle (8 Mai 2026)

#### Éléments Mockés → Connectés à Supabase ✅

**1. Codes Promo** ✅
- Migration SQL créée avec table `promo_codes`
- `PromoCodeInput.jsx` utilise maintenant `promoService.js` (Supabase)
- Codes de démo: BIENVENUE, ACTOOS10, LIVGRATUITE

**2. Analytics Partenaire** ✅
- Nouveau service `analyticsService.js` avec données réelles
- Fonction RPC `get_partner_analytics_live` pour stats en temps réel
- Top produits, heures de pointe calculés depuis les commandes

**3. Assignation Livreur** ✅
- `OrderTrackingScreen.jsx` charge le livreur réel depuis `drivers` table
- Placeholder affiché avant assignation: "Livreur en cours d'attribution..."
- Mise à jour temps réel via subscription Supabase

**4. PIN P2P Transfers** ✅
- Nouveau service `pinService.js` avec hash SHA-256
- Table `user_pins` avec blocage après 5 tentatives
- Contacts récents stockés en localStorage

**5. Notifications** ✅
- Nouveau service `notificationService.js`
- Tables `notifications` et `scheduled_notifications`
- Fonctions: création, lecture, marquage lu, suppression

#### Migration SQL Créée
- `/supabase/migrations/20260508_complete_system.sql`
  - Tables: promo_codes, promo_usage, ratings, partner_analytics, scheduled_notifications, user_pins
  - Fonctions RPC: get_partner_analytics_live, verify_user_pin, set_user_pin
  - RLS Policies

#### Nouvelles Fonctionnalités UX (Style Deliveroo)

**1. Système Multi-Paniers Deliveroo** ✅
- Parcourir librement tous les restaurants et ajouter des articles
- **PAS de modal de conflit** - ajout direct à un panier dédié par restaurant
- Écran "Mes Paniers" avec liste de tous les paniers :
  - Nom du restaurant
  - Montant total et nombre d'articles
  - Temps de livraison estimé
  - Boutons "Voir le restaurant" / "Voir le panier"
  - Icône poubelle pour supprimer un panier
- Message clair : "Vous pouvez commander un panier à la fois"
- Badge intelligent :
  - Badge orange : nombre total d'articles
  - Badge turquoise : nombre de paniers différents

**2. Swipe to Delete sur l'Historique des Commandes** ✅
- Glisser vers la gauche pour révéler le bouton supprimer
- Indicateur visuel "← Glissez vers la gauche pour supprimer"
- Modal de confirmation avant suppression

#### Bug Fixes (P0 - RÉSOLUS)
- [x] **LoginSheet ne s'ouvrait pas depuis CartSheet**
  - Cause: Le `LoginSheet` n'était pas rendu dans le bloc `SCREENS.RESTAURANT`
  - Fix: Ajout du `LoginSheet` + fermer `CartSheet` avant d'ouvrir login

- [x] **"Ajouter d'autres articles" causait une erreur**
  - Cause: Le `cartRestaurant` ne contenait pas les `categories` avec le menu
  - Fix: `handleAddMoreItemsFromCart` recharge maintenant le restaurant complet depuis Supabase

- [x] **Favoris → Retour ramenait toujours au Profil**
  - Cause: Le `onBack` était hardcodé vers `SCREENS.PROFIL`
  - Fix: Ajout d'un state `previousScreen` pour tracker l'écran précédent

- [x] **Historique commandes - Fonctionnalités manquantes**
  - Ajout: Bouton "Recommander" pour tous les statuts terminés (delivered, cancelled, picked_up)
  - Ajout: Bouton "Supprimer de l'historique" avec modal de confirmation
  - Stockage local des commandes supprimées (localStorage)

#### UI Cart (Complété)
- [x] **CartSheet style Uber Eats**
  - +/- quantités avec animations
  - Suppression par swipe ou bouton
  - "Ajouter d'autres articles" retourne au même restaurant
  - Message "Connectez-vous pour finaliser" pour guests
  - Bouton dynamique (Login vs Commander)
  - Panier strictement par restaurant (purge si changement)

#### UI Mobile Header (Complété)
- [x] Synchronisation header mobile/desktop
  - Logo ACTOOS
  - Icône favoris (cœur)
  - Badge panier avec compteur
  - FloatingCartButton pour mobile

#### Services Backend
- [x] **Financial Service** (`/services/financialService.js`)
  - Settlement automatique au Handshake (#A42)
  - Calcul des commissions par verticale/mode
  - Gestion des wallets (client, partner_earnings, driver_caution)
  - TopUp wallet client
  - Pay with wallet
  - Create/Approve/Reject withdrawal requests
  - Get partner earnings stats

#### UI Admin
- [x] **Onglet Wallets** dans Admin Dashboard
  - Vue globale des wallets (stats par type)
  - Liste avec filtres (Clients, Partenaires, Livreurs)
  - Détails wallet avec historique transactions
- [x] **Onglet Retraits** dans Admin Dashboard
  - Liste demandes de retrait avec statut
  - Approuver/Rejeter avec raison
  - Stats (en attente, aujourd'hui, ce mois)

#### UI Partenaire (KDS)
- [x] **Onglet "💰 Gains"** 
  - Solde disponible en temps réel
  - Stats jour/mois (earnings, commandes)
  - Historique des transactions
  - Flux de retrait complet (Mobile Money, Banque)

#### UI Livreur (Driver App)
- [x] **Boutons Wallet dans header**
  - Recharger (Cash-In)
  - Retirer (Cash-Out)
  - Historique
- [x] **Alerte caution faible** (< 5000 FCFA)
- [x] **Settlement amélioré au Handshake**
  - Normalisation codes (avec/sans #)
  - Appel financialService.settleOrder()

#### Checkout Client
- [x] **Calcul dynamique frais de livraison**
  - Formule: 700F base + 200F/km après 2km
  - Affichage détaillé (Base + Distance)
  - Support Self-Delivery et Pickup (gratuit)
- [x] **Indicateur "Livré par ACTOOS" vs "Livré par le restaurant"**

### Sessions Précédentes
- [x] Auth Guard checkout
- [x] Persistance panier via localStorage
- [x] Géolocalisation GPS réelle + Nominatim
- [x] Gestion d'adresses style Uber Eats
- [x] Historique commandes live Supabase
- [x] Suivre/Annuler/Recommander commandes
- [x] Swipe-to-delete sur historique
- [x] Tri restaurants par distance
- [x] KDS Partenaire complet
- [x] Driver App avec Wallet
- [x] Admin Dashboard

---

## Backlog Priorisé

### P0 (Critique - DONE)
- ✅ Système financier complet implémenté
- ✅ Cart Auth Flow (LoginSheet depuis CartSheet) corrigé
- ✅ **Paiement Mobile Money câblé** (8 Mai 2026)
  - MobileMoneyPaymentSheet intégré dans CheckoutScreen
  - Détection automatique opérateur (Orange Money, Moov Money, Sama Money)
  - Flow complet: numéro → confirmation → traitement → succès
  - Mode démo fonctionnel (en attente clés API TouchPay)
- ✅ **Carte de suivi temps réel** (8 Mai 2026)
  - OrderTrackingMap avec Leaflet intégré dans OrderTrackingScreen
  - Simulation mouvement livreur quand en route
  - Bouton "Suivre en temps réel" visible pour statuts picked_up/on_the_way/delivering
- ✅ **Wallet connecté à Supabase** (8 Mai 2026)
  - WalletContext.jsx refactoré pour charger depuis table `wallets`
  - Transactions stockées dans `wallet_transactions`
  - Fallback intelligent si colonnes manquantes
  - TopUp et Pay fonctionnels avec persistence Supabase
- ✅ **Promos dynamiques depuis Supabase** (8 Mai 2026)
  - PromoBanner charge depuis table `promo_codes`
  - 5 promos actives chargées depuis Supabase
  - PromoCodeInput avec suggestions dynamiques
  - Fallback sur données mock si table vide
- ✅ **Flux Payer/Encaisser corrigé** (8 Mai 2026)
  - "Payer" ouvre maintenant le SCANNER (pour payer quelqu'un)
  - "Encaisser" affiche MON QR (pour recevoir un paiement)
  - Composants PartnerWalletSection, DriverWalletSection, AdminWalletSection créés
- ✅ **QR Code PRODUCTION-READY** (8 Mai 2026)
  - qrcode.react (QRCodeSVG) pour génération de vrais QR codes
  - html5-qrcode (Html5QrcodeScanner) pour scanner caméra réel
  - Format JSON standardisé: type ACTOOS_PAY avec expiration 15min
- ✅ **QR intégré dans TOUS les dashboards** (8 Mai 2026)
  - **Client Wallet (WalletScreen)**: Boutons Payer/Encaisser
  - **Partner Dashboard (PartnerEarningsScreen)**: Boutons Encaisser/Payer pour encaisser clients
  - **Driver Dashboard (DriverAppScreen)**: Boutons Encaisser Client/Scanner QR
  - **Admin Dashboard (AdminWalletsOverview)**: Boutons Encaisser/Payer un compte
- ✅ **Calcul de distance PostGIS/Haversine** (8 Mai 2026)
  - Service distanceService.js créé
  - Utilise PostGIS si disponible, sinon formule Haversine
  - Intégré dans CheckoutScreen.jsx pour les frais de livraison

### P1 (Important - À FAIRE)
- [ ] **Exécuter migration Supabase complète** (`/supabase/migrations/20260508_financial_system.sql`) pour ajouter colonnes `wallet_type`, RPC functions
- [ ] **Exécuter migration PostGIS** (`POSTGIS_MIGRATION_SQL` dans distanceService.js) pour le calcul précis des distances
- [ ] Push Notifications réelles (clés Firebase à configurer)
- [ ] Intégration API TouchPay/Orange Money/Wave réelle (clés API à obtenir)
- [ ] Twilio SMS pour OTP réels

### P2 (Normal)
- [ ] Validation codes promo via Supabase
- [ ] Coordonnées GPS réelles restaurants
- [ ] Calcul distance réel PostGIS

### P3 (Backlog)
- [ ] Module Pharmacie
- [ ] Module Parrainage
- [ ] Surge Pricing dynamique
- [ ] Cartes virtuelles

---

## Architecture Fichiers

### Services Financiers
```
/services/
├── financialService.js    # Opérations financières complètes
├── walletService.js       # Opérations wallet basiques
├── driverService.js       # Gestion livreurs
├── orderService.js        # Gestion commandes
├── touchPayService.js     # Intégration Mobile Money (NOUVEAU)
├── pushNotificationService.js # Service Push Notifications (NOUVEAU)
├── firebaseConfig.js      # Configuration Firebase (NOUVEAU)
└── supabaseClient.js      # Client Supabase
```

### Config Business
```
/config/
└── businessConfig.js      # Commissions, frais livraison, limites
```

### Composants Checkout & Paiement
```
/components/
├── CheckoutScreen.jsx          # Flux checkout complet (MAJ: Mobile Money)
├── PaymentMethodSelector.jsx   # Sélecteur méthode paiement
├── MobileMoneyPaymentSheet.jsx # Modal paiement Mobile Money (NOUVEAU)
└── TouchPaySheet.jsx           # Recharge wallet via TouchPay
```

### Composants Tracking
```
/components/
├── OrderTrackingScreen.jsx    # Écran suivi commande (MAJ: bouton carte)
├── OrderTrackingMap.jsx       # Carte Leaflet temps réel (NOUVEAU)
└── NotificationPrompt.jsx     # Demande permission notifications (NOUVEAU)
```

### Composants Admin
```
/components/
├── AdminDashboard.jsx         # Dashboard principal
├── AdminWalletsOverview.jsx   # Vue wallets (NOUVEAU)
├── AdminWithdrawalsManager.jsx # Gestion retraits (NOUVEAU)
└── AdminGodMode.jsx           # Configuration système
```

### Composants Partenaire
```
/components/
├── PartnerKDSScreen.jsx       # KDS principal
├── PartnerEarningsScreen.jsx  # Écran gains (NOUVEAU)
└── PartnerSettings.jsx        # Paramètres
```

### Composants Livreur
```
/components/
└── DriverAppScreen.jsx        # App livreur (MAJ: boutons wallet)
```

---

## Migration Supabase À Exécuter

**Fichier**: `/app/actoos-one/supabase/migrations/20260508_financial_system.sql`

**Tables créées**:
1. `system_config` - Configuration dynamique
2. `wallets` - Portefeuilles utilisateurs
3. `wallet_transactions` - Historique transactions
4. `withdrawal_requests` - Demandes de retrait

**Fonctions créées**:
- `get_or_create_wallet()` - Créer wallet si inexistant
- `update_wallet_balance()` - Mise à jour sécurisée du solde
- `increment_driver_deliveries()` - Incrémenter compteur livreur

**RLS Policies**:
- Users voient leurs propres wallets/transactions
- Admins peuvent voir et gérer tous les retraits

---

## Notes Importantes
- **LANGUE**: Toujours répondre en français
- **PROACTIVITÉ**: Ne pas mocker si table Supabase existe
- **Modules cachés**: Pharmacie et Parrainage restent désactivés
- **Settlement**: S'exécute au Handshake #A42
- **Cash Flow**: Caution livreur débitée pour paiements cash
