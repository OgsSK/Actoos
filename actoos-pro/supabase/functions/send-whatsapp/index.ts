// Supabase Edge Function: Send WhatsApp via Meta Business API
// Handles WhatsApp Business messaging for ACTOOS PRO

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHATSAPP_API_VERSION = "v18.0";

// Get WhatsApp config from environment or database
async function getWhatsAppConfig() {
  // First try environment variables
  let accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  let phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  
  // If not in env, try database
  if (!accessToken || !phoneNumberId) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: config } = await supabase
      .from("platform_config")
      .select("whatsapp_access_token, whatsapp_phone_number_id, whatsapp_enabled")
      .eq("id", 1)
      .single();
    
    if (config && config.whatsapp_enabled) {
      accessToken = config.whatsapp_access_token || accessToken;
      phoneNumberId = config.whatsapp_phone_number_id || phoneNumberId;
    }
  }
  
  return { accessToken, phoneNumberId };
}

interface WhatsAppRequest {
  to: string;
  message?: string;
  // Template support (recommended by Meta)
  template?: {
    name: string;
    language: string;
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
      }>;
    }>;
  };
  // Optional: Use enterprise's own WhatsApp config
  entreprise_id?: string;
}

// Format phone number for WhatsApp (E.164 without +)
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters including +
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Belgian numbers
  if (cleaned.startsWith('0') && cleaned.length === 9) {
    cleaned = '32' + cleaned.substring(1);
  }
  // Handle French numbers
  else if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '33' + cleaned.substring(1);
  }
  // Already has country code (32, 33, etc.)
  else if (!cleaned.startsWith('32') && !cleaned.startsWith('33') && !cleaned.startsWith('1')) {
    // Default to Belgium if no country code
    if (cleaned.length === 9) {
      cleaned = '32' + cleaned;
    } else if (cleaned.length === 10) {
      cleaned = '33' + cleaned;
    }
  }
  
  return cleaned;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: WhatsAppRequest = await req.json();
    const { to, message, template, entreprise_id } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing required field: to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message && !template) {
      return new Response(
        JSON.stringify({ error: "Either message or template is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get platform WhatsApp credentials from env or database
    const platformConfig = await getWhatsAppConfig();
    let accessToken = platformConfig.accessToken;
    let phoneNumberId = platformConfig.phoneNumberId;
    let mode = "shared";

    if (entreprise_id) {
      // Try to get enterprise-specific WhatsApp config
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: entreprise } = await supabase
        .from("entreprises")
        .select("whatsapp_config")
        .eq("id", entreprise_id)
        .single();

      if (entreprise?.whatsapp_config && !entreprise.whatsapp_config.use_shared) {
        if (entreprise.whatsapp_config.access_token && 
            entreprise.whatsapp_config.phone_number_id) {
          accessToken = entreprise.whatsapp_config.access_token;
          phoneNumberId = entreprise.whatsapp_config.phone_number_id;
          mode = "custom";
        }
      }
    }

    if (!accessToken || !phoneNumberId) {
      console.error("WhatsApp not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp service not configured", status: "error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    const formattedTo = formatPhoneNumber(to);

    // Build request body
    let requestBody: Record<string, unknown>;
    
    if (template) {
      // Template message (required for business-initiated conversations)
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
        type: "template",
        template: {
          name: template.name,
          language: {
            code: template.language || "fr"
          },
          components: template.components || []
        }
      };
    } else {
      // Text message (only for user-initiated conversations within 24h window)
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      };
    }

    // Send via WhatsApp Business API
    const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

    const response = await fetch(whatsappUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", result);
      return new Response(
        JSON.stringify({ 
          error: result.error?.message || "Failed to send WhatsApp message", 
          code: result.error?.code,
          status: "error" 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message_id: result.messages?.[0]?.id,
        to: formattedTo,
        mode: mode
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send WhatsApp error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", status: "error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
