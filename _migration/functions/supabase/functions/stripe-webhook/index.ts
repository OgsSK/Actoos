import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;   // ← changé ici
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2025-03-31" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Actoos <noreply@actoos.com>", to, subject, html }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Signature manquante");

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const projetId = session.metadata?.projet_id;
      const amount = session.amount_total ? session.amount_total / 100 : 0;

      if (!projetId || !amount) throw new Error("Métadonnées manquantes");

      const { data: projet } = await supabase
        .from("projets")
        .select("paid_amount, payment_amount, client_name, client_email, payment_history")
        .eq("id", projetId)
        .single();

      if (!projet) throw new Error("Projet non trouvé");

      const previousPaid = projet.paid_amount || 0;
      const totalDue = projet.payment_amount || 0;
      const newPaid = previousPaid + amount;
      const isComplete = newPaid >= totalDue;

      const historyEntry = {
        amount,
        date: new Date().toISOString(),
        stripe_id: session.id,
        status: "completed",
      };
      const paymentHistory = [...(projet.payment_history || []), historyEntry];

      await supabase
        .from("projets")
        .update({
          paid_amount: newPaid,
          payment_status: isComplete ? "complet" : "acompte_payé",
          payment_history: paymentHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projetId);

      const clientEmail = projet.client_email;
      const clientName = projet.client_name;
      await sendEmail(clientEmail, "Paiement reçu - Actoos", `
        <h2>✅ Paiement reçu</h2>
        <p>Bonjour ${clientName},</p>
        <p>Nous avons bien reçu votre paiement de <strong>${amount}€</strong>.</p>
        <p>Total payé à ce jour : <strong>${newPaid}€</strong> / ${totalDue}€</p>
        ${!isComplete ? `<p>Il reste <strong>${(totalDue - newPaid).toFixed(2)}€</strong> à régler.</p>` : '<p>Votre paiement est complet.</p>'}
        <p>Cordialement,</p>
        <p><strong>L'équipe Actoos</strong></p>
      `);

      await sendEmail("contact@actoos.com", `Paiement reçu - ${clientName}`, `
        <h2>💰 Paiement reçu</h2>
        <p><strong>Client :</strong> ${clientName} (${clientEmail})</p>
        <p><strong>Montant :</strong> ${amount}€</p>
        <p><strong>Total payé :</strong> ${newPaid}€ / ${totalDue}€</p>
        <p><strong>Statut :</strong> ${isComplete ? 'Complet' : 'Acompte'}</p>
        <p>ID Stripe : ${session.id}</p>
      `);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});