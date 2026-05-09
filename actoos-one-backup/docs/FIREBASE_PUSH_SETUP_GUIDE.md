# 🔔 Guide de Configuration Firebase Push Notifications pour ACTOOS ONE

## Étape 1: Créer un Projet Firebase

1. Allez sur **https://console.firebase.google.com/**
2. Cliquez sur **"Ajouter un projet"** (ou "Create a project")
3. Nom du projet: `actoos-one` (ou autre nom)
4. **Désactivez Google Analytics** pour simplifier (optionnel)
5. Cliquez **"Créer le projet"**

## Étape 2: Ajouter une Application Web

1. Dans le tableau de bord Firebase, cliquez sur l'icône **</> (Web)**
2. Nom de l'application: `ACTOOS ONE PWA`
3. ✅ Cochez **"Also set up Firebase Hosting"** (optionnel)
4. Cliquez **"Register app"**

## Étape 3: Copier les Clés de Configuration

Après l'enregistrement, Firebase affiche votre configuration :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "actoos-one.firebaseapp.com",
  projectId: "actoos-one",
  storageBucket: "actoos-one.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**Copiez ces valeurs !**

## Étape 4: Activer Cloud Messaging (FCM)

1. Dans la sidebar, allez dans **Build > Cloud Messaging**
2. Si demandé, activez l'API Google Cloud Messaging

## Étape 5: Générer la Clé VAPID (Web Push)

1. Dans **Project Settings** (icône engrenage) > **Cloud Messaging**
2. Scrollez jusqu'à **"Web configuration"**
3. Cliquez sur **"Generate key pair"**
4. Copiez la **VAPID Key** (clé publique longue)

## Étape 6: Envoyer vos Clés

Une fois que vous avez toutes les clés, envoyez-les moi :

```
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=actoos-one.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=actoos-one
REACT_APP_FIREBASE_STORAGE_BUCKET=actoos-one.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
REACT_APP_FIREBASE_VAPID_KEY=BLongVAPIDKeyStringXXXXXXXXXX...
```

---

## 🎯 Types de Notifications ACTOOS

Une fois configuré, j'implémenterai ces notifications :

### Pour les Clients
- 🍔 **Commande acceptée** - "Votre commande a été acceptée par [Restaurant] !"
- 👨‍🍳 **Commande en préparation** - "Votre commande est en cours de préparation"
- 🛵 **Livreur en route** - "Votre livreur [Nom] arrive dans ~15 min"
- 📍 **Livreur proche** - "Votre livreur est à 2 min de chez vous !"
- ✅ **Commande livrée** - "Bon appétit ! N'oubliez pas de noter votre expérience"
- 🎉 **Promos** - "Code ACTOOS10 : -10% sur votre prochaine commande !"

### Pour les Partenaires
- 📥 **Nouvelle commande** - "Nouvelle commande #1234 - 3 articles"
- ⏰ **Commande urgente** - "La commande #1234 attend depuis 15 min !"
- 💰 **Paiement reçu** - "Paiement de 5,000 FCFA reçu pour #1234"

### Pour les Livreurs
- 📍 **Nouvelle course** - "Nouvelle livraison disponible : Restaurant Chez Tanti → Badalabougou"
- 🏪 **Arrivée restaurant** - "Vous êtes arrivé ! Récupérez la commande #1234"
- 💰 **Paiement** - "Vous avez reçu 1,500 FCFA pour la course #1234"

---

## 💡 Alternative : OneSignal

Si Firebase est trop complexe, **OneSignal** est une alternative gratuite et plus simple :
- https://onesignal.com
- Intégration plus facile
- Dashboard de notifications inclus
- Gratuit jusqu'à 10K utilisateurs

Dites-moi si vous préférez OneSignal !
