# ACTOOS ONE - Product Requirements Document

## Projet
**ACTOOS ONE** - Super-app logistique et fintech pour l'Afrique de l'Ouest

## Vision Produit
"Tout. Tout de suite. Partout." - Une application mobile-first PWA optimisée pour les appareils Android bas de gamme et les réseaux 3G faibles.

## Localisation
- **Ville par défaut**: Bamako, Mali
- **Préfixe téléphone**: +223
- **Expansion prévue**: Mali → Afrique de l'Ouest → Afrique

## Architecture Technique
- **Frontend**: React PWA (Mobile-First) - `/app/actoos-one/`
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Realtime)
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

### 2025-05-07 - MVP PRODUCTION : Flux Réels Supabase ✅

**Transformation majeure : Toutes les fonctions mockées remplacées par de vrais appels Supabase**

#### Authentification RÉELLE (Email/Password)
- `AuthContext.jsx` refactorisé : `signUp()` et `signIn()` utilisent `supabase.auth`
- Création automatique d'une entrée dans la table `users` après inscription
- Sessions persistantes via Supabase Auth
- Suppression du système OTP mocké (Twilio à intégrer plus tard)

#### Onboarding RÉEL
- `onboardingService.js` : `submitPartnerOnboarding()` et `submitDriverOnboarding()` insèrent dans `onboarding_requests`
- Table `onboarding_requests` ajoutée au schéma avec colonnes type, payload (JSONB), status
- Dashboard Admin peut approuver/rejeter les demandes

#### Commandes RÉELLES
- `orderService.js` : `createOrder()` insère dans `orders` et `order_items`
- Numéro de commande auto-généré via trigger SQL (ACT-YYMMDD-XXXX)
- Code de livraison 4 chiffres auto-généré
- `CheckoutScreen.jsx` simplifié (sans vérification OTP)

