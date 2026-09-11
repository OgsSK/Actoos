import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Templates de relances bilingues
const RELANCES = [
  {
    afterHours: 24,
    fr: {
      subject: "Nous avons bien reçu votre projet",
      html: (name: string, projectName: string) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2563eb">Bonjour ${name},</h2>
          <p>Nous avons bien reçu votre projet <strong>${projectName || 'votre demande'}</strong> et nous l'étudions avec attention.</p>
          <p>L'équipe Actoos reviendra vers vous dans les plus brefs délais.</p>
          <p>À très bientôt,</p>
          <p><strong>L'équipe Actoos</strong></p>
        </div>
      `,
    },
    en: {
      subject: "We have received your project",
      html: (name: string, projectName: string) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2563eb">Hello ${name},</h2>
          <p>We have received your project <strong>${projectName || 'your request'}</strong> and are carefully reviewing it.</p>
          <p>The Actoos team will get back to you shortly.</p>
          <p>Best regards,</p>
          <p><strong>The Actoos team</strong></p>
        </div>
      `,
    },
  },
  {
    afterHours: 48,
    fr: {
      subject: "Votre projet nous tient à cœur",
      html: (name: string, projectName: string) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2563eb">Bonjour ${name},</h2>
          <p>Nous ne vous avons pas oublié. Votre projet <strong>${projectName || 'votre demande'}</strong> est important pour nous.</p>
          <p>N'hésitez pas à nous contacter si vous avez des questions en attendant notre retour détaillé.</p>
          <p>À très bientôt,</p>
          <p><strong>L'équipe Actoos</strong></p>
        </div>
      `,
    },
    en: {
      subject: "Your project is important to us",
      html: (name: string, projectName: string) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2563eb">Hello ${name},</h2>
          <p>We haven't forgotten about you. Your project <strong>${projectName || 'your request'}</strong> is important to us.</p>
          <p>Feel free to contact us if you have any questions while waiting for our detailed response.</p>
          <p>Best regards,</p>
          <p><strong>The Actoos team</strong></p>
        </div>
      `,
    },
  },
  {
    afterHours: 72,
    fr: {
      subject: "Dernière relance avant archivage",
      html: (name: string, projectName: string) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2563eb">Bonjour ${name},</h2>
          <p>Nous sommes toujours disponibles pour échanger sur votre projet <strong>${projectName || 'votre demande'}</strong>.</p>
          <p>Vous pouvez prendre rendez-vous directement ici : <a href="https://calendly.com/contact-actoos/30min" style="color:#D4AF37;">Prendre rendez-vous</a></p>
          <p>À très bientôt,</p>
          <p><strong>L'équipe Actoos</strong></p>
        </div>
      `,
    },
    en: {
      subject: "Final reminder before archiving",
      html: (name: string, projectName: string) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2563eb">Hello ${name},</h2>
          <p>We are still available to discuss your project <strong>${projectName || 'your request'}</strong>.</p>
          <p>You can schedule a meeting directly here: <a href="https://calendly.com/contact-actoos/30min" style="color:#D4AF37;">Schedule a meeting</a></p>
          <p>Best regards,</p>
          <p><strong>The Actoos team</strong></p>
        </div>
      `,
    },
  },
];

async function sendRelance(lead: any, template: any, lang: string) {
  try {
    const projectName = lead.brief?.projectName || (lang === 'en' ? 'your project' : 'votre projet');
    const localizedTemplate = template[lang] || template.fr;
    const html = localizedTemplate.html(lead.client_name, projectName);
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Actoos <noreply@actoos.com>",
        to: lead.client_email,
        subject: localizedTemplate.subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur Resend pour lead ${lead.id}:`, errorText);
      return false;
    }

    // Mise à jour du lead
    const newRelanceCount = (lead.relance_count || 0) + 1;
    const newStatus = `relance_${newRelanceCount}_envoyee`;
    const now = new Date().toISOString();

    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/projets?id=eq.${lead.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: newStatus,
        relance_count: newRelanceCount,
        last_relance_at: now,
        updated_at: now,
      }),
    });

    if (!updateRes.ok) {
      console.error(`Erreur mise à jour lead ${lead.id}:`, await updateRes.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Exception sendRelance pour lead ${lead.id}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = new Date();

    // Récupérer les leads éligibles pour relance (avec leur langue)
    const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/projets?select=*&status=in.(nouveau,relance_1_envoyee,relance_2_envoyee)&order=created_at.asc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!fetchRes.ok) {
      const errorText = await fetchRes.text();
      console.error("Erreur fetch leads:", errorText);
      return new Response(JSON.stringify({ error: "Erreur fetch leads" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const leads = await fetchRes.json();

    let processed = 0;
    let errors = 0;

    for (const lead of leads) {
      const hoursSinceCreation = (now.getTime() - new Date(lead.created_at).getTime()) / 36e5;
      const relanceIndex = lead.relance_count || 0;

      if (relanceIndex < RELANCES.length && hoursSinceCreation >= RELANCES[relanceIndex].afterHours) {
        const lang = lead.language || 'fr'; // ← langue du lead
        const success = await sendRelance(lead, RELANCES[relanceIndex], lang);
        if (success) {
          processed++;
        } else {
          errors++;
        }
      }
    }

    // Archiver les leads qui ont dépassé la dernière relance depuis 24h
    const archiveRes = await fetch(`${SUPABASE_URL}/rest/v1/projets?status=eq.relance_3_envoyee&last_relance_at=lt.${new Date(now.getTime() - 24 * 36e5).toISOString()}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'archive', updated_at: now.toISOString() }),
    });

    if (!archiveRes.ok) {
      console.error("Erreur archivage:", await archiveRes.text());
    }

    return new Response(JSON.stringify({ success: true, processed, errors, total_leads: leads.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Erreur cron-relances:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});