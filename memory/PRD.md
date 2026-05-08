# ACTOOS ONE - Product Requirements Document

## Aperçu
ACTOOS ONE est une super-app PWA monolithique de logistique et fintech pour l'Afrique de l'Ouest. L'objectif est de remplacer toutes les données/UI mockées par un backend Supabase live et d'implémenter une UX proactive de livraison alimentaire aux standards de l'industrie (Uber Eats, Glovo).

## Stack Technique
- **Frontend**: React PWA, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **APIs**: Nominatim OpenStreetMap (Géocodage inverse), localStorage (persistance panier)

## Schéma Base de Données
- `users`: id, role, phone, name
- `orders`: id, client_id, status, total, delivering_at, is_settled, settlement_details
- `order_items`: id, order_id, menu_item_id, quantity
- `wallets`: id, owner_id, wallet_type, balance, is_frozen
- `wallet_transactions`: id, wallet_id, type, amount, balance_after, reference_id, description, metadata
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

### Règles Wallet
- Retrait Actoos: 0% de frais
- Frais opérateur (Orange Money, Wave): 0.5-1%
- Virement bancaire: 1000 FCFA fixe (24-48h)
- Minimum retrait: 500 FCFA
- Caution livreur minimum: 5000 FCFA

---

## Fonctionnalités Complétées

### Session Actuelle (8 Mai 2026)
- [x] **Service Financier Complet** (`/services/financialService.js`)
  - Settlement automatique au Handshake
  - Calcul des commissions par verticale/mode
  - Gestion des wallets (client, partner_earnings, driver_caution)
  - Flux de retrait avec calcul des frais
- [x] **Calcul Dynamique Frais de Livraison** dans CheckoutScreen
  - Base 700F + 200F/km après 2km
  - Affichage détaillé (Base + Distance)
  - Support Self-Delivery et Pickup
- [x] **Écran Gains Partenaire** (`PartnerEarningsScreen.jsx`)
  - Solde disponible en temps réel
  - Stats jour/mois
  - Historique des transactions
  - Flux de retrait complet (Mobile Money, Banque)
- [x] **Onglet "Gains" dans KDS Partenaire**
- [x] **Settlement Handshake amélioré** dans DriverAppScreen
  - Normalisation des codes (avec/sans #)
  - Répartition automatique des fonds
- [x] **RealWalletContext** - Context wallet connecté à Supabase

### Sessions Précédentes
- [x] Auth Guard checkout (redirige invités vers login)
- [x] Persistance panier via localStorage
- [x] Géolocalisation GPS réelle + Nominatim
- [x] Gestion d'adresses style Uber Eats
- [x] Historique commandes live depuis Supabase
- [x] Fonctions Suivre/Annuler/Recommander commandes
- [x] Swipe-to-delete sur historique commandes
- [x] Tri restaurants par distance
- [x] KDS Partenaire complet
- [x] Driver App avec Wallet
- [x] Admin Dashboard

---

## Backlog Priorisé

### P1 (Important)
- [ ] Push Notifications réelles
- [ ] Page tracking commande temps réel (carte)
- [ ] Intégration API TouchPay/Orange Money/Wave (actuellement simulé)
- [ ] Création tables Supabase: `wallets`, `wallet_transactions`, `withdrawal_requests`, `system_config`

### P2 (Normal)
- [ ] Validation codes promo via Supabase (actuellement mocké)
- [ ] Coordonnées GPS réelles restaurants dans Supabase
- [ ] Calcul distance réel client-restaurant avec PostGIS
- [ ] SMS OTP via Twilio

### P3 (Backlog)
- [ ] Réactiver module Pharmacie
- [ ] Réactiver module Parrainage
- [ ] Surge Pricing dynamique

---

## Architecture Fichiers Clés

### Services
- `/services/financialService.js` - **NOUVEAU** - Opérations financières complètes
- `/services/walletService.js` - Opérations wallet basiques
- `/services/driverService.js` - Gestion livreurs
- `/services/orderService.js` - Gestion commandes
- `/config/businessConfig.js` - Règles métier (commissions, frais livraison)

### Composants
- `/components/CheckoutScreen.jsx` - Checkout avec frais dynamiques
- `/components/PartnerEarningsScreen.jsx` - **NOUVEAU** - Écran gains partenaire
- `/components/PartnerKDSScreen.jsx` - KDS avec onglet Gains
- `/components/DriverAppScreen.jsx` - App livreur avec settlement

### Contexts
- `/context/RealWalletContext.jsx` - **NOUVEAU** - Wallet connecté Supabase
- `/context/WalletContext.jsx` - Ancien wallet mocké (backup)

---

## Notes Importantes
- **LANGUE**: Toujours répondre en français
- **PROACTIVITÉ**: Ne pas mocker si table Supabase existe
- **Modules cachés**: Pharmacie et Parrainage restent désactivés jusqu'à demande explicite
- **Settlement**: S'exécute automatiquement quand le livreur valide le code Handshake
