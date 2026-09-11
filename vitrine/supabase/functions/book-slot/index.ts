// Edge Function book-slot – finale avec uid
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
    const body = await req.json();
    const { date, time, client_name, client_email, project_name, project_id } = body;

    if (!date || !time || !client_email) {
      return new Response(JSON.stringify({ error: "Champs requis : date, time, client_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CALCOM_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Construction de la date : heure locale Europe/Brussels → UTC
    const startDateTime = new Date(`${date}T${time}:00+02:00`);
    const start = startDateTime.toISOString();

    const payload = {
      start,
      eventTypeId: EVENT_TYPE_ID,
      attendee: {
        name: client_name || "Client",
        email: client_email,
        timeZone: "Europe/Brussels",
        language: "fr",
      },
      metadata: {},
    };

    console.log("CAL PAYLOAD:", JSON.stringify(payload));

    // Réservation Cal.com v2
    const bookingRes = await fetch(`${CALCOM_API}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "cal-api-version": "2026-02-25",
      },
      body: JSON.stringify(payload),
    });

    const bookingData = await bookingRes.json();
    console.log("CAL RESPONSE:", JSON.stringify(bookingData));

    if (!bookingRes.ok) {
      return new Response(JSON.stringify({ error: bookingData.message || "Erreur lors de la réservation" }), {
        status: bookingRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Enregistrer dans Supabase avec l'UID ---
    if (project_id && bookingData?.data?.uid) {
      try {
        const updateRes = await fetch(`${supabaseUrl}/rest/v1/projets?id=eq.${project_id}`, {
          method: "PATCH",
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            booking_id: bookingData.data.uid,                  // UID alphanumérique
            booking_start: start,                              // date UTC
            booking_link: bookingData.data.meetingUrl || null, // lien Google Meet
          }),
        });

        if (!updateRes.ok) {
          console.error("Erreur PATCH Supabase:", await updateRes.text());
        } else {
          console.log("PATCH Supabase réussi");
        }
      } catch (patchError) {
        console.error("Exception PATCH Supabase:", patchError);
      }
    } else {
      console.warn("PATCH ignoré : project_id ou uid manquant");
    }

    return new Response(JSON.stringify({ success: true, booking: bookingData.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur book-slot:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});