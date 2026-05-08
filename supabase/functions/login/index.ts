// Supabase Edge Function: Login with DEBUG
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "actoos-pro-secret-key-2024-super-secure";

// Simple password verification - compare with bcrypt
async function verifyPassword(password: string, hash: string): Promise<{valid: boolean, error?: string}> {
  try {
    const bcryptjs = await import("https://esm.sh/bcryptjs@2.4.3");
    const result = bcryptjs.compareSync(password, hash);
    return { valid: result };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Create JWT
async function createJWT(payload: Record<string, unknown>, expiresInDays = 30): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInDays * 24 * 60 * 60); // 30 days by default for work apps
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const debugInfo: Record<string, unknown> = { steps: [] };

  try {
    const { email, password } = await req.json();
    debugInfo.steps.push("1. Parsed request body");
    debugInfo.email = email;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email et mot de passe requis", debug: debugInfo }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    debugInfo.steps.push("2. Got Supabase credentials");
    debugInfo.supabaseUrl = supabaseUrl;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    debugInfo.steps.push("3. Created Supabase client");

    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        id, email, password_hash, nom, prenom, role, statut,
        entreprise_id, telephone, two_factor_enabled,
        entreprise:entreprises(id, nom, plan, subscription_status, email)
      `)
      .eq("email", email.toLowerCase())
      .single();

    debugInfo.steps.push("4. Queried user");
    
    if (userError) {
      debugInfo.userError = userError.message;
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user) {
      debugInfo.steps.push("5. User not found");
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    debugInfo.steps.push("5. User found");
    debugInfo.userId = user.id;
    debugInfo.userRole = user.role;
    debugInfo.userStatut = user.statut;
    debugInfo.hashPrefix = user.password_hash?.substring(0, 20) + "...";
    debugInfo.hashLength = user.password_hash?.length;

    // Verify password
    const passwordCheck = await verifyPassword(password, user.password_hash);
    debugInfo.steps.push("6. Password verification done");
    debugInfo.passwordValid = passwordCheck.valid;
    if (passwordCheck.error) {
      debugInfo.passwordError = passwordCheck.error;
    }
    
    if (!passwordCheck.valid) {
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user status
    if (user.statut === "desactive") {
      return new Response(
        JSON.stringify({ error: "Compte désactivé", debug: debugInfo }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    debugInfo.steps.push("7. Status check passed");

    // Create JWT token
    const token = await createJWT({
      sub: user.id,
      ent: user.entreprise_id,
      role: user.role,
    });
    debugInfo.steps.push("8. JWT created");

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

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    debugInfo.steps.push("ERROR: " + error.message);
    debugInfo.errorStack = error.stack;
    return new Response(
      JSON.stringify({ error: "Erreur serveur", debug: debugInfo }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
