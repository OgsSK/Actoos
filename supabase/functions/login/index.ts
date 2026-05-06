// Supabase Edge Function: Ultra-fast login
// Verifies password against custom users table and returns JWT

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// JWT Secret (same as backend)
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "actoos-pro-secret-key-2024-super-secure";

// Create JWT token
function createJWT(payload: Record<string, unknown>, expiresInHours = 24): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInHours * 60 * 60);
  
  const fullPayload = { ...payload, iat: now, exp };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, "");
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const key = encoder.encode(JWT_SECRET);
  
  // Simple HMAC-SHA256 implementation for Deno
  const signature = crypto.subtle.sign
    ? signHMAC(data, key)
    : headerB64 + "." + payloadB64; // Fallback
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

async function signHMAC(data: Uint8Array, key: Uint8Array): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email et mot de passe requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for DB access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user with entreprise info in single query
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        id, email, password_hash, nom, prenom, role, statut,
        entreprise_id, telephone, two_factor_enabled,
        entreprise:entreprises(id, nom, plan, subscription_status, email)
      `)
      .eq("email", email.toLowerCase())
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user status
    if (user.statut === "desactive") {
      return new Response(
        JSON.stringify({ error: "Compte désactivé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.statut === "invite") {
      return new Response(
        JSON.stringify({ error: "Veuillez d'abord activer votre compte via le lien d'invitation" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription for admin
    if (user.role === "admin") {
      const subStatus = user.entreprise?.subscription_status || "none";
      if (["expired", "cancelled", "none", "past_due"].includes(subStatus)) {
        return new Response(
          JSON.stringify({
            error: {
              code: "subscription_required",
              message: "Votre abonnement a expiré. Veuillez renouveler.",
              subscription_status: subStatus,
              redirect: "/pricing"
            }
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update last login (fire and forget)
    supabase
      .from("users")
      .update({ derniere_connexion: new Date().toISOString() })
      .eq("id", user.id)
      .then(() => {});

    // Create JWT token
    const token = await createJWTAsync({
      sub: user.id,
      ent: user.entreprise_id,
      role: user.role,
    });

    // Return success response
    return new Response(
      JSON.stringify({
        access_token: token,
        user: {
          id: user.id,
          entreprise_id: user.entreprise_id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          telephone: user.telephone,
          role: user.role,
          statut: user.statut,
          derniere_connexion: new Date().toISOString(),
        },
        entreprise: user.entreprise,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createJWTAsync(payload: Record<string, unknown>, expiresInHours = 24): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInHours * 60 * 60);
  
  const fullPayload = { ...payload, iat: now, exp };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const key = encoder.encode(JWT_SECRET);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
