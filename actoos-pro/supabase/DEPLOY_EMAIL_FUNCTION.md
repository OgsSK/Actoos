# Déploiement de la fonction d'envoi d'emails

## Prérequis

1. **Compte Resend** : Créez un compte sur https://resend.com
2. **Clé API Resend** : Dashboard → API Keys → Create API Key (commence par `re_...`)
3. **CLI Supabase** installé : `npm install -g supabase`

## Configuration

### Option 1 : Via Secrets Supabase (recommandé)

```bash
# Connectez-vous à Supabase
supabase login

# Définir la clé API Resend comme secret
supabase secrets set RESEND_API_KEY=re_votre_cle_api --project-ref zmngftlkdimwvkxmduvr
```

### Option 2 : Via le Dashboard Supabase

1. Allez dans votre projet Supabase
2. Settings → Edge Functions → Secrets
3. Ajoutez `RESEND_API_KEY` avec votre clé Resend

## Déploiement de la fonction

```bash
cd /app/actoos-pro/supabase

# Déployer la fonction send-email
supabase functions deploy send-email --project-ref zmngftlkdimwvkxmduvr
```

## Vérification

```bash
# Tester la fonction
curl -X POST https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test ACTOOS PRO",
    "html": "<p>Test email</p>"
  }'
```

## Templates disponibles

La fonction supporte les templates suivants :

- `devis_sent` - Envoi de devis
- `facture_sent` - Envoi de facture
- `facture_relance` - Relance de paiement
- `invitation` - Invitation utilisateur
- `password_reset` - Réinitialisation mot de passe
- `releve_mensuel` - **Relevé mensuel (nouveau)**

## Envoi de relevé avec pièce jointe

```javascript
// Exemple d'appel depuis le frontend
await sendEmail({
  to: "client@example.com",
  template: "releve_mensuel",
  templateData: {
    client_nom: "Jean Dupont",
    periode: "Mai 2026",
    nb_interventions: 5,
    nb_devis: 2,
    nb_factures: 3,
    total_ttc: "1 250,00",
    entreprise_nom: "Ma Société"
  },
  attachments: [{
    filename: "releve_mai_2026.pdf",
    content: "base64_encoded_pdf_content",
    type: "application/pdf"
  }]
});
```

## Dépannage

### L'email n'est pas envoyé

1. Vérifiez que `RESEND_API_KEY` est bien configuré
2. En mode test Resend, seules les adresses vérifiées reçoivent les emails
3. Consultez les logs : Dashboard Supabase → Edge Functions → Logs

### Erreur CORS

Les headers CORS sont déjà configurés dans la fonction. Si problème persistant, vérifiez l'origine de la requête.

---

**Dernière mise à jour**: 17 Mai 2026
