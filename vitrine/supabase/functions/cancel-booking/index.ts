// Edge Function cancel-booking – avec cancellationReason
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CALCOM_API = "https://api.cal.com/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { booking_id, project_id } = body;

    if (!booking_id || !project_id) {
      return new Response(JSON.stringify({ error: "booking_id (UID) et project_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CALCOM_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Annulation UID:", booking_id);

    const cancelBody = JSON.stringify({ cancellationReason: "Annulation demandée par le client" });
    const cancelRes = await fetch(`${CALCOM_API}/bookings/${booking_id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "cal-api-version": "2026-02-25",
      },
      body: cancelBody,
    });

    const cancelData = await cancelRes.json().catch(() => ({}));
    console.log("Réponse annulation:", JSON.stringify(cancelData));

    if (!cancelRes.ok) {
      const isAlreadyCancelled = cancelData?.error?.message?.includes("already cancelled") || cancelData?.message?.includes("already cancelled");
      if (!isAlreadyCancelled) {
        console.error("Erreur annulation Cal.com:", cancelData);
        return new Response(JSON.stringify({ error: cancelData.message || "Erreur lors de l'annulation" }), {
          status: cancelRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Mise à jour Supabase
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/projets?id=eq.${project_id}`, {
      method: "PATCH",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        booking_id: null,
        booking_start: null,
        booking_link: null,
      }),
    });

    if (!updateRes.ok) {
      console.error("Erreur mise à jour Supabase:", await updateRes.text());
      return new Response(JSON.stringify({ success: true, warning: "Annulation Cal.com réussie, mais la mise à jour locale a échoué." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur cancel-booking:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});