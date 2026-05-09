# 📱 Guide de Création Compte Twilio pour ACTOOS ONE

## Étape 1: Créer un Compte Twilio

1. Allez sur **https://www.twilio.com/try-twilio**
2. Cliquez sur **"Sign up"**
3. Remplissez le formulaire:
   - Email
   - Prénom, Nom
   - Mot de passe
   - Pays: Mali (ou votre pays)
4. Vérifiez votre email
5. Vérifiez votre numéro de téléphone

## Étape 2: Obtenir un Numéro Twilio

1. Après connexion, allez dans **Console Dashboard**
2. Cliquez sur **"Get a Trial Number"** ou **"Phone Numbers" > "Buy a Number"**
3. Choisissez un numéro avec capacité **SMS**
   - ⚠️ Note: Les numéros pour l'Afrique peuvent être limités
   - Vous pouvez utiliser un numéro US/UK pour les tests
4. Notez le numéro au format E.164: `+1XXXXXXXXXX`

## Étape 3: Récupérer vos Clés API

1. Dans la Console Twilio, allez dans **Account** > **API keys & tokens**
2. Ou directement sur le Dashboard, vous verrez:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: Cliquez sur "Show" pour révéler

## Étape 4: Configurer pour l'Afrique de l'Ouest

### Option A: Numéro Alphanumérique (Recommandé)
Pour envoyer des SMS depuis "ACTOOS" au lieu d'un numéro:
1. Allez dans **Messaging** > **Services**
2. Créez un nouveau service "ACTOOS"
3. Configurez un Sender ID alphanumérique: `ACTOOS`

### Option B: Numéro Local Mali
Twilio ne supporte pas directement les numéros maliens.
Alternative: Utilisez **Africa's Talking** ou **Orange SMS API** pour le Mali.

## Étape 5: Envoyer vos Clés

Une fois que vous avez:
- ✅ Account SID
- ✅ Auth Token  
- ✅ Numéro Twilio (ou Sender ID)

Envoyez-les moi et je configure l'intégration !

---

## 💰 Tarifs Twilio (Estimation)

| Destination | Prix/SMS |
|-------------|----------|
| Mali (+223) | ~$0.05-0.08 |
| Sénégal (+221) | ~$0.04-0.06 |
| Côte d'Ivoire (+225) | ~$0.05-0.07 |

Le compte d'essai Twilio inclut ~$15 de crédits gratuits.

---

## 🔄 Alternative: Africa's Talking

Si Twilio est trop cher pour l'Afrique, considérez **Africa's Talking**:
- https://africastalking.com
- Meilleure couverture Afrique
- Prix plus bas: ~$0.02-0.03/SMS
- Support numéros locaux Mali

Dites-moi si vous préférez cette option !
