import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id, content, author } = await req.json();
    if (!id || !content) throw new Error("Champs requis");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier que le message existe et que l'auteur correspond
    const { data: comment } = await supabase
      .from("project_comments")
      .select("id, author, created_at")
      .eq("id", id)
      .single();

    if (!comment) throw new Error("Message introuvable");

    // Un client peut éditer seulement son propre message et dans les 5 minutes
    if (author === 'client') {
      if (comment.author !== 'client') throw new Error("Non autorisé");
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      if (comment.created_at < fiveMinutesAgo) throw new Error("Délai d'édition dépassé (5 min)");
    }

    const { error } = await supabase
      .from("project_comments")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});