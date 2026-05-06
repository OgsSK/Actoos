// Supabase Edge Function: Stripe Webhook Handler
// Handles Stripe webhooks for payments

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Simple Stripe signature verification
async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',').reduce((acc: Record<string, string>, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {});

    const timestamp = parts['t'];
    const sig = parts['v1'];

    if (!timestamp || !sig) return false;

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      console.warn('Stripe webhook timestamp too old');
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return sig === expectedSig;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Verify signature if webhook secret is configured
    if (STRIPE_WEBHOOK_SECRET && signature) {
      const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
      if (!isValid) {
        console.error("Invalid Stripe signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const event = JSON.parse(body);
    console.log(`Received Stripe event: ${event.type}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        // Handle subscription payment
        if (session.mode === "subscription") {
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const email = session.customer_email || session.customer_details?.email;

          // Update entreprise subscription status
          if (email) {
            const { data: user } = await supabase
              .from("users")
              .select("entreprise_id")
              .eq("email", email.toLowerCase())
              .single();

            if (user?.entreprise_id) {
              await supabase
                .from("entreprises")
                .update({
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  subscription_status: "active",
                  updated_at: new Date().toISOString()
                })
                .eq("id", user.entreprise_id);

              console.log(`Updated subscription for entreprise ${user.entreprise_id}`);
            }
          }
        }

        // Handle one-time invoice payment
        if (session.mode === "payment" && session.metadata?.facture_id) {
          const factureId = session.metadata.facture_id;
          const amountPaid = session.amount_total / 100; // Convert from cents

          // Get facture
          const { data: facture } = await supabase
            .from("factures")
            .select("montant_ttc, total_ttc, montant_paye")
            .eq("id", factureId)
            .single();

          if (facture) {
            const totalTTC = facture.montant_ttc || facture.total_ttc;
            const newMontantPaye = (facture.montant_paye || 0) + amountPaid;
            const isFullyPaid = newMontantPaye >= totalTTC;

            await supabase
              .from("factures")
              .update({
                montant_paye: newMontantPaye,
                statut: isFullyPaid ? "payee" : "partiel",
                date_paiement: isFullyPaid ? new Date().toISOString() : null,
                mode_paiement: "carte",
                stripe_payment_id: session.payment_intent,
                updated_at: new Date().toISOString()
              })
              .eq("id", factureId);

            console.log(`Updated facture ${factureId}: paid ${amountPaid}€`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const status = subscription.status;
        const customerId = subscription.customer;

        // Map Stripe status to our status
        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "cancelled",
          unpaid: "expired",
          incomplete: "incomplete",
          incomplete_expired: "expired",
          trialing: "trial",
        };

        const ourStatus = statusMap[status] || status;

        // Find entreprise by Stripe customer ID
        const { data: entreprise } = await supabase
          .from("entreprises")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (entreprise) {
          await supabase
            .from("entreprises")
            .update({
              subscription_status: ourStatus,
              updated_at: new Date().toISOString()
            })
            .eq("id", entreprise.id);

          console.log(`Updated entreprise ${entreprise.id} subscription status to ${ourStatus}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const { data: entreprise } = await supabase
          .from("entreprises")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (entreprise) {
          await supabase
            .from("entreprises")
            .update({
              subscription_status: "cancelled",
              stripe_subscription_id: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", entreprise.id);

          console.log(`Cancelled subscription for entreprise ${entreprise.id}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const { data: entreprise } = await supabase
          .from("entreprises")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single();

        if (entreprise) {
          await supabase
            .from("entreprises")
            .update({
              subscription_status: "past_due",
              updated_at: new Date().toISOString()
            })
            .eq("id", entreprise.id);

          console.log(`Payment failed for entreprise ${entreprise.id}`);
          
          // TODO: Send email notification about failed payment
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook handler failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
