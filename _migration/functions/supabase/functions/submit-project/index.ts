import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { name, email, message, modules, conversation } = await req.json();

    if (!name || !email || !modules || modules.length === 0) {
      return new Response(JSON.stringify({ error: "Champs requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ⛔️ L'envoi automatique d'email a été supprimé pour éviter les doublons.
    // L'email est désormais envoyé par l'admin via /api/send-project-email avec le nouveau template.
    // On retourne simplement un succès (ou on pourrait stocker le projet si nécessaire)
    
    return new Response(JSON.stringify({ success: true, message: "Projet reçu, email non envoyé (géré par admin)" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("submit-project error:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});