/**
 * Email Service
 * 
 * Sends emails via Supabase Edge Function with Resend.
 * Falls back to mailto: if edge function not available.
 */

import { supabase } from './supabase';

// Get Supabase project URL
const getSupabaseUrl = () => {
  return process.env.REACT_APP_SUPABASE_URL || 'https://zmngftlkdimwvkxmduvr.supabase.co';
};

/**
 * Send email via Supabase Edge Function
 * Falls back to mailto: if edge function not available
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} [params.body] - Plain text body (for mailto fallback)
 * @param {string} [params.html] - HTML content
 * @param {string} [params.template] - Template name
 * @param {Object} [params.templateData] - Template data
 * @param {Array} [params.attachments] - Attachments [{filename, content (base64), type}]
 */
export const sendEmail = async ({ to, subject, body, html, template, templateData, attachments }) => {
  try {
    // Try Supabase Edge Function first
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ 
        to, 
        subject, 
        text: body,
        html,
        template,
        templateData,
        attachments
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.status === 'success') {
      return { success: true, method: 'edge_function', message_id: result.message_id };
    }
    
    throw new Error(result.error || 'Edge function failed');
  } catch (e) {
    // Fallback to mailto (without attachments)
    console.log('Email edge function not available, using mailto fallback:', e.message);
    
    if (attachments?.length > 0) {
      console.warn('Attachments not supported in mailto fallback');
    }
    
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body || '')}`;
    window.open(mailtoUrl, '_blank');
    
    return { success: true, method: 'mailto', message: 'Email ouvert dans votre client mail' };
  }
};

/**
 * Send Devis to client
 */
export const sendDevisEmail = async (devis, client, entreprise) => {
  if (!client?.email) {
    throw new Error('Le client n\'a pas d\'adresse email');
  }
  
  const portalUrl = `${window.location.origin}/portal/devis/${devis.token_client}`;
  
  const subject = `Devis ${devis.numero_devis} - ${entreprise?.nom || 'Votre devis'}`;
  
  const body = `Bonjour ${client.prenom || ''} ${client.nom || ''},

Veuillez trouver ci-joint votre devis ${devis.numero_devis}.

Montant total TTC: ${(devis.total_ttc || 0).toFixed(2)} €

Pour consulter et signer votre devis en ligne, cliquez sur le lien suivant:
${portalUrl}

Ce devis est valable ${devis.validite_jours || 30} jours.

Cordialement,
${entreprise?.nom || 'L\'équipe'}
${entreprise?.telephone ? `Tél: ${entreprise.telephone}` : ''}`;

  return sendEmail({
    to: client.email,
    subject,
    body
  });
};

/**
 * Send Facture to client
 */
export const sendFactureEmail = async (facture, client, entreprise) => {
  if (!client?.email) {
    throw new Error('Le client n\'a pas d\'adresse email');
  }
  
  const portalUrl = facture.token_client 
    ? `${window.location.origin}/portal/facture/${facture.token_client}`
    : null;
  
  const subject = `Facture ${facture.numero_facture} - ${entreprise?.nom || 'Votre facture'}`;
  
  let body = `Bonjour ${client.prenom || ''} ${client.nom || ''},

Veuillez trouver ci-joint votre facture ${facture.numero_facture}.

Montant total TTC: ${(facture.total_ttc || 0).toFixed(2)} €`;

  if (portalUrl) {
    body += `

Pour consulter votre facture en ligne:
${portalUrl}`;
  }

  body += `

Merci de procéder au règlement dans les délais convenus.

Cordialement,
${entreprise?.nom || 'L\'équipe'}
${entreprise?.telephone ? `Tél: ${entreprise.telephone}` : ''}`;

  return sendEmail({
    to: client.email,
    subject,
    body
  });
};

/**
 * Send payment reminder
 */
export const sendRelanceEmail = async (facture, client, entreprise) => {
  if (!client?.email) {
    throw new Error('Le client n\'a pas d\'adresse email');
  }
  
  const subject = `Relance - Facture ${facture.numero_facture}`;
  
  const body = `Bonjour ${client.prenom || ''} ${client.nom || ''},

Nous vous rappelons que la facture ${facture.numero_facture} d'un montant de ${(facture.total_ttc || 0).toFixed(2)} € est en attente de règlement.

Date d'émission: ${new Date(facture.created_at).toLocaleDateString('fr-FR')}

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Si vous avez déjà effectué le paiement, veuillez ignorer ce message.

