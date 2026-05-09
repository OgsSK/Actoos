# 🔧 Guide de Déploiement - Edge Function Login

## Étape 1: Vérifier les Secrets (Variables d'environnement)

### Dans Supabase Dashboard:
1. Allez sur **https://supabase.com/dashboard**
2. Sélectionnez votre projet **ACTOOS**
3. Dans le menu gauche: **Project Settings** (⚙️ icône engrenage en bas)
4. Cliquez sur **Edge Functions**
5. Cliquez sur **Manage Secrets**

### Secrets REQUIS:
Les secrets suivants doivent être définis :

| Nom du Secret | Description | Où le trouver |
|---------------|-------------|---------------|
| `SUPABASE_URL` | URL de votre projet | **Project Settings → API → Project URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (bypass RLS) | **Project Settings → API → service_role key** (⚠️ secret!) |
| `JWT_SECRET` | Clé pour signer les JWT | Choisissez une chaîne aléatoire longue (32+ caractères) |

### ⚠️ IMPORTANT:
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont normalement **auto-configurés** par Supabase
- Si ils ne sont pas définis, ajoutez-les manuellement

---

## Étape 2: Déployer la nouvelle version

### Option A: Via Supabase CLI (recommandé)
```bash
# Installer Supabase CLI si pas encore fait
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref zmngftlkdimwvkxmduvr

# Déployer la fonction login
supabase functions deploy login
```

### Option B: Via le Dashboard (si CLI ne marche pas)
1. Allez dans **Edge Functions** dans votre Dashboard
2. Cliquez sur la fonction **login**
3. Cliquez sur **Edit** ou **Update**
4. Copiez-collez le code ci-dessous
5. Cliquez sur **Deploy**

---

## Code à déployer (Version 2.1)

```typescript
// Supabase Edge Function: Login avec DEBUG COMPLET
// Version 2.1 - Fix bcryptjs import + better logging
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "actoos-pro-secret-key-2024-super-secure";

// Create JWT with 30-day expiry for professional apps
async function createJWT(payload: Record<string, unknown>, expiresInDays = 30): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInDays * 24 * 60 * 60);
  const fullPayload = { ...payload, iat: now, exp };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const key = encoder.encode(JWT_SECRET);
  
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const debugInfo: Record<string, unknown> = { 
    steps: [],
    timestamp: new Date().toISOString(),
    version: "2.1"
  };

  try {
    // Step 1: Parse request
    let email: string, password: string;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
      debugInfo.steps.push("1. Request parsed OK");
      debugInfo.emailReceived = email;
    } catch (parseError) {
      debugInfo.steps.push("1. FAILED: Request parse error");
      debugInfo.parseError = String(parseError);
      return new Response(
        JSON.stringify({ error: "Format de requête invalide", debug: debugInfo }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Validate inputs
    if (!email || !password) {
      debugInfo.steps.push("2. FAILED: Missing email or password");
      return new Response(
        JSON.stringify({ error: "Email et mot de passe requis", debug: debugInfo }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    debugInfo.steps.push("2. Input validation OK");

    // Step 3: Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    debugInfo.hasSupabaseUrl = !!supabaseUrl;
    debugInfo.hasServiceKey = !!supabaseServiceKey;
    debugInfo.supabaseUrlPrefix = supabaseUrl?.substring(0, 30) + "...";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      debugInfo.steps.push("3. FAILED: Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante", debug: debugInfo }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    debugInfo.steps.push("3. Supabase credentials OK");

    // Step 4: Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    debugInfo.steps.push("4. Supabase client created");

    // Step 5: Query user
    const normalizedEmail = email.toLowerCase().trim();
    debugInfo.normalizedEmail = normalizedEmail;
    
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        id, email, password_hash, nom, prenom, role, statut,
        entreprise_id, telephone, two_factor_enabled,
        entreprise:entreprises(id, nom, plan, subscription_status, email)
      `)
      .eq("email", normalizedEmail)
      .single();

    if (userError) {
      debugInfo.steps.push("5. FAILED: User query error");
      debugInfo.userError = userError.message;
      debugInfo.userErrorCode = userError.code;
      debugInfo.userErrorDetails = userError.details;
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user) {
      debugInfo.steps.push("5. FAILED: User not found");
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    debugInfo.steps.push("5. User found OK");
    debugInfo.userId = user.id;
    debugInfo.userRole = user.role;
    debugInfo.userStatut = user.statut;
    debugInfo.hasPasswordHash = !!user.password_hash;
    debugInfo.passwordHashLength = user.password_hash?.length || 0;
    debugInfo.passwordHashPrefix = user.password_hash?.substring(0, 10) + "...";

    // Step 6: Verify password using Deno bcrypt
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, user.password_hash);
      debugInfo.steps.push("6. Password comparison done");
      debugInfo.passwordValid = passwordValid;
    } catch (bcryptError) {
      debugInfo.steps.push("6. FAILED: bcrypt error");
      debugInfo.bcryptError = String(bcryptError);
      return new Response(
        JSON.stringify({ error: "Erreur de vérification", debug: debugInfo }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!passwordValid) {
      debugInfo.steps.push("6b. FAILED: Password invalid");
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 7: Check user status
    if (user.statut === "desactive") {
      debugInfo.steps.push("7. FAILED: Account disabled");
      return new Response(
        JSON.stringify({ error: "Compte désactivé", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    debugInfo.steps.push("7. Status check OK");

    // Step 8: Create JWT token (30 days)
    const token = await createJWT({
      sub: user.id,
      ent: user.entreprise_id,
      role: user.role,
    }, 30);
    debugInfo.steps.push("8. JWT created (30 days)");

    // Step 9: Build response
    const entrepriseData = Array.isArray(user.entreprise) ? user.entreprise[0] : user.entreprise;

    const response = {
      status: "success",
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        statut: user.statut,
        telephone: user.telephone,
        entreprise_id: user.entreprise_id,
        two_factor_enabled: user.two_factor_enabled,
      },
      entreprise: entrepriseData ? {
        id: entrepriseData.id,
        nom: entrepriseData.nom,
        plan: entrepriseData.plan,
        subscription_status: entrepriseData.subscription_status,
        email: entrepriseData.email,
      } : null,
      debug: debugInfo
    };

    debugInfo.steps.push("9. Response built - SUCCESS");

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    debugInfo.steps.push("EXCEPTION: " + String(error));
    debugInfo.errorStack = error.stack;
    return new Response(
      JSON.stringify({ error: "Erreur serveur", debug: debugInfo }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## Étape 3: Tester après déploiement

Une fois déployé, testez avec:
```bash
curl -X POST "https://zmngftlkdimwvkxmduvr.supabase.co/functions/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@actoos.com","password":"Salifkane&&7"}'
```

### Réponse attendue en cas de succès:
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... },
  "entreprise": { ... },
  "debug": {
    "steps": ["1. Request parsed OK", "2. Input validation OK", ...],
    "version": "2.1"
  }
}
```

### En cas d'erreur, le `debug` vous dira exactement où ça coince:
- Step 3 failed = Variables d'environnement manquantes
- Step 5 failed = Utilisateur non trouvé dans la DB
- Step 6 failed = Mot de passe incorrect ou problème bcrypt

---

## 🆘 Si ça ne fonctionne toujours pas

Partagez-moi la réponse complète du curl (avec le champ `debug`) et je pourrai vous aider à identifier le problème exact.
