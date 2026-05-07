# ACTOOS ONE - Configuration Supabase pour Production

## Étape 1 : Exécuter le schéma SQL

Allez dans votre **Supabase Dashboard** → **SQL Editor** et exécutez le contenu du fichier :
`/app/supabase/actoos_one/production_schema.sql`

Ce schéma va créer :
- Tables : `users`, `partners`, `menu_items`, `drivers`, `orders`, `order_items`, `wallets`, `wallet_transactions`, `onboarding_requests`
- Triggers automatiques (numéro de commande, wallet utilisateur)
- Politiques RLS pour la sécurité
- Compte Admin (contact@actoos.com)

## Étape 2 : Configurer Supabase Auth

Dans **Supabase Dashboard** → **Authentication** → **Providers** :
1. Activez **Email** provider
2. Désactivez "Confirm email" pour le MVP (optionnel)

## Étape 3 : Ajouter des restaurants

Si vous n'avez pas encore de restaurants dans la table `partners`, exécutez le script de seed :
`/app/supabase/actoos_one/002_seed_data.sql`

## Flux fonctionnels maintenant actifs

### Authentification (100% Supabase)
- Inscription avec Email/Password → Crée un compte dans Supabase Auth + entrée dans `users`
- Connexion → Authentifie via Supabase Auth
- Sessions persistantes

### Onboarding Partenaires/Livreurs (100% Supabase)
- Formulaire partenaire → Insert dans `onboarding_requests` avec type='partner'
- Formulaire livreur → Insert dans `onboarding_requests` avec type='driver'
- Dashboard Admin pour approuver/rejeter

### Commandes (100% Supabase)
- Checkout → Insert dans `orders` et `order_items`
- Numéro de commande auto-généré (ACT-YYMMDD-XXXX)
- Code de livraison 4 chiffres auto-généré

## Variables d'environnement requises

Fichier `/app/actoos-one/.env` :
```
REACT_APP_SUPABASE_URL=https://votre-projet.supabase.co
REACT_APP_SUPABASE_ANON_KEY=votre-anon-key
```

## Test rapide

1. Allez sur l'application
2. Cliquez "Connexion"
3. Créez un compte avec Email/Password
4. Vérifiez dans Supabase → Table Editor → `users` que l'utilisateur apparaît

---
**Note** : Les données de paiement (Orange Money, TouchPay) sont mockées pour le MVP. Intégration réelle à venir.
