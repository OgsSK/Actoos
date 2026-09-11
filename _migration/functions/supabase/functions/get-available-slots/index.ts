import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CALCOM_API = "https://api.cal.com/v2";
const EVENT_TYPE_ID = 6015241;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date");
    if (!dateStr) {
      return new Response(JSON.stringify({ error: "Paramètre 'date' requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CALCOM_API_KEY")!;

    // Fuseau Europe/Paris
    const start = new Date(dateStr + "T00:00:00+02:00").toISOString();
    const end = new Date(dateStr + "T23:59:59+02:00").toISOString();

    const res = await fetch(
      `${CALCOM_API}/slots/available?eventTypeId=${EVENT_TYPE_ID}&startTime=${start}&endTime=${end}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Erreur API Cal.com:", errorText);
      return new Response(JSON.stringify({ error: "Erreur API Cal.com" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    // Nouvelle structure : data.slots["YYYY-MM-DD"] = [ { time: "..." }, ... ]
    const slotsArray = json?.data?.slots?.[dateStr] || [];
    const slots = slotsArray.map((s: any) => {
      // Conversion de l'heure UTC en heure locale (France)
      const date = new Date(s.time);
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    });

    return new Response(JSON.stringify([{ date: dateStr, slots }]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur get-available-slots:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});