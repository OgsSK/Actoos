# ACTOOS ONE - Changelog

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
