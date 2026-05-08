# ACTOOS ONE - Product Requirements Document

## Aperçu
ACTOOS ONE est une super-app PWA monolithique de logistique et fintech pour l'Afrique de l'Ouest. L'objectif est de remplacer toutes les données/UI mockées par un backend Supabase live et d'implémenter une UX proactive de livraison alimentaire aux standards de l'industrie (Uber Eats, Glovo).

## Stack Technique
- **Frontend**: React PWA, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **APIs**: Nominatim OpenStreetMap (Géocodage inverse), localStorage (persistance panier)

## Schéma Base de Données
- `users`: id, role, phone, name
- `orders`: id, client_id, status, total, delivering_at
- `order_items`: id, order_id, menu_item_id, quantity

## Comptes de Test
- **Admin**: contact@actoos.com / Salifkane&&7
- **Client Test**: testclient@actoos.com / TestClient123!

---

## Fonctionnalités Complétées

### Session Actuelle (Mai 2026)
- [x] Auth Guard checkout (redirige invités vers login)
- [x] Persistance panier via localStorage
- [x] Géolocalisation GPS réelle + Nominatim (remplace "Bamako" hardcodé)
- [x] Gestion d'adresses style Uber Eats (Maison, Travail, Autre)
- [x] Historique commandes live depuis Supabase
- [x] Fonctions Suivre/Annuler/Recommander commandes
- [x] Swipe-to-delete sur historique commandes
- [x] Tri restaurants par distance
- [x] Suppression items pharmacie des tendances recherche
- [x] Fix double boutons X sur BottomSheets
- [x] Fix flux déconnexion avec signOut()
- [x] **Fix bug texte "Glissez vers la gauche" sur WalletScreen**

### Apps Complètes
- [x] KDS (Kitchen Display System) pour partenaires
- [x] Driver App avec intégration Wallet
- [x] Admin Dashboard

---

## Backlog Priorisé

### P0 (Critique)
- Tous les bugs P0 résolus ✓

### P1 (Important)
- [ ] Push Notifications réelles
- [ ] Page tracking commande temps réel (carte)

### P2 (Normal)
- [ ] Validation codes promo via Supabase (actuellement mocké)
- [ ] Coordonnées GPS réelles restaurants dans Supabase
- [ ] Intégration paiement externe (TouchPay / Orange Money)
- [ ] SMS OTP via Twilio

### P3 (Backlog)
- [ ] Réactiver module Pharmacie (quand demandé)
- [ ] Réactiver module Parrainage (quand demandé)

---

## Refactoring Requis
- `App.js` dépasse 1200 lignes - nécessite découpage en composants/routes séparés

## Fichiers Clés
- `/app/actoos-one/src/App.js` - Routage et logique géolocalisation globale
- `/app/actoos-one/src/components/WalletScreen.jsx` - Écran portefeuille
- `/app/actoos-one/src/components/OrderHistorySection.jsx` - Section historique profil
- `/app/actoos-one/src/components/OrderHistoryScreen.jsx` - Page historique complète
- `/app/actoos-one/src/components/AddressSheet.jsx` - Gestion adresses
- `/app/actoos-one/src/components/ProfileScreen.jsx` - Profil utilisateur

## Notes Importantes
- **LANGUE**: Toujours répondre en français
- **PROACTIVITÉ**: Ne pas mocker si table Supabase existe
- **Modules cachés**: Pharmacie et Parrainage restent désactivés jusqu'à demande explicite
