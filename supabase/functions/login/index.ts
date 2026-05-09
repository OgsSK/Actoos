// Supabase Edge Function: Login avec DEBUG COMPLET
// Version 2.2 - Fix bcrypt avec esm.sh (compatible Edge Functions)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compare } from "https://esm.sh/bcryptjs@2.4.3";

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
    version: "2.2"
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

    // Step 6: Verify password using bcryptjs (esm.sh - compatible with Edge Functions)
    let passwordValid = false;
    try {
      // bcryptjs.compare returns a Promise
      passwordValid = await compare(password, user.password_hash);
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