Cordialement,
${entreprise?.nom || 'L\'équipe'}
${entreprise?.telephone ? `Tél: ${entreprise.telephone}` : ''}`;

  return sendEmail({
    to: client.email,
    subject,
    body
  });
};

/**
 * Send intervention reminder to client
 */
export const sendInterventionReminderEmail = async (intervention, client, entreprise) => {
  if (!client?.email) {
    throw new Error('Le client n\'a pas d\'adresse email');
  }
  
  const dateIntervention = new Date(intervention.date_prevue).toLocaleDateString('fr-FR');
  
  const subject = `Rappel - Intervention prévue le ${dateIntervention}`;
  
  const body = `Bonjour ${client.prenom || ''} ${client.nom || ''},

Nous vous rappelons votre intervention prévue:

Date: ${dateIntervention}
${intervention.heure_debut ? `Heure: ${intervention.heure_debut}` : ''}
${intervention.titre ? `Objet: ${intervention.titre}` : ''}
${intervention.adresse ? `Adresse: ${intervention.adresse}, ${intervention.code_postal || ''} ${intervention.ville || ''}` : ''}

Merci de nous contacter si vous avez besoin de modifier ce rendez-vous.

Cordialement,
${entreprise?.nom || 'L\'équipe'}
${entreprise?.telephone ? `Tél: ${entreprise.telephone}` : ''}`;

  return sendEmail({
    to: client.email,
    subject,
    body
  });
};

export default {
  sendEmail,
  sendDevisEmail,
  sendFactureEmail,
  sendRelanceEmail,
  sendInterventionReminderEmail
};

/**
 * Send Statement (Relevé) email with PDF attachment
 * @param {Object} params
 * @param {string} params.clientEmail - Client email
 * @param {string} params.clientName - Client name  
 * @param {string} params.periode - Period (e.g., "Mai 2026")
 * @param {Object} params.totals - Totals from statementService
 * @param {string} params.pdfBase64 - PDF as base64 string (without data:... prefix)
 * @param {Object} params.entreprise - Enterprise info
 * @param {string} [params.portalUrl] - Optional client portal URL
 */
export const sendStatementEmail = async ({
  clientEmail,
  clientName,
  periode,
  totals,
  pdfBase64,
  entreprise,
  portalUrl
}) => {
  if (!clientEmail) {
    throw new Error('Email client manquant');
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  };

  const templateData = {
    client_nom: clientName,
    periode: periode,
    nb_interventions: totals?.interventions || 0,
    nb_devis: totals?.devis || (totals?.devisCount || 0),
    nb_factures: totals?.facturesCount || (totals?.factures ? 1 : 0),
    total_ttc: formatCurrency(totals?.factures || 0),
    total_impaye: totals?.impaye || 0,
    entreprise_nom: entreprise?.nom || 'ACTOOS PRO',
    entreprise_tel: entreprise?.telephone || '',
    entreprise_email: entreprise?.email || '',
    portal_url: portalUrl || null,
  };

  const filename = `releve_${clientName.replace(/\s+/g, '_')}_${periode.replace(/\s+/g, '_')}.pdf`;

  // Plain text fallback
  const plainTextBody = `Bonjour ${clientName},

Veuillez trouver ci-joint votre relevé de compte pour la période ${periode}.

Récapitulatif:
- Interventions: ${templateData.nb_interventions}
- Devis: ${templateData.nb_devis}
- Factures: ${templateData.nb_factures}
- Total TTC: ${templateData.total_ttc} €

Cordialement,
${entreprise?.nom || 'ACTOOS PRO'}`;

  return sendEmail({
    to: clientEmail,
    subject: `Relevé de compte ${periode} - ${entreprise?.nom || 'ACTOOS PRO'}`,
    body: plainTextBody,
    template: 'releve_mensuel',
    templateData,
    attachments: pdfBase64 ? [{
      filename,
      content: pdfBase64,
      type: 'application/pdf'
    }] : undefined
  });
};

/**
 * Send multiple statement emails with progress tracking
 * @param {Array} statements - Array of statement objects with email data
 * @param {Function} onProgress - Callback (sentCount, totalCount, currentClient, status)
 * @returns {Object} { sent: number, failed: Array<{clientName, email, error}> }
 */
export const sendBulkStatementEmails = async (statements, onProgress) => {
  const results = {
    sent: 0,
    failed: []
  };

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    if (onProgress) {
      onProgress(i + 1, statements.length, statement.clientName, 'sending');
    }

    try {
      await sendStatementEmail(statement);
      results.sent++;
      
      if (onProgress) {
        onProgress(i + 1, statements.length, statement.clientName, 'success');
      }
    } catch (error) {
      results.failed.push({
        clientName: statement.clientName,
        email: statement.clientEmail,
        error: error.message
      });
      
      if (onProgress) {
        onProgress(i + 1, statements.length, statement.clientName, 'error');
      }
    }

    // Small delay to avoid rate limiting
    if (i < statements.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
};
