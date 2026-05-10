# Guide de déploiement : Edge Function `refresh-token`

## Prérequis
- Supabase CLI installé (`npm install -g supabase`)
- Accès au projet Supabase ACTOOS PRO

## Étapes de déploiement

### 1. Connexion à Supabase
```bash
supabase login
```

### 2. Lier le projet
```bash
cd /app/supabase
supabase link --project-ref zmngftlkdimwvkxmduvr
```

### 3. Déployer la fonction
```bash
supabase functions deploy refresh-token
```

### 4. Vérifier le déploiement
```bash
supabase functions list
```

## Test de la fonction

### Via cURL
```bash
curl -X POST "https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/refresh-token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -d '{
    "current_token": "eyJ...",
    "user_id": "7f178571-918f-4927-8210-a1384a0214bc"
  }'
```

### Réponse attendue (succès)
```json
{
  "status": "success",
  "token": "eyJ...(nouveau token)...",
  "expires_in": 86400,
  "user_id": "7f178571-918f-4927-8210-a1384a0214bc",
  "refreshed_at": "2026-05-08T20:00:00.000Z"
}
```

### Réponse en cas d'erreur
```json
{
  "error": "Token expiré depuis trop longtemps",
  "expired_at": "2026-05-07T10:00:00.000Z",
  "must_relogin": true
}
```

## Comportement

| Situation | Résultat |
|-----------|----------|
| Token valide, proche expiration | Nouveau token généré |
| Token expiré < 1 heure | Nouveau token généré (grace period) |
| Token expiré > 1 heure | Erreur, re-login requis |
| Utilisateur désactivé | Erreur, re-login requis |
| Signature invalide | Erreur 401 |

## Variables d'environnement requises
Ces variables sont déjà configurées dans votre projet Supabase :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (doit correspondre à celui utilisé dans `login`)

## Intégration Frontend
Le frontend (`AuthContext.jsx`) appelle automatiquement cette fonction 5 minutes avant l'expiration du token.