#### LoginSheet refait
- Formulaire Email + Password (plus d'OTP)
- Toggle "Connexion" / "Créer un compte"
- Validation côté client

#### Schéma SQL Production
- Fichier `/app/supabase/actoos_one/production_schema.sql` complet
- 9 tables, triggers, RLS policies
- À exécuter dans Supabase Dashboard

#### Tests validés par Testing Agent (85% succès)
- ✅ Restaurants chargés depuis Supabase
- ✅ Onboarding Livreur enregistré (ID: 61ad0c22-ecc3-417d-99c5-e27af612972c)
- ✅ Onboarding Partenaire enregistré (ID: 4824a433-7c11-4987-9bdf-9af62adf3f55)
- ✅ Commande créée (ID: c09a1fc6-bd53-4f22-9d70-0b122c2f0c76)
- ⚠️ Auth Signup : Supabase rejette les emails de test (config Supabase)

---

### 2025-05-07 - Phase Supabase: Architecture Backend ✅

**Infrastructure Supabase installée et configurée:**

#### Client Supabase (`/src/services/supabaseClient.js`):
- Client configuré avec gestion session et realtime
- Support mode mocké (quand variables .env non définies)
- Helpers: `isSupabaseConfigured()`, `getCurrentUser()`, `getCurrentSession()`

#### AuthContext (`/src/context/AuthContext.jsx`):
- Authentification téléphone + OTP
- Support Supabase Auth natif ET mode mocké pour développement
- Gestion états: LOADING, AUTHENTICATED, UNAUTHENTICATED, OTP_SENT
- Rôles: CLIENT, PARTNER, DRIVER, ADMIN
- Actions: sendOTP, verifyOTP, signOut, cancelOTP, updateProfile

#### Services de données:
- **restaurantService.js**: getRestaurants, getRestaurantById, searchRestaurants, getNearbyRestaurants
- **orderService.js**: createOrder, getOrderById, getUserOrders, updateOrderStatus, cancelOrder, subscribeToOrder, calculateOrderTotal
- **walletService.js**: getWallet, getTransactions, creditWallet, debitWallet, transferP2P, getSubWallets, createSubWallet

#### Composant LoginSheet (`/src/components/LoginSheet.jsx`):
- Bottom sheet authentification élégante style Uber
- Entrée numéro téléphone avec préfixe +223
- Input OTP 4 chiffres avec auto-focus et auto-submit
- Indicateur mode démo
- Gestion erreurs et états de chargement

#### Configuration:
- `.env.example` créé avec documentation
- `.env` mis à jour avec variables Supabase (optionnelles)
- Mode mocké automatique si Supabase non configuré

**Schéma DB existant** (`/app/supabase/actoos_one/001_foundation.sql`):
- 14 tables: users, wallets, ledger_transactions, partners, menu_items, orders, order_items, drivers, etc.
- RLS activé sur toutes les tables
- Indexes optimisés pour les requêtes fréquentes

**Status**: Architecture en place, mode mocké fonctionnel. Pour passer en production:
1. Configurer `REACT_APP_SUPABASE_URL` et `REACT_APP_SUPABASE_ANON_KEY` dans `.env`
2. Exécuter `001_foundation.sql` dans Supabase SQL Editor
3. Configurer les SMS OTP dans Supabase Auth (Twilio/etc.)

---

### 2025-05-07 - Phases 3 & 4: Dashboard Partenaire & Wallet Fintech ✅

#### Phase 3: Dashboard Partenaire avancé

**PartnerSettings.jsx - Paramètres Partenaire:**
- Temps de préparation configurable (10-60 min avec slider)
- Présets rapides: 15, 20, 30, 45 min
- Options de livraison:
  - Actoos Delivery (toggle)
  - Self-Delivery avec frais personnalisés et rayon
  - Pickup/Click & Collect (toggle)
- Commandes programmées: toggle + nombre de jours (1-7)
- Commandes même fermé: toggle
- Banner "Modifications non sauvegardées"

**AdminGodMode.jsx - Contrôle Admin Global:**
- Feature toggles: Eats, Health, Wallet, P2P, Parrainage, Scheduled, Pickup, Surge
- Surge Pricing avec slider (x1.0 - x2.0)
- Configuration des commissions (Eats + Health par mode)
- Configuration frais de livraison (base, /km, cap self-delivery, SOS)
- Paramètres parrainage (montant récompense, commande min)
- Tout sauvegardable via bouton central

**Fichiers créés:**
- `/app/actoos-one/src/components/PartnerSettings.jsx`
- `/app/actoos-one/src/components/AdminGodMode.jsx`
- Onglet "Config" ajouté dans PartnerKDSScreen
- Onglet "God Mode" ajouté dans AdminDashboard

#### Phase 4: Wallet Fintech avancé

**WalletQRPayment.jsx - Paiements QR:**
- **PayQRCodeSheet**: Générer QR pour recevoir paiement physique
  - Saisie montant avec présets (500, 1000, 2000, 5000)
  - QR code généré avec référence unique
  - Timer d'expiration 15 min
  - Bouton copier code référence
- **ScanQRCodeSheet**: Scanner QR pour payer
  - Zone caméra simulée
  - Saisie manuelle du code
  - Confirmation avec détails bénéficiaire
- **WalletPINEntry**: Saisie PIN 4 chiffres
  - 3 tentatives max avant blocage
  - Affichage erreur + tentatives restantes
  - Blocage wallet après 3 échecs

**SubAccountManager.jsx - Gestion Sous-comptes:**
- Liste des sous-comptes avec badges (bloqué, limites)
- Création avec contraintes:
  - Solde maximum
  - Limite journalière
  - Restriction horaire (de X à Y)
- Gestion: modifier limites, bloquer/débloquer, supprimer
- Confirmation avant blocage/suppression

**Boutons ajoutés dans WalletScreen:**
- "Payer" (icône QR) → PayQRCodeSheet
- "Encaisser" (icône scanner) → ScanQRCodeSheet

---

### 2025-05-07 - Phase 1 & 2: Modifications finales avant production ✅

#### Phase 1: UI/UX de base
**Splash Screen (simplifié):**
- Animation simple: "ACTOOS ONE" fade in + scale
- Timing optimisé: 1.3 secondes total
- Pas de cercles ni points de chargement

**Header épuré:**
- Suppression logo ACTOOS ONE et slogan
- Conserve sélecteur d'adresse et barre de recherche

**Catégories enrichies:**
- Tout, Africain, Fast Food, Sushi, Café, Sandwich, Dessert, Ice Cream, Smoothie, Bubble Tea, Grillades, Healthy

**Système de filtres:**
- Bouton filtre avec icône slider
- Pickup - Restaurants acceptant le retrait
- Offres - Restaurants avec promotions
- Mieux notés - Rating >= 4.5

**Footer simplifié:**
- "Développez votre activité et touchez plus de clients"
- Cartes propres: juste titre + sous-titre (pas de détails superflus)
- Copyright: "© 2025 ACTOOS ONE • Bamako, Mali"

**Notification rappel:**
- Composant ScheduledOrderReminder
- Affiche 30 min avant livraison programmée
- NotificationToast et NotificationPermissionSheet

#### Phase 2: Fonctionnalités Client

**Système de Favoris:**
- FavoritesContext avec localStorage
- Bouton coeur sur chaque carte restaurant
- "Mes favoris" dans Profil avec compteur
- FavoritesScreen avec liste et option Retirer

**Système de Notation:**
- RatingSheet pour noter restaurant ET livreur
- 5 étoiles avec feedback tags (positif/négatif)
- QuickRatingPrompt post-livraison
- Tags: Qualité, Rapidité, Emballage, Politesse, etc.

**Fichiers créés/modifiés:**
- `/app/actoos-one/src/components/SplashScreen.jsx` - Animation Uber
- `/app/actoos-one/src/components/Header.jsx` - Sans logo/slogan
- `/app/actoos-one/src/components/CategoryFilter.jsx` - Avec filtres
- `/app/actoos-one/src/components/Footer.jsx` - Design pro
- `/app/actoos-one/src/components/NotificationReminder.jsx` - Rappel 30min
- `/app/actoos-one/src/components/FavoritesScreen.jsx` - Liste favoris
- `/app/actoos-one/src/components/RatingSystem.jsx` - Notation complète
- `/app/actoos-one/src/context/FavoritesContext.jsx` - Context favoris
- `/app/actoos-one/src/data/mockData.js` - Catégories + config étendues

**Tests validés:**
- iteration_68.json - Phase 1: 100% pass
- iteration_69.json - Phase 2: 100% pass

---

### 2025-05-07 - Order History & Live Order Tracking ✅
**Implémentation de l'historique des commandes et du suivi en temps réel**

#### Historique des commandes (Order History) :
**Accès:**
- Bouton "Mes commandes" ajouté dans ProfileScreen
- data-testid='order-history-btn'

**Liste des commandes:**
- Affichage chronologique des commandes passées
- Image restaurant, date/heure, articles, total
- Badge statut coloré (Livrée vert, Annulée rouge)
- Bouton "Commander à nouveau" pour commandes livrées

**Détail commande:**
- Image bannière restaurant avec overlay
- Statut et code Handshake (#K42)
- Mode de livraison (Livraison/À emporter)
- Liste articles avec quantités et prix
- Récapitulatif: sous-total, livraison, réduction, total
- Note/avis si déjà noté
- Bouton "Commander à nouveau" (reorder)

**Fonctionnalité Reorder:**
- Vide le panier actuel
- Ajoute tous les articles de la commande
- Navigue vers le restaurant pour commander

#### Suivi de commande en temps réel (Order Tracking) :
**Interface carte mockée:**
- MockMapView avec simulation visuelle
- Marqueur livreur animé (pulse)
- Marqueur destination
- Ligne de trajet simulée

**Badge ETA:**
- Heure d'arrivée estimée en haut à droite

**Timeline de progression:**
- Confirmée → En préparation → Prêt → En route → Arrivée imminente → Livrée
- Horodatage pour chaque étape complétée
- Progression automatique (démo 15s)

**Carte livreur:**
- Photo, nom, véhicule
- Note moyenne
- Boutons Appel et WhatsApp

**Code de remise:**
- Code Handshake affiché en grand
- Bouton copier
- Instructions pour le client

**Fiche aide:**
- Options: Retard, Article manquant, Problème adresse, Annuler
- Lien WhatsApp support

**Notation post-livraison:**
- BottomSheet avec notation 5 étoiles
- S'affiche automatiquement après livraison

#### Fichiers créés/modifiés :
- `/app/actoos-one/src/components/OrderHistoryScreen.jsx` - Écran historique complet
- `/app/actoos-one/src/components/OrderTrackingScreen.jsx` - Écran suivi temps réel
- `/app/actoos-one/src/components/ProfileScreen.jsx` - Bouton "Mes commandes" ajouté
- `/app/actoos-one/src/components/CheckoutScreen.jsx` - Bouton "Suivre ma commande"
- `/app/actoos-one/src/App.js` - Routes ORDER_HISTORY et ORDER_TRACKING

#### Tests validés (100% pass - iteration_67) :
- ✅ ProfileScreen affiche bouton "Mes commandes"
- ✅ OrderHistory affiche liste commandes avec reorder
- ✅ OrderDetail affiche tous les détails
- ✅ OrderTracking composant complet implémenté
- ✅ Design Light Mode avec accent orange

---

### 2025-05-07 - Dashboard Analytics Partner & React Router DOM ✅
**Implémentation du tableau de bord partenaire et migration vers React Router**

#### Dashboard Analytics Partenaire :
**KPIs affichés :**
- Chiffre d'affaires (Aujourd'hui / Semaine / Mois)
- Nombre de commandes
- Panier moyen
- Promos utilisées
- Trend vs période précédente (+X%)

**Visualisations :**
- Graphique barres ventes 7 jours
- Performance des promotions (utilisations, CA généré)
- Top 5 Produits avec barres de progression
- Heures de pointe (12h, 13h, 19h, 20h, 21h)
- Stats clients (nouveaux, fidèles, cmd/client)

**Actions rapides :**
- Créer une promo
- Voir historique

#### React Router DOM v7 :
**Routes configurées :**
```
/             → Client App (Eats, Health, Wallet, Profil)
/partner/*    → Portal Partenaire (KDS, Menu, Promos, Stats)
/driver/*     → Portal Livreur
/admin/*      → Portal Admin (GOD MODE)
```

**Avantages :**
- Navigation sans rechargement de page
- Historique navigateur fonctionnel (bouton retour)
- Deep linking possible (partager URL directe)
- Structure scalable pour futures routes

#### Fichiers créés/modifiés :
- `/app/actoos-one/src/components/PartnerAnalytics.jsx` - Nouveau dashboard complet
- `/app/actoos-one/src/components/PartnerKDSScreen.jsx` - Onglet Stats ajouté
- `/app/actoos-one/src/App.js` - Migration vers BrowserRouter

#### Screenshots validés :
- ✅ Dashboard Stats : KPIs, graphique ventes, performance promos
- ✅ Scroll : Top produits, heures de pointe, stats clients
- ✅ Routes React Router : /, /partner, /admin fonctionnelles

---


### 2025-05-07 - Scheduled Orders & Order When Closed ✅
**Implémentation des commandes programmées et commandes quand fermé style Uber Eats**

#### Scheduled Orders (Commander pour plus tard) :
- Nouvelle étape **SCHEDULE** après DELIVERY_MODE dans le checkout
- **TimeSlotPicker** avec sélection:
  - "Dès que possible" (30-45 min) par défaut
  - "Programmer pour plus tard" avec sélecteur jour/heure
- Créneaux générés automatiquement selon les horaires d'ouverture
- Intervalles de 30 minutes
- Jusqu'à 7 jours à l'avance (configurable par partenaire)
- Créneau affiché dans récapitulatif et écran SUCCESS

#### Order When Closed :
- Banner dans RestaurantScreen quand restaurant fermé
- Si `acceptOrdersWhenClosed: true` → Bouton "Commander" visible
- Affichage du prochain horaire d'ouverture
- L'utilisateur peut ajouter au panier et commander pour plus tard

#### Section Parrainage Client (ReferralSection) :
- Intégrée dans ProfileScreen
- Affiche le code parrainage de l'utilisateur (ACTOOS-XXXX)
- Boutons Copier et Partager
- Explication du fonctionnement en 3 étapes
- Stats : nombre de parrainages et FCFA gagnés

#### Données restaurants enrichies :
```javascript
{
  openingHours: { monday: {...}, tuesday: {...}, ... },
  acceptOrdersWhenClosed: true/false,
  allowScheduledOrders: true/false,
  maxScheduleDays: 7,
  selfDelivery: true/false
}
```

#### Fichiers créés/modifiés :
- `/app/actoos-one/src/components/TimeSlotPicker.jsx` - Nouveau composant
- `/app/actoos-one/src/components/CheckoutScreen.jsx` - Étape SCHEDULE ajoutée
- `/app/actoos-one/src/components/RestaurantScreen.jsx` - Banner "Fermé"
- `/app/actoos-one/src/components/ProfileScreen.jsx` - ReferralSection intégrée
- `/app/actoos-one/src/data/mockData.js` - Horaires d'ouverture ajoutés
- `/app/actoos-one/src/App.js` - Merge des données scheduling

#### Screenshots validés :
- ✅ Étape SCHEDULE avec "Dès que possible" / "Programmer"
- ✅ Sélecteur de créneaux étendu avec jours et heures
- ✅ Profil client avec section Parrainage complète

---

### 2025-05-07 - Système de Promotions Multi-Niveau ✅
**Implémentation complète du système de promotions avec 3 niveaux de contrôle**

#### Architecture des Promotions :
1. **Niveau Platform (Admin GOD MODE)**
   - Promos créées par l'admin, s'appliquent partout
   - Types: %, Montant fixe, Livraison gratuite, Flash Deals, Première commande
   - Codes: BIENVENUE, ACTOOS20, FREEWEEKEND

2. **Niveau Partner (Restaurant/Pharmacie)**
   - Promos créées par les partenaires pour leur établissement
   - **Restrictions par mode de livraison**:
     - Self Delivery → Peut offrir livraison gratuite
     - ACTOOS Delivery → NE peut PAS offrir livraison gratuite
   - **Restrictions Pharmacie**:
     - BOGO interdit sur médicaments (sécurité)
     - Tout autorisé sur parapharmacie

3. **Niveau Referral (Parrainage Utilisateur)**
   - Chaque utilisateur a un code unique (ACTOOS-XX00)
   - Filleul: -1,500 FCFA sur 1ère commande
   - Parrain: +1,000 FCFA en wallet
   - Admin contrôle les montants et peut activer/désactiver

#### Interfaces créées :
- **KDS Partner** → Nouvel onglet "Promos" avec:
  - Liste des promos actives du partenaire
  - Modal de création avec types autorisés selon delivery mode
  - Warning si ACTOOS Delivery (pas de livraison gratuite)
  
- **Admin GOD MODE** → Section Promos améliorée avec:
  - Sous-onglets: Plateforme | Partenaires | Parrainage
  - Contrôle total sur toutes les promos (modifier/désactiver)
  - Config parrainage (bonus, minimum, activation)
  - Top Parrains leaderboard

#### Fichiers créés/modifiés :
- `/app/actoos-one/src/data/promotionsData.js` - Refonte complète avec 3 niveaux
- `/app/actoos-one/src/components/PartnerPromotionsManager.jsx` - Interface partenaire
- `/app/actoos-one/src/components/AdminPromotionsManager.jsx` - Interface admin complète
- `/app/actoos-one/src/components/ReferralSection.jsx` - Section parrainage utilisateur
- `/app/actoos-one/src/components/PartnerKDSScreen.jsx` - Ajout onglet Promos
- `/app/actoos-one/src/components/AdminDashboard.jsx` - Intégration AdminPromotionsManager

#### Screenshots validés :
- ✅ Partner KDS → Onglet Promos avec promo "-15% sur tout le menu"
- ✅ Admin → Plateforme avec 4 promos (BIENVENUE, ACTOOS20, FREEWEEKEND, Flash Deal)
- ✅ Admin → Parrainage avec stats et Top Parrains

---


### 2025-05-07 - Bug Fix: Checkout CONFIRM Step & Promo Code System ✅
**Correction du flux Checkout et du système de codes promo**

#### Bugs corrigés:
1. **Erreur CONFIRM**: `Cannot read properties of undefined (reading 'toLocaleString')` sur l'étape CONFIRM
   - **Cause**: Incohérence de nom dans `orderService.js` (`deliveryFee` vs `delivery`)
   - **Fix**: Renommé `deliveryFee` en `delivery` dans la réponse de `calculateOrderTotal()`

2. **Total payé = 0 sur SUCCESS**: Le total affichait 0 FCFA car `finalTotal` était recalculé après `clearCart()`
   - **Cause**: Cart vidé avant le rendu du SUCCESS, donc `finalTotal` = 0
   - **Fix**: Utilisation de `orderResult?.final_total || finalTotal` dans l'écran SUCCESS

#### Améliorations du système Promo:
- Le `finalTotal` (après promo) est maintenant utilisé pour:
  - Vérification du solde wallet
  - Débit du paiement
  - Affichage du "Total payé" dans la confirmation
- Ajout des champs `promo_code`, `promo_discount`, `final_total` dans les données de commande

#### Fichiers modifiés:
- `/app/actoos-one/src/services/orderService.js` - Fix du nom de propriété + protection null
- `/app/actoos-one/src/components/CheckoutScreen.jsx` - Utilisation de `finalTotal` et `orderResult?.final_total`

#### Tests validés (iteration_66.json - 100% success):
- ✅ Navigation complète du flux Checkout (7 étapes)
- ✅ Application du code promo "BIENVENUE" (-2,000 FCFA)
- ✅ Calcul correct: 5000 (sous-total) + 500 (livraison) - 2000 (promo) = 3,500 FCFA
- ✅ Écran SUCCESS affiche le bon total (3,500 FCFA)
- ✅ Code Handshake format #A42 généré correctement (#B99, #I66)

---


### 2025-01-07 - Correction UX Majeure ✅
**Séparation des portails + UX Adresse pro style Uber Eats**

#### 1. UX Adresse professionnelle (style Uber Eats/Deliveroo):
- **Header dynamique**:
  - Sans adresse: "Ajouter une adresse de livraison" en orange
  - Avec adresse: "Bamako, Hamdallaye" en noir
- **AddressSheet** avec:
  - Barre de recherche avec autocomplete
  - "Utiliser ma position" (GPS)
  - Adresses enregistrées (Maison, Bureau)
  - Adresses récentes (localStorage)
  - Recherche filtrant les quartiers de Bamako
- Plus de longue liste déroulante de quartiers

#### 2. Séparation des portails (comme Uber Eats):
- `/` → App Client (Guest-first)
- `/partner` → Espace Partenaire (login requis)
- `/driver` → Espace Livreur (login requis)
- `/admin` → Admin GOD MODE (login requis)

#### 3. PortalLogin Component:
- Login téléphone + OTP pour chaque portail
- Headers colorés par rôle (violet/bleu/rouge)
- Bouton retour vers app client
- Session persistante (localStorage)

#### 4. Nettoyage ProfileScreen Client:
- Suppression complète du "Magic Switch"
- Section "Rejoignez-nous" pour devenir Partenaire/Livreur
- Section "Demandes en cours" si candidature soumise

---

### 2025-01-07 - Mission 12 Complete ✅
**Phase 4 Polish - Code Handshake, Scanner Pickup, Zero-Loss Caution**

#### LocationData Centralisé (`locationData.js`):
- Quartiers de Bamako groupés par Commune (I à VI)
- Helpers: `getNeighborhoodsByCommune()`, `getFormattedAddresses()`
- Utilisé dans `App.js` (BottomSheet adresse) et `CheckoutScreen.jsx`

#### Code Handshake #A42:
- Format standardisé: lettre + 2 chiffres (ex: #A42, #B17)
- Généré dans `orderService.js` via `generateHandshakeCode()`
- Affiché au client sur l'écran de confirmation de commande
- Visible dans le KDS pour les commandes "À emporter"

#### Scanner Pickup (KDS):
- Bouton "Scanner" orange dans le header KDS
- Modal de saisie du code Handshake client
- Validation du code contre les commandes "ready"
- Feedback visuel (Validé / Code invalide)

#### Driver Wallet Caution Zero-Loss:
- Wallet driver affiché dans le header (12,500 FCFA)
- Section "Paiement en Cash" pour les missions cash:
  - Montant à collecter
  - Commission (15%) en rouge
  - Débit auto wallet en rouge
  - Message explicatif
- Modal de saisie du code Handshake (format #A42)
- Rappel "Collectez X FCFA en cash" dans le modal

#### Magic Switch activé pour démo:
- `role_driver: true` et `role_partner: true` dans ProfileScreen
- Permet de basculer entre Mode Client, Mode Livreur, Mode Restaurant

---

### 2025-01-07 - Mission 11 Complete ✅
**Surge Pricing, ACTOOS BLACK & BNPL**

#### Surge Pricing (`surgeService.js`):
- Multiplicateur x1.2 si `online_drivers < 5`
- Badge "Forte Demande" visible
- Prix de livraison majoré avec explication
- Heures de pointe et weekend pris en compte

#### ACTOOS BLACK (`BlackScreen.jsx`):
- Interface VTC Premium (MODE CLAIR - fond blanc, accents orange #FF5A00)
- Sélection Point A → Point B
- Destinations populaires (Aéroport, Gare, etc.)
- 3 types de véhicules (Standard, Confort, Premium)
- Prix avec surge affiché (original barré + nouveau prix)
- Confirmation et booking avec paiement Wallet

#### BNPL - Buy Now, Pay Later (`bnplService.js`):
- "Mangez maintenant, payez plus tard"
- Éligibilité basée sur score composite (jamais total_spent seul):
  - Ancienneté compte >= 30 jours
  - Commandes complétées >= 5
  - Taux annulation <= 10%
  - Score transactions >= 70
  - Score fraude <= 20
- Limite max: 10,000 FCFA par commande
- Délai: 7 jours pour payer
- Option visible dans PaymentMethodSelector si éligible

#### Checkout amélioré:
- Badge "Forte Demande" si surge actif
- Prix livraison avec surge visible
- Option BNPL si éligible (badge "NOUVEAU")

---

### 2025-01-07 - Mission 10 Complete ✅
**P2P & Corporate Wallet**

#### P2P Transfer (`P2PTransferSheet.jsx`):
- Recherche destinataire par numéro (+223)
- Contacts récents avec avatars
- Montants rapides (500, 1000, 2000, 5000 FCFA)
- Montant personnalisé
- Récapitulatif avec frais (Gratuit entre ACTOOS)
- Transaction type: `transfer_out` / `transfer_in`

#### PIN Validation (`PINValidationModal.jsx`):
- Modal sécurisée 4 chiffres
- Message de sécurité
- Auto-focus et auto-submit
- Mode démo: PIN = 1234

#### Corporate Wallet:
- Types wallet: `personal`, `corporate`, `employee`
- `parent_wallet_id` pour hiérarchie
- `daily_spend_limit` pour employés
- Barre de progression limite journalière
- Blocage checkout si limite atteinte

#### WalletContext amélioré:
- `transfer()` pour P2P avec row-locking simulé
- `checkCorporateLimit()` vérifie limite avant paiement
- `getTodaySpending()` calcule dépenses du jour
- `setWalletType()` pour changer type (démo)
- Mock utilisateurs P2P

#### SQL Schema (`003_p2p_corporate.sql`):
- Table `p2p_contacts` (favoris)
- Fonction `execute_p2p_transfer()` avec `SELECT FOR UPDATE`
- Fonction `check_corporate_limit()`
- Vue `employee_daily_spending`
- RLS policies

---

### 2025-01-07 - Mission 9 Complete ✅
**ACTOOS HEALTH - Pharmacies, Labos & Cliniques**

#### Health Screen (`HealthScreen.jsx`):
- Liste des pharmacies, laboratoires et cliniques mockés
- Filtres par catégorie (Tout, Pharmacies, Laboratoires, Cliniques)
- Barre de recherche
- Cartes avec badges (type, ouvert/fermé, recommandé)
- Indicateurs: rating, distance, temps livraison, "Accepte ordonnances"

#### Pharmacy Screen (`PharmacyScreen.jsx`):
- Détails pharmacie (image, nom, horaires, téléphone)
- Bouton "Envoyer une ordonnance"
- Liste des produits par catégorie
- Badge "Ordonnance" pour médicaments sur prescription
- Ajouter au panier avec quantité (max par commande)
- Warning si produit nécessite ordonnance

#### Ordonnance Upload Sheet (`OrdonnanceUploadSheet.jsx`):
- Zone de drop/sélection de fichier (mock)
- Aperçu de l'image uploadée
- Notes pour le pharmacien
- Explication du processus (4 étapes)
- Simulation d'envoi avec feedback

#### Données mockées (`healthData.js`):
- 5 établissements (3 pharmacies, 1 labo, 1 clinique)
- Produits par pharmacie (médicaments, vitamines, premiers soins)
- Flags: requires_prescription, max_per_order, is_available

#### Checkout:
- Réutilise CheckoutScreen.jsx existant (Adresse → OTP → Wallet/Cash)
- Compatible pharmacie et restaurant

---

### 2025-01-07 - Mission 8 Complete ✅
**Wallet & TouchPay Integration**

#### Wallet Context (`WalletContext.jsx`):
- État global du wallet (solde, transactions)
- Méthodes: `topUp()`, `pay()`, `refund()`, `hasEnoughBalance()`
- Types de transactions: TOPUP, PAYMENT, REFUND, EARNING
- Transactions loggées dans ledger (format mock)

#### Wallet Screen (`WalletScreen.jsx`):
- Header orange avec solde en grand
- Bouton "Recharger" → ouvre TouchPay
- Historique des transactions avec icônes colorées
- Statut et date pour chaque transaction

#### TouchPay Sheet (`TouchPaySheet.jsx`):
- Simulation de paiement TouchPay Mali
- Montants prédéfinis (1000, 2000, 5000, 10000 FCFA)
- Montant personnalisé
- Champ téléphone +223
- Animation de traitement et confirmation

#### Checkout avec Wallet:
- Option "ACTOOS Wallet" par défaut
- Affichage du solde dans l'étape paiement
- Alerte si solde insuffisant avec montant manquant
- Boutons "Recharger maintenant" ou "Payer en Cash"
- Jamais de commande impayée (blocage si wallet insuffisant)
- Transaction PAYMENT loggée après paiement réussi

#### Navigation:
- Onglet Wallet activé dans BottomNav (`feature_wallet=true`)
- Navigation vers WalletScreen depuis la navbar

---

### 2025-01-07 - Mission 7 Complete ✅
**Driver App & Admin Dashboard (GOD MODE)**

#### Driver App (`DriverAppScreen.jsx`):
- Toggle Online/Offline (vert/gris)
- Mission Point A → Point B avec navigation
- Blocage nouvelle mission si current_order_id existe
- Bouton orange géant "CONFIRMER LIVRAISON"
- Modal clavier numérique OTP (4 chiffres)
- Confirmation de livraison avec feedback visuel
- Appels téléphoniques restaurant/client

#### Admin Dashboard (`AdminDashboard.jsx`):
- Header noir "GOD MODE"
- 3 onglets : Commandes bloquées, Livreurs, Onboarding
- Bannière rouge "URGENT" pour commandes > 20 min
- Bouton rouge "FORCE ASSIGN" pour assigner un livreur
- Liste livreurs avec statut (en ligne/hors ligne/en mission)
- Boutons "APPROUVER" / "REJETER" pour l'onboarding

#### Données mockées:
- `driverData.js` - 4 livreurs, 3 commandes bloquées, 4 demandes onboarding

---

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
- [x] Mission 7: Driver App & Admin Dashboard (GOD MODE)
- [x] Mission 8: Wallet & TouchPay Integration
- [x] Mission 9: ACTOOS HEALTH (Pharmacies, Ordonnances)
- [x] Mission 10: P2P & Corporate Wallet
- [x] Mission 11: Surge Pricing, ACTOOS BLACK & BNPL
- [x] Mission 12: Phase 4 Polish - Code Handshake, Scanner Pickup, Zero-Loss Caution

### P1 - Prochaines étapes
- [ ] Mission 13: Connecter Supabase JS Client au frontend
- [ ] OTP réel côté serveur (Supabase Edge Functions)
- [ ] TouchPay API réelle (sandbox)

### P2 - À venir
- [ ] Module Profil utilisateur
- [ ] Push Notifications
- [ ] Row-locking réel avec Supabase
- [ ] Intégration paiement réel

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
│   │   ├── DriverAppScreen.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── WalletScreen.jsx
│   │   ├── TouchPaySheet.jsx
│   │   ├── HealthScreen.jsx
│   │   ├── PharmacyScreen.jsx
│   │   ├── OrdonnanceUploadSheet.jsx
│   │   ├── P2PTransferSheet.jsx
│   │   ├── PINValidationModal.jsx
│   │   ├── BlackScreen.jsx
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
│   │   ├── CartContext.jsx
│   │   └── WalletContext.jsx
│   ├── data/
│   │   ├── mockData.js
│   │   ├── menuData.js
│   │   ├── kdsData.js
│   │   ├── driverData.js
│   │   └── healthData.js
│   ├── hooks/
│   │   ├── useOnlineStatus.js
│   │   └── useLazyImage.js
│   ├── services/
│   │   ├── otpService.js
│   │   ├── orderService.js
│   │   ├── surgeService.js
│   │   └── bnplService.js
│   ├── config/
│   │   └── businessConfig.js    # Règles tarifaires et commissions
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

## LOGIQUE MÉTIER FINANCIÈRE

### 1. Frais de Livraison (Delivery Fees)

**ACTOOS DELIVERY (On fournit la moto):**
- **Base**: 700 FCFA (couvre 0-2 km)
- **Supplément**: +200 FCFA par km au-delà de 2 km
- Exemples:
  - 1.5 km = 700 FCFA
  - 3 km = 700 + (1×200) = 900 FCFA
  - 5.5 km = 700 + (3.5×200) = 1,400 FCFA

**SELF-DELIVERY (Partenaire livre):**
- Le partenaire fixe le prix MAIS plafond de **250 FCFA/km** maximum
- Empêche les abus tarifaires

**PICKUP (Click & Collect):**
- 0 FCFA

**MODIFICATEURS:**
- **SOS/Urgence (Health)**: +500 FCFA (100% au livreur)
- **Surge Pricing**: Multiplicateur (x1.2, x1.5, x2.0)

### 2. Surge Pricing (Tarification Dynamique)

| Condition | Multiplicateur |
|-----------|---------------|
| Normal | x1.0 |
| Pluie | x1.3 |
| Heure de pointe | x1.2 |
| Événement spécial (match) | x1.5 |
| Demande extrême | x2.0 (max) |

Exemple sous la pluie pour 5.5 km (1,400F): 1,400 × 1.5 = **2,100 FCFA**

### 3. Matrice des Commissions

**RÈGLE D'OR**: Actoos prélève sa commission UNIQUEMENT sur le prix des articles.
Actoos ne prend JAMAIS de commission sur les frais de livraison (100% au livreur/partenaire).

**EATS (Restaurants):**
| Mode | Commission | Partenaire reçoit |
|------|-----------|------------------|
| Actoos Delivery | 15% | 85% du plat |
| Self-Delivery | 10% | 90% du plat + 100% livraison |
| Pickup | 10% | 90% du plat |

**HEALTH (Pharmacies):**
| Mode | Commission | Pharmacie reçoit |
|------|-----------|------------------|
| Actoos Delivery | 5% | 95% du médicament |
| Self-Delivery | 2% | 98% du médicament + 100% livraison |
| Pickup | 2% | 98% du médicament |

### 4. Exemple de Transaction Complète

**Scénario**: Dibi Mouton 10,000F, Actoos Delivery, 4 km

- Client paie: 10,000F + 1,100F = **11,100 FCFA**
- Livreur reçoit: **1,100 FCFA** (100% livraison)
- Restaurant reçoit: 10,000 - 15% = **8,500 FCFA**
- Actoos gagne: 10,000 × 15% = **1,500 FCFA**

### 5. Wallet & Retraits

**Règlement Instantané:**
- Dès que le code Handshake #A42 est tapé, les fonds sont crédités immédiatement
- Pas de "clôture comptable hebdomadaire"

**Frais de retrait:**
- Actoos: **0%** (aucun frais)
- Frais télécom à la charge de l'utilisateur:
  - Orange Money: ~1%
  - Wave: ~0.5%
  - Virement bancaire: 1,000 FCFA fixe (24-48h)

**Flux Livreur (Cash vs Virtuel):**
- Trop de cash physique → "Recharger Caution" via Mobile Money
- Trop de virtuel → "Retirer" vers Mobile Money
- Caution minimum: 5,000 FCFA pour recevoir des courses

---

## Credentials & Config (MOCK)
- **Mock OTP pour tests**: Code affiché en mode dev (ex: 3888, 7101...)
- **Ville par défaut**: Bamako, Mali
- **Préfixe téléphone**: +223

---

## RÈGLES CRITIQUES
1. **MODE CLAIR OBLIGATOIRE** - Fond blanc + Orange #FF5A00
2. **1 PWA, 4 Modules** - Ne PAS créer 4 apps séparées
3. **Localisation Bamako** - Pas Abidjan
4. **Guest-First** - Navigation sans login
5. **Commissions sur articles UNIQUEMENT** - Jamais sur les frais de livraison
