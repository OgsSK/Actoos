import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;

function normalizeStatus(value: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      id,
      status,
      payment_status,
      notes,
      payment_link,
      payment_amount,
      maturityScore,
      decision_message,
      archived,
      action,
      phase,
      phase_message,
      steps,
    } = body;

    if (!id) throw new Error("ID manquant");

    const authHeader = req.headers.get("Authorization");
    if (authHeader !== "Bearer actoos-admin-2026") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Actions spécifiques (décision)
    if (action === "accept") {
      updates.status = "gagné";
      updates.archived = false;
      updates.archived_at = null;
    } else if (action === "archive") {
      updates.archived = true;
      updates.archived_at = new Date().toISOString();
      updates.status = "perdu";
    } else if (action === "refuse" || action === "delete") {
      // ⛔️ COMMENTÉ : on ne veut plus d'email automatique lors de la suppression
      // (l'email est désormais envoyé par l'admin via /api/send-project-email)
      /*
      const { data: projetAvantSuppression } = await supabase
        .from("projets")
        .select("client_email, client_name, brief")
        .eq("id", id)
        .single();

      await supabase.from("projets").delete().eq("id", id);

      if (projetAvantSuppression?.client_email && RESEND_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Actoos <noreply@actoos.com>",
            to: projetAvantSuppression.client_email,
            subject: "Votre projet n'a pas été retenu",
            html: `<h2>Bonjour ${projetAvantSuppression.client_name},</h2><p>Malheureusement, votre projet <strong>${projetAvantSuppression.brief?.projectName || ''}</strong> n'a pas été retenu.</p><p>Raison : ${decision_message || 'Non spécifié'}</p><p>N'hésitez pas à nous contacter pour plus d'informations ou à soumettre un nouveau projet.</p>`,
          }),
        });
      }
      */
      
      // On supprime simplement le projet
      await supabase.from("projets").delete().eq("id", id);
      return new Response(JSON.stringify({ success: true, deleted: true }), { headers: corsHeaders });
    } else if (action === "restore") {
      updates.archived = false;
      updates.archived_at = null;
      updates.status = "nouveau";
    }

    // Mise à jour des champs standards
    if (status !== undefined) updates.status = normalizeStatus(status);
    if (payment_status !== undefined) updates.payment_status = normalizeStatus(payment_status);
    if (notes !== undefined) updates.notes = notes;
    if (payment_link !== undefined) updates.payment_link = payment_link;
    if (payment_amount !== undefined) updates.payment_amount = payment_amount;
    if (decision_message !== undefined) updates.decision_message = decision_message;
    if (phase !== undefined) updates.phase = phase;
    if (phase_message !== undefined) updates.phase_message = phase_message;
    if (steps !== undefined) updates.steps = steps;

    // Mise à jour du score de maturité
    if (maturityScore !== undefined) {
      const { data: projetActuel } = await supabase
        .from("projets")
        .select("brief")
        .eq("id", id)
        .single();
      const briefActuel = projetActuel?.brief || {};
      briefActuel.maturityScore = maturityScore;
      updates.brief = briefActuel;
    }

    // Appliquer les mises à jour
    const { data, error } = await supabase
      .from("projets")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    // ⛔️ COMMENTÉ : on ne veut plus d'email automatique lors de l'acceptation
    // (l'email est désormais envoyé par l'admin via /api/send-project-email)
    /*
    if (action === "accept" && data.client_email && RESEND_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Actoos <noreply@actoos.com>",
          to: data.client_email,
          subject: "Votre projet a été accepté !",
          html: `<h2>Félicitations ${data.client_name} !</h2><p>Votre projet <strong>${data.brief?.projectName || ''}</strong> a été accepté. L'équipe Actoos va vous contacter pour la suite.</p>`,
        }),
      });
    }
    */

    return new Response(JSON.stringify({ success: true, projet: data }), { headers: corsHeaders });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});