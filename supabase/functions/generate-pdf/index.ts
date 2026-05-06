// Supabase Edge Function: PDF Generator
// Generates PDFs for devis, factures, and reports

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PDFRequest {
  type: "devis" | "facture" | "intervention_report" | "statement";
  id: string;
  entreprise_id: string;
}

// Generate HTML for PDF
function generateDevisHTML(devis: any, client: any, entreprise: any): string {
  const lignesHTML = (devis.lignes || []).map((ligne: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ligne.description || ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${ligne.quantite || 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(ligne.prix_unitaire || 0).toFixed(2)} €</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${((ligne.quantite || 1) * (ligne.prix_unitaire || 0)).toFixed(2)} €</td>
    </tr>
  `).join('');

  const totalHT = (devis.lignes || []).reduce((sum: number, l: any) => sum + ((l.quantite || 1) * (l.prix_unitaire || 0)), 0);
  const totalTVA = (devis.lignes || []).reduce((sum: number, l: any) => sum + ((l.quantite || 1) * (l.prix_unitaire || 0) * (l.tva || 20) / 100), 0);
  const totalTTC = totalHT + totalTVA;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .title { font-size: 28px; color: #2563eb; margin-bottom: 20px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #2563eb; color: white; padding: 10px; text-align: left; }
        .totals { margin-top: 30px; text-align: right; }
        .total-row { padding: 5px 0; }
        .total-ttc { font-size: 18px; font-weight: bold; color: #2563eb; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .conditions { margin-top: 30px; font-size: 11px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">${entreprise.nom || 'ACTOOS PRO'}</div>
          <p>${entreprise.adresse || ''}<br>${entreprise.code_postal || ''} ${entreprise.ville || ''}</p>
          <p>Tél: ${entreprise.telephone || ''}<br>Email: ${entreprise.email || ''}</p>
          ${entreprise.siret ? `<p>SIRET: ${entreprise.siret}</p>` : ''}
          ${entreprise.tva_intra ? `<p>TVA: ${entreprise.tva_intra}</p>` : ''}
        </div>
        <div style="text-align: right;">
          <div class="title">DEVIS</div>
          <p><strong>N° ${devis.numero_devis || devis.numero || devis.id?.slice(0, 8)}</strong></p>
          <p>Date: ${new Date(devis.created_at).toLocaleDateString('fr-FR')}</p>
          <p>Validité: ${devis.validite_jours || 30} jours</p>
        </div>
      </div>

      <div class="info-box">
        <strong>Client</strong><br>
        ${client.nom} ${client.prenom || ''}<br>
        ${client.adresse || ''}<br>
        ${client.code_postal || ''} ${client.ville || ''}<br>
        ${client.email ? `Email: ${client.email}` : ''}<br>
        ${client.telephone ? `Tél: ${client.telephone}` : ''}
      </div>

      ${devis.objet ? `<p><strong>Objet:</strong> ${devis.objet}</p>` : ''}

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th style="width: 15%; text-align: center;">Qté</th>
            <th style="width: 17%; text-align: right;">Prix unit.</th>
            <th style="width: 18%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHTML}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">Total HT: ${totalHT.toFixed(2)} €</div>
        <div class="total-row">TVA: ${totalTVA.toFixed(2)} €</div>
        <div class="total-row total-ttc">Total TTC: ${totalTTC.toFixed(2)} €</div>
      </div>

      ${devis.conditions ? `<div class="conditions"><strong>Conditions:</strong><br>${devis.conditions}</div>` : ''}
      ${entreprise.conditions_generales ? `<div class="conditions"><strong>Conditions générales:</strong><br>${entreprise.conditions_generales}</div>` : ''}

      <div class="footer">
        <p>Document généré par ACTOOS PRO - ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </body>
    </html>
  `;
}

function generateFactureHTML(facture: any, client: any, entreprise: any): string {
  const lignesHTML = (facture.lignes || []).map((ligne: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ligne.description || ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${ligne.quantite || 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(ligne.prix_unitaire || 0).toFixed(2)} €</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${((ligne.quantite || 1) * (ligne.prix_unitaire || 0)).toFixed(2)} €</td>
    </tr>
  `).join('');

  const totalHT = facture.montant_ht || (facture.lignes || []).reduce((sum: number, l: any) => sum + ((l.quantite || 1) * (l.prix_unitaire || 0)), 0);
  const totalTVA = facture.montant_tva || (facture.lignes || []).reduce((sum: number, l: any) => sum + ((l.quantite || 1) * (l.prix_unitaire || 0) * (l.tva || 20) / 100), 0);
  const totalTTC = facture.montant_ttc || facture.total_ttc || (totalHT + totalTVA);
  const montantPaye = facture.montant_paye || 0;
  const resteAPayer = totalTTC - montantPaye;

  const statusColor = facture.statut === 'payee' ? '#10b981' : facture.statut === 'envoyee' ? '#f59e0b' : '#6b7280';
  const statusLabel = facture.statut === 'payee' ? 'PAYÉE' : facture.statut === 'envoyee' ? 'EN ATTENTE' : facture.statut?.toUpperCase();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .title { font-size: 28px; color: #2563eb; margin-bottom: 20px; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 12px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #2563eb; color: white; padding: 10px; text-align: left; }
        .totals { margin-top: 30px; text-align: right; }
        .total-row { padding: 5px 0; }
        .total-ttc { font-size: 18px; font-weight: bold; color: #2563eb; }
        .reste { font-size: 16px; font-weight: bold; color: #dc2626; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .conditions { margin-top: 30px; font-size: 11px; color: #6b7280; }
        .payment-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">${entreprise.nom || 'ACTOOS PRO'}</div>
          <p>${entreprise.adresse || ''}<br>${entreprise.code_postal || ''} ${entreprise.ville || ''}</p>
          <p>Tél: ${entreprise.telephone || ''}<br>Email: ${entreprise.email || ''}</p>
          ${entreprise.siret ? `<p>SIRET: ${entreprise.siret}</p>` : ''}
          ${entreprise.tva_intra ? `<p>TVA: ${entreprise.tva_intra}</p>` : ''}
        </div>
        <div style="text-align: right;">
          <div class="title">FACTURE</div>
          <span class="status" style="background: ${statusColor}20; color: ${statusColor};">${statusLabel}</span>
          <p><strong>N° ${facture.numero_facture || facture.numero || facture.id?.slice(0, 8)}</strong></p>
          <p>Date: ${new Date(facture.date_emission || facture.created_at).toLocaleDateString('fr-FR')}</p>
          ${facture.date_echeance ? `<p>Échéance: ${new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</p>` : ''}
        </div>
      </div>

      <div class="info-box">
        <strong>Client</strong><br>
        ${client.nom} ${client.prenom || ''}<br>
        ${client.adresse || ''}<br>
        ${client.code_postal || ''} ${client.ville || ''}<br>
        ${client.email ? `Email: ${client.email}` : ''}<br>
        ${client.telephone ? `Tél: ${client.telephone}` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th style="width: 15%; text-align: center;">Qté</th>
            <th style="width: 17%; text-align: right;">Prix unit.</th>
            <th style="width: 18%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHTML}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">Total HT: ${totalHT.toFixed(2)} €</div>
        <div class="total-row">TVA: ${totalTVA.toFixed(2)} €</div>
        <div class="total-row total-ttc">Total TTC: ${totalTTC.toFixed(2)} €</div>
        ${montantPaye > 0 ? `<div class="total-row">Déjà payé: ${montantPaye.toFixed(2)} €</div>` : ''}
        ${resteAPayer > 0 && resteAPayer < totalTTC ? `<div class="total-row reste">Reste à payer: ${resteAPayer.toFixed(2)} €</div>` : ''}
      </div>

      ${resteAPayer > 0 ? `
      <div class="payment-info">
        <strong>Modalités de paiement</strong><br>
        ${entreprise.conditions_paiement || `Paiement à ${entreprise.delai_paiement_jours || 30} jours`}<br>
        ${entreprise.iban ? `IBAN: ${entreprise.iban}` : ''}
      </div>
      ` : ''}

      ${entreprise.mentions_legales ? `<div class="conditions">${entreprise.mentions_legales}</div>` : ''}

      <div class="footer">
        <p>Document généré par ACTOOS PRO - ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: PDFRequest = await req.json();
    const { type, id, entreprise_id } = body;

    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let html = "";
    let filename = "";

    if (type === "devis") {
      // Fetch devis with client and entreprise
      const { data: devis, error } = await supabase
        .from("devis")
        .select(`*, client:clients(*), entreprise:entreprises(*)`)
        .eq("id", id)
        .single();

      if (error || !devis) {
        return new Response(
          JSON.stringify({ error: "Devis not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      html = generateDevisHTML(devis, devis.client, devis.entreprise);
      filename = `Devis_${devis.numero_devis || devis.numero || id.slice(0, 8)}.pdf`;

    } else if (type === "facture") {
      // Fetch facture with client and entreprise
      const { data: facture, error } = await supabase
        .from("factures")
        .select(`*, client:clients(*), entreprise:entreprises(*)`)
        .eq("id", id)
        .single();

      if (error || !facture) {
        return new Response(
          JSON.stringify({ error: "Facture not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      html = generateFactureHTML(facture, facture.client, facture.entreprise);
      filename = `Facture_${facture.numero_facture || facture.numero || id.slice(0, 8)}.pdf`;

    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported PDF type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return HTML (PDF conversion would require external service like Puppeteer/html-pdf)
    // For now, return HTML that can be printed as PDF by the browser
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
