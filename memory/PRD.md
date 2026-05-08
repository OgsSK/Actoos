# ACTOOS ONE - Product Requirements Document

## Aperçu
ACTOOS ONE est une super-app PWA monolithique de logistique et fintech pour l'Afrique de l'Ouest. L'objectif est de remplacer toutes les données/UI mockées par un backend Supabase live et d'implémenter une UX proactive de livraison alimentaire aux standards de l'industrie (Uber Eats, Glovo).

## Stack Technique
- **Frontend**: React PWA, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **APIs**: Nominatim OpenStreetMap (Géocodage inverse), localStorage (persistance panier)

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

#### Bug Fix: Cart Auth Flow (P0 - RÉSOLU)
- [x] **LoginSheet ne s'ouvrait pas depuis CartSheet**
  - Cause: Le `LoginSheet` n'était pas rendu dans le bloc `SCREENS.RESTAURANT`
  - Fix: Ajout du `LoginSheet` dans le JSX fragment du restaurant screen
  - Fix: `handleLoginFromCart` ferme maintenant le `CartSheet` avant d'ouvrir le `LoginSheet`
  - Résultat: Flux guest → login → checkout fonctionne parfaitement (style Uber Eats)

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

### P1 (Important - À FAIRE)
- [ ] **Exécuter migration Supabase** (`/supabase/migrations/20260508_financial_system.sql`)
- [ ] Push Notifications réelles
- [ ] Page tracking commande temps réel (carte)
- [ ] Intégration API TouchPay/Orange Money/Wave réelle

### P2 (Normal)
- [ ] Validation codes promo via Supabase
- [ ] Coordonnées GPS réelles restaurants
- [ ] Calcul distance réel PostGIS
- [ ] SMS OTP via Twilio

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
├── financialService.js    # Opérations financières complètes (NOUVEAU)
├── walletService.js       # Opérations wallet basiques
├── driverService.js       # Gestion livreurs
├── orderService.js        # Gestion commandes
└── supabaseClient.js      # Client Supabase
```

### Config Business
```
/config/
└── businessConfig.js      # Commissions, frais livraison, limites
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
