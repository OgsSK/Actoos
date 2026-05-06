// Supabase Edge Function: Send SMS via Twilio
// Handles all SMS sending for ACTOOS PRO

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shared Twilio credentials (Actoos account)
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

interface SMSRequest {
  to: string;
  message: string;
  // Optional: Use enterprise's own Twilio config
  entreprise_id?: string;
  // Template support
  template?: "intervention_reminder" | "invitation" | "devis_notification" | "facture_reminder";
  templateData?: Record<string, unknown>;
}

// SMS templates
const templates: Record<string, (data: Record<string, unknown>) => string> = {
  intervention_reminder: (data) => 
    `ACTOOS: Rappel intervention demain ${data.heure} chez ${data.client_nom}. Adresse: ${data.adresse}. ${data.entreprise_nom}`,
  
  invitation: (data) =>
    `${data.entreprise_nom} vous invite à rejoindre ACTOOS PRO. Activez votre compte: ${data.activation_url}`,
  
  devis_notification: (data) =>
    `Nouveau devis de ${data.entreprise_nom}: ${data.montant}€. Consultez-le ici: ${data.portal_url}`,
  
  facture_reminder: (data) =>
    `Rappel ${data.entreprise_nom}: Facture ${data.numero} de ${data.montant}€ en attente. Payez en ligne: ${data.portal_url}`,
};

// Format phone number for Twilio (E.164 format)
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Belgian numbers
  if (cleaned.startsWith('0') && cleaned.length === 9) {
    cleaned = '32' + cleaned.substring(1);
  }
  // Handle French numbers
  else if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '33' + cleaned.substring(1);
  }
  // Already has country code
  else if (!cleaned.startsWith('32') && !cleaned.startsWith('33') && !cleaned.startsWith('1')) {
    // Default to Belgium if no country code
    if (cleaned.length === 9) {
      cleaned = '32' + cleaned;
    } else if (cleaned.length === 10) {
      cleaned = '33' + cleaned;
    }
  }
  
  return '+' + cleaned;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: SMSRequest = await req.json();
    const { to, message, entreprise_id, template, templateData } = body;

    // Build message content
    let smsMessage = message;
    
    if (template && templates[template] && templateData) {
      smsMessage = templates[template](templateData);
    }

    if (!to || !smsMessage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Twilio credentials (check enterprise config or use shared)
    let accountSid = TWILIO_ACCOUNT_SID;
    let authToken = TWILIO_AUTH_TOKEN;
    let fromNumber = TWILIO_PHONE_NUMBER;
    let mode = "shared";

    if (entreprise_id) {
      // Try to get enterprise-specific Twilio config
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: entreprise } = await supabase
        .from("entreprises")
        .select("sms_config")
        .eq("id", entreprise_id)
        .single();

      if (entreprise?.sms_config && !entreprise.sms_config.use_shared) {
        if (entreprise.sms_config.twilio_account_sid && 
            entreprise.sms_config.twilio_auth_token &&
            entreprise.sms_config.twilio_phone_number) {
          accountSid = entreprise.sms_config.twilio_account_sid;
          authToken = entreprise.sms_config.twilio_auth_token;
          fromNumber = entreprise.sms_config.twilio_phone_number;
          mode = "custom";
        }
      }
    }

    if (!accountSid || !authToken || !fromNumber) {
      console.error("Twilio not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured", status: "error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    const formattedTo = formatPhoneNumber(to);

    // Send via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append("To", formattedTo);
    formData.append("From", fromNumber);
    formData.append("Body", smsMessage);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", result);
      return new Response(
        JSON.stringify({ 
          error: result.message || "Failed to send SMS", 
          code: result.code,
          status: "error" 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message_sid: result.sid,
        to: formattedTo,
        mode: mode
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send SMS error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", status: "error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
