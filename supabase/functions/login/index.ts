// Supabase Edge Function: Login v2.5
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcryptjs from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "actoos-pro-secret-key-2024";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        id, email, password_hash, nom, prenom, role, statut,
        entreprise_id, telephone, two_factor_enabled,
        entreprise:entreprises(id, nom, plan, subscription_status, email)
      `)
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const passwordValid = bcryptjs.compareSync(password, user.password_hash);

    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: "Email ou mot de passe incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.statut === "desactive") {
      return new Response(
        JSON.stringify({ error: "Compte désactivé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await createJWT({
      sub: user.id,
      ent: user.entreprise_id,
      role: user.role,
    }, 30);

    const entrepriseData = Array.isArray(user.entreprise) ? user.entreprise[0] : user.entreprise;

    return new Response(
      JSON.stringify({
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
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
