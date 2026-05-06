// Supabase Edge Function: Send Email via Resend
// Handles all email sending for ACTOOS PRO

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = "ACTOOS PRO <noreply@actoos.com>";

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  // Template support
  template?: "devis_sent" | "facture_sent" | "facture_relance" | "invitation" | "password_reset";
  templateData?: Record<string, unknown>;
}

// Email templates
const templates: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  devis_sent: (data) => ({
    subject: `Nouveau devis ${data.numero} - ${data.entreprise_nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nouveau devis</h2>
        <p>Bonjour ${data.client_nom},</p>
        <p>${data.entreprise_nom} vous a envoyé un devis.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Numéro:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.numero}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Montant TTC:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.montant_ttc} €</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Validité:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.validite_jours} jours</td>
          </tr>
        </table>
        <p>
          <a href="${data.portal_url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Consulter et signer le devis
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Cordialement,<br>${data.entreprise_nom}
        </p>
      </div>
    `
  }),

  facture_sent: (data) => ({
    subject: `Facture ${data.numero} - ${data.entreprise_nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nouvelle facture</h2>
        <p>Bonjour ${data.client_nom},</p>
        <p>${data.entreprise_nom} vous a envoyé une facture.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Numéro:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.numero}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Montant TTC:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.montant_ttc} €</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Échéance:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.date_echeance}</td>
          </tr>
        </table>
        ${data.portal_url ? `
        <p>
          <a href="${data.portal_url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Consulter et payer en ligne
          </a>
        </p>
        ` : ''}
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Cordialement,<br>${data.entreprise_nom}
        </p>
      </div>
    `
  }),

  facture_relance: (data) => ({
    subject: `Rappel: Facture ${data.numero} en attente - ${data.entreprise_nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Rappel de paiement</h2>
        <p>Bonjour ${data.client_nom},</p>
        <p>Nous vous rappelons que la facture ci-dessous est en attente de paiement depuis ${data.jours_retard} jours.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Numéro:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.numero}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Montant dû:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.montant_du} €</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Retard:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${data.jours_retard} jours</td>
          </tr>
        </table>
        <p>Merci de procéder au règlement dans les meilleurs délais.</p>
        ${data.portal_url ? `
        <p>
          <a href="${data.portal_url}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Payer maintenant
          </a>
        </p>
        ` : ''}
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Cordialement,<br>${data.entreprise_nom}
        </p>
      </div>
    `
  }),

  invitation: (data) => ({
    subject: `Invitation à rejoindre ${data.entreprise_nom} sur ACTOOS PRO`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Bienvenue sur ACTOOS PRO</h2>
        <p>Bonjour ${data.prenom || ''},</p>
        <p>Vous avez été invité(e) à rejoindre <strong>${data.entreprise_nom}</strong> en tant que ${data.role === 'tech' ? 'technicien' : data.role}.</p>
        <p>
          <a href="${data.activation_url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Activer mon compte
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Ce lien est valable 7 jours.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          L'équipe ACTOOS PRO
        </p>
      </div>
    `
  }),

  password_reset: (data) => ({
    subject: `Réinitialisation de mot de passe - ACTOOS PRO`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Réinitialisation de mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>
          <a href="${data.reset_url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Ce lien est valable 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          L'équipe ACTOOS PRO
        </p>
      </div>
    `
  }),
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured", status: "error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EmailRequest = await req.json();
    const { to, subject, html, text, from, replyTo, template, templateData } = body;

    // Build email content
    let emailSubject = subject;
    let emailHtml = html;

    if (template && templates[template] && templateData) {
      const rendered = templates[template](templateData);
      emailSubject = rendered.subject;
      emailHtml = rendered.html;
    }

    if (!to || !emailSubject || (!emailHtml && !text)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, and html/text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject: emailSubject,
        html: emailHtml,
        text: text,
        reply_to: replyTo,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", result);
      return new Response(
        JSON.stringify({ error: result.message || "Failed to send email", status: "error" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message_id: result.id,
        to: Array.isArray(to) ? to : [to]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", status: "error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
