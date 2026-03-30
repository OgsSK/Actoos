# Guide d'intégration Google Calendar - Actoos

## Vue d'ensemble

Cette intégration permet de synchroniser les interventions Actoos avec Google Calendar. Chaque technicien peut connecter son propre compte Google pour voir ses interventions dans son calendrier.

## Configuration (Administrateur)

### Étape 1 : Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Cliquez sur **Sélectionner un projet** → **Nouveau projet**
3. Nom du projet : `actoos-calendar`
4. Cliquez sur **Créer**

### Étape 2 : Activer l'API Google Calendar

1. Dans le menu latéral, allez dans **APIs & Services** → **Bibliothèque**
2. Recherchez "Google Calendar API"
3. Cliquez sur **Activer**

### Étape 3 : Configurer l'écran de consentement OAuth

1. Allez dans **APIs & Services** → **Écran de consentement OAuth**
2. Choisissez **Externe** → **Créer**
3. Remplissez les informations :
   - **Nom de l'application** : Actoos
   - **Email d'assistance utilisateur** : votre email
   - **Email du développeur** : votre email
4. Cliquez sur **Enregistrer et continuer**
5. Dans **Champs d'application**, ajoutez :
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Cliquez sur **Enregistrer et continuer**
7. Dans **Utilisateurs tests**, ajoutez les emails des testeurs
8. Cliquez sur **Enregistrer et continuer**

### Étape 4 : Créer les identifiants OAuth

1. Allez dans **APIs & Services** → **Identifiants**
2. Cliquez sur **Créer des identifiants** → **ID client OAuth**
3. Type d'application : **Application Web**
4. Nom : `Actoos Web Client`
5. **Origines JavaScript autorisées** :
   - `https://votre-domaine.com` (URL de votre app)
6. **URI de redirection autorisés** :
   - `https://votre-domaine.com/api/calendar/callback`
7. Cliquez sur **Créer**
8. **Copiez** le **Client ID** et le **Client Secret**

### Étape 5 : Configurer les variables d'environnement

Ajoutez ces variables dans `/app/backend/.env` :

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=https://votre-domaine.com/api/calendar/callback
```

Redémarrez le backend après modification :
```bash
sudo supervisorctl restart backend
```

## Utilisation (Techniciens)

### Connecter Google Calendar

1. Allez dans **Paramètres** → **Intégrations**
2. Cliquez sur **Connecter Google Calendar**
3. Connectez-vous avec votre compte Google
4. Autorisez l'accès au calendrier
5. Vous serez redirigé vers Actoos avec la confirmation

### Synchroniser les interventions

- **Automatique** : Les interventions sont synchronisées quand vous cliquez sur "Synchroniser toutes les interventions"
- **Manuelle** : Chaque intervention peut être synchronisée individuellement via l'API

### Ce qui est synchronisé

Chaque intervention crée un événement Google Calendar avec :
- **Titre** : `[Actoos] Titre de l'intervention`
- **Description** : Nom du client + description + adresse
- **Heure** : Date et durée prévues
- **Lieu** : Adresse complète
- **Rappel** : 30 minutes avant

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/calendar/status` | Vérifier le statut de connexion |
| GET | `/api/calendar/connect` | Démarrer le flux OAuth |
| GET | `/api/calendar/callback` | Callback OAuth (interne) |
| POST | `/api/calendar/disconnect` | Déconnecter le compte |
| GET | `/api/calendar/events` | Lister les événements du calendrier |
| POST | `/api/calendar/sync-intervention/{id}` | Synchroniser une intervention |
| DELETE | `/api/calendar/sync-intervention/{id}` | Supprimer du calendrier |
| POST | `/api/calendar/sync-all` | Synchroniser toutes les interventions |

## Dépannage

### "Configuration requise"
→ Les variables GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET ne sont pas définies

### "Session expirée"  
→ Le token d'accès a expiré et le refresh a échoué. Reconnectez votre compte.

### "API not enabled"
→ L'API Google Calendar n'est pas activée dans le projet Google Cloud

### Erreurs de redirection
→ Vérifiez que l'URI de redirection dans Google Cloud Console correspond exactement à votre URL

## Notes de sécurité

- Les tokens sont stockés de manière sécurisée dans la base de données
- Les refresh tokens permettent un accès prolongé sans reconnexion
- Chaque utilisateur ne peut accéder qu'à son propre calendrier
- La déconnexion supprime tous les tokens stockés
