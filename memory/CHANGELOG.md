# ACTOOS ONE - Changelog

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
