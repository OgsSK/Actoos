import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token requis" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("projets")
      .select("*")
      .eq("client_token", token)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Projet introuvable" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  } catch (error: any) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur serveur" }),
      { status: 500, headers: corsHeaders }
    );
  }
});