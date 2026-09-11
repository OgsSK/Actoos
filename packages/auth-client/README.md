# @actoos/auth-client

Package partagé d'authentification pour toutes les apps Actoos.

## Installation

Depuis la racine du monorepo :

    npm install

## Utilisation

### 1. Créer le client

    import { createAuthClient, createAuthCore, createApiAuth } from '@actoos/auth-client';

    const client = createAuthClient({
      supabaseUrl: '...',
      supabaseAnonKey: '...',
      appName: 'jobs',
      apiUrl: 'https://actoos-jobs-api.onrender.com',
    });

    const auth = createAuthCore(client);
    const apiAuth = createApiAuth(client, client.config.apiUrl!);

### 2. Utiliser

    await auth.signIn({ email, password });
    await auth.signUp({ email, password, firstName, lastName, role });
    await auth.signOut();
    await apiAuth.apiFetchAuth('/api/user/language');

## Apps consommatrices

- actoos-jobs (React SPA + CRA) — consomme dist/
- vitrine (Next.js) — consomme dist/ ou src/
- id.actoos.com — à venir
- actoos-pro — à venir

## Build

    npm run build --workspace=@actoos/auth-client

Ou en dev (watch) :

    npm run dev --workspace=@actoos/auth-client