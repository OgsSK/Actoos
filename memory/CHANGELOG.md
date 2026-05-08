# ACTOOS ONE - Changelog

## [2026-05-08] - Firebase Push + Twilio SMS Configuration

### Firebase Cloud Messaging ✅ CONFIGURÉ
- `firebaseConfig.js` - Configuration Firebase avec vos clés
- `firebase-messaging-sw.js` - Service Worker pour notifications arrière-plan
- `pushNotificationService.js` - Service de gestion des notifications
- Variables d'environnement ajoutées dans `.env`

### Twilio SMS OTP ⏳ PRÉPARÉ (Mode Mock)
- `twilioOTPService.js` - Service OTP complet avec mock
- Table `otp_codes` créée en base
- En attente des clés Twilio pour activer les vrais SMS

### Tables créées
- `otp_codes` - Stockage des codes OTP
- `user_push_tokens` - Tokens FCM des utilisateurs

---

## [2026-05-08] - Migration Système Financier EXÉCUTÉE

### Tables créées/mises à jour
- ✅ `system_config` - 8 paramètres de configuration (commissions, frais, limites)
- ✅ `wallets` - Colonnes ajoutées: `wallet_type`, `is_frozen`, `frozen_reason`
- ✅ `wallet_transactions` - Historique des mouvements wallet
- ✅ `withdrawal_requests` - Demandes de retrait
- ✅ `orders` - Colonnes ajoutées: `is_settled`, `settlement_details`, `distance_km`

### Configuration système
| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| commission_base_eats | 15% | Commission livraison |
| commission_self_eats | 10% | Commission self-delivery |
| delivery_base_fee | 700 FCFA | Frais base (0-2km) |
| delivery_per_km | 200 FCFA | Frais par km |
| min_withdrawal | 500 FCFA | Retrait minimum |
| min_driver_caution | 5000 FCFA | Caution livreur |
| fee_orange_money | 1% | Frais Orange Money |
| fee_wave | 0.5% | Frais Wave |

### Fonctions PostgreSQL
- `get_or_create_wallet(owner_id, wallet_type)` - Créer ou récupérer un wallet
- `update_wallet_balance(wallet_id, amount, type)` - Mettre à jour solde avec transaction

---

## [2026-05-08] - Flux Multi-Pays COMPLET

### Améliorations
- ✅ Filtrage restaurants par `country_code` ET `city` dans `App.js`
- ✅ Recherche restaurants filtrée par pays dans `restaurantService.js`
- ✅ Recharge automatique quand le pays OU la ville change

### Résultat du flux
1. Utilisateur sélectionne un pays (Mali/Sénégal)
2. App charge uniquement les restaurants de ce pays
3. Menus et commandes fonctionnent par pays

### Tests validés
- 🇲🇱 Mali → 16 restaurants Bamako
- 🇸🇳 Sénégal → 4 restaurants Dakar (avec menus complets)
- Changement de pays via AddressSheet → rechargement immédiat

---

## [2026-05-08] - Migration Multi-Pays EXÉCUTÉE

### Base de données
- ✅ Colonne `country_code` ajoutée à `users`, `partners`, `orders`, `drivers`
- ✅ Table `countries` créée (10 pays d'Afrique de l'Ouest)
- ✅ Index créés pour performance des requêtes par pays
- ✅ Partenaires Bamako → `country_code = 'ML'`
- ✅ Partenaires Dakar → `country_code = 'SN'`

### Résultat
- 🇲🇱 Mali: 16 restaurants actifs
- 🇸🇳 Sénégal: 4 restaurants actifs (24 menu items)

---

## [2026-05-08] - Lancement Sénégal (Dakar)

### Ajouté
- **4 restaurants à Dakar, Sénégal**:
  - Pizza Teranga (6 items: pizzas classiques, spéciales, desserts, boissons)
  - Dakar Burger House (6 items: burgers, accompagnements, boissons)
  - Chez Fatou - Thieboudienne (6 items: plats nationaux sénégalais, boissons)
  - Dibiterie Ndoye (6 items: grillades, accompagnements, boissons)
- **24 menu_items** au total pour Dakar

### Corrigé
- Problème RLS Supabase résolu en assignant `owner_id` aux restaurants Dakar
- Admin (`contact@actoos.com`) peut maintenant gérer les restaurants Dakar

### Notes SQL Exécutées
```sql
-- Dans Supabase SQL Editor:
UPDATE partners SET owner_id = 'a8ddc45e-c767-4740-b4eb-ca279502211a' WHERE city = 'Dakar';
-- + INSERT menu_items pour les 4 restaurants
```

---

## [2026-05-08] - Architecture Multi-Pays

### Ajouté
- `CountrySelector.jsx` - Sélecteur de pays avec drapeaux
- `LoginSheet.jsx` - Onglets Téléphone/Email pour connexion
- `LocationContext.jsx` - Gestion localisation multi-pays
- `ComingSoonScreen.jsx` - Écran "ACTOOS arrive bientôt"
- `CitySelector.jsx` dans `AddressSheet` pour changer de ville
- `AdminCountryStats.jsx` - Statistiques par pays dans l'Admin Dashboard
- Configuration 10 pays d'Afrique de l'Ouest

### En attente
- Twilio SMS OTP (guide créé: `/docs/TWILIO_SETUP_GUIDE.md`)
- Firebase Push Notifications (guide créé: `/docs/FIREBASE_PUSH_SETUP_GUIDE.md`)
- TouchPay/Orange Money API keys
- Migrations SQL non exécutées (country_code columns)
