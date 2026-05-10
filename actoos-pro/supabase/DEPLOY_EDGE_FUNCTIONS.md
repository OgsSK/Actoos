# Déploiement des Edge Functions Supabase - ACTOOS PRO

## Changements importants

### Token JWT - Durée étendue à 30 jours
Les tokens JWT expiraient après 24h, ce qui forçait les utilisateurs (techniciens terrain) à se reconnecter quotidiennement. 

**Modification :** Durée du token passée de **24 heures** à **30 jours**.

Fichiers modifiés :
- `/app/supabase/functions/login/index.ts`
- `/app/supabase/functions/refresh-token/index.ts`

## Commandes de déploiement

### 1. Installation de Supabase CLI (si pas déjà fait)
```bash
npm install -g supabase
```

### 2. Connexion à Supabase
```bash
supabase login
```

### 3. Lier le projet
```bash
cd /app/supabase
supabase link --project-ref zmngftlkdimwvkxmduvr
```

### 4. Déployer les fonctions
```bash
# Déployer la fonction login (token 30 jours)
supabase functions deploy login

# Déployer la fonction refresh-token
supabase functions deploy refresh-token
```

### 5. Vérifier le déploiement
```bash
supabase functions list
```

## Résultat attendu

Après déploiement :
- Les nouveaux tokens auront une durée de **30 jours**
- Les utilisateurs (techniciens) n'auront plus à se reconnecter quotidiennement
- Le refresh automatique se déclenchera **7 jours** avant l'expiration

## Note pour les tokens existants

Les utilisateurs avec des tokens de 24h devront se reconnecter une dernière fois pour obtenir un nouveau token de 30 jours.
