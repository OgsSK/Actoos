// Supabase Edge Function: Refresh Token
// Permet le rafraîchissement silencieux du JWT avant expiration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "actoos-pro-secret-key-2024-super-secure";

// Decode and verify JWT (allows recently expired tokens within grace period)
function decodeJWT(token: string): { payload: Record<string, unknown> | null; error?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { payload: null, error: "Invalid token format" };
    }
    
    // Decode payload (middle part)
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);
    
    return { payload };
  } catch (e) {
    const error = e as Error;
    return { payload: null, error: error.message };
  }
}

// Verify JWT signature
async function verifyJWTSignature(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const key = encoder.encode(JWT_SECRET);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    
    // Decode signature
    const signatureB64 = parts[2].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (signatureB64.length % 4)) % 4);
    const signatureBytes = Uint8Array.from(atob(signatureB64 + padding), c => c.charCodeAt(0));
    
    return await crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, data);
  } catch {
    return false;
  }
}

// Create new JWT
async function createJWT(payload: Record<string, unknown>, expiresInHours = 24): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInHours * 60 * 60);
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

  try {
    const { current_token, user_id, entreprise_id } = await req.json();

    // Validate required fields
    if (!current_token) {
      return new Response(
        JSON.stringify({ error: "Token actuel requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the token signature (even if expired)
    const isValidSignature = await verifyJWTSignature(current_token);
    if (!isValidSignature) {
      return new Response(
        JSON.stringify({ error: "Signature du token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode the token
    const { payload, error: decodeError } = decodeJWT(current_token);
    if (!payload || decodeError) {
      return new Response(
        JSON.stringify({ error: "Token invalide", details: decodeError }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is within acceptable refresh window
    // Allow refresh if token expired less than 1 hour ago (grace period)
    const now = Math.floor(Date.now() / 1000);
    const tokenExp = payload.exp as number;
    const gracePeriod = 60 * 60; // 1 hour grace period
    
    if (tokenExp && now > tokenExp + gracePeriod) {
      return new Response(
        JSON.stringify({ 
          error: "Token expiré depuis trop longtemps",
          expired_at: new Date(tokenExp * 1000).toISOString(),
          must_relogin: true
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID from token or request
    const tokenUserId = payload.sub as string;
    const tokenEntrepriseId = payload.ent as string;
    const finalUserId = user_id || tokenUserId;
    const finalEntrepriseId = entreprise_id || tokenEntrepriseId;

    if (!finalUserId) {
      return new Response(
        JSON.stringify({ error: "ID utilisateur manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Connect to Supabase and verify user still exists and is active
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, role, statut, entreprise_id")
      .eq("id", finalUserId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé", must_relogin: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user is still active
    if (user.statut === "desactive") {
      return new Response(
        JSON.stringify({ error: "Compte désactivé", must_relogin: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify entreprise ID matches (security check)
    if (finalEntrepriseId && user.entreprise_id !== finalEntrepriseId) {
      return new Response(
        JSON.stringify({ error: "Entreprise mismatch", must_relogin: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new token with fresh expiration (24 hours)
    const newToken = await createJWT({
      sub: user.id,
      ent: user.entreprise_id,
      role: user.role,
    }, 24);

    // Log the refresh for audit
    console.log(`[refresh-token] Token refreshed for user ${user.id} (${user.email})`);

    return new Response(
      JSON.stringify({ 
        status: "success",
        token: newToken,
        expires_in: 24 * 60 * 60, // seconds
        user_id: user.id,
        refreshed_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    const error = e as Error;
    console.error("[refresh-token] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
