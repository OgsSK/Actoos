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
 * Send Devis to client with PDF attachment
 */
export const sendDevisEmail = async (devis, client, entreprise, pdfBase64 = null) => {
  if (!client?.email) {
    throw new Error('Le client n\'a pas d\'adresse email');
  }
  
  const portalUrl = `${window.location.origin}/portal/devis/${devis.token_client}`;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  };

  const templateData = {
    numero: devis.numero_devis,
    client_nom: `${client.prenom || ''} ${client.nom || ''}`.trim() || client.nom_entreprise || 'Client',
    entreprise_nom: entreprise?.nom || 'ACTOOS PRO',
    montant_ttc: formatCurrency(devis.total_ttc),
    validite_jours: devis.validite_jours || 30,
    portal_url: portalUrl,
  };

  const subject = `Devis ${devis.numero_devis} - ${entreprise?.nom || 'Votre devis'}`;
  
  // Plain text fallback
  const body = `Bonjour ${templateData.client_nom},

Veuillez trouver ci-joint votre devis ${devis.numero_devis}.

Montant total TTC: ${templateData.montant_ttc} €

Pour consulter et signer votre devis en ligne, cliquez sur le lien suivant:
${portalUrl}

Ce devis est valable ${templateData.validite_jours} jours.

Cordialement,
${entreprise?.nom || 'L\'équipe'}
${entreprise?.telephone ? `Tél: ${entreprise.telephone}` : ''}`;

  const attachments = pdfBase64 ? [{
    filename: `devis_${devis.numero_devis}.pdf`,
    content: pdfBase64,
    type: 'application/pdf'
  }] : undefined;

  return sendEmail({
    to: client.email,
    subject,
    body,
    template: 'devis_sent',
    templateData,
    attachments
  });
};

/**
 * Send Facture to client with PDF attachment
 */
export const sendFactureEmail = async (facture, client, entreprise, pdfBase64 = null) => {
  if (!client?.email) {
    throw new Error('Le client n\'a pas d\'adresse email');
  }
  
  const portalUrl = facture.token_client 
    ? `${window.location.origin}/portal/facture/${facture.token_client}`
    : null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  // Calculate due date (30 days from creation by default)
  const dateEcheance = facture.date_echeance 
    ? formatDate(facture.date_echeance)
    : formatDate(new Date(new Date(facture.created_at).getTime() + 30 * 24 * 60 * 60 * 1000));

  const templateData = {
    numero: facture.numero_facture,
    client_nom: `${client.prenom || ''} ${client.nom || ''}`.trim() || client.nom_entreprise || 'Client',
    entreprise_nom: entreprise?.nom || 'ACTOOS PRO',
    montant_ttc: formatCurrency(facture.total_ttc),
    date_echeance: dateEcheance,
    portal_url: portalUrl,
  };

  const subject = `Facture ${facture.numero_facture} - ${entreprise?.nom || 'Votre facture'}`;
  
  // Plain text fallback
  let body = `Bonjour ${templateData.client_nom},

Veuillez trouver ci-joint votre facture ${facture.numero_facture}.

Montant total TTC: ${templateData.montant_ttc} €
Échéance: ${dateEcheance}`;

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

  const attachments = pdfBase64 ? [{
    filename: `facture_${facture.numero_facture}.pdf`,
    content: pdfBase64,
    type: 'application/pdf'
  }] : undefined;

  return sendEmail({
    to: client.email,
    subject,
    body,
    template: 'facture_sent',
    templateData,
    attachments
  });
};

/**
 * Send payment reminder with PDF attachment
 */
export const sendRelanceEmail = async (facture, client, entreprise, pdfBase64 = null) => {
  if (!client?.email) {
    throw new Error('Le client n\'a pas d\'adresse email');
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  };

  // Calculate days overdue
  const createdDate = new Date(facture.created_at);
  const dueDate = facture.date_echeance ? new Date(facture.date_echeance) : new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const today = new Date();
  const joursRetard = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));

  const portalUrl = facture.token_client 
    ? `${window.location.origin}/portal/facture/${facture.token_client}`
    : null;

  const templateData = {
    numero: facture.numero_facture,
    client_nom: `${client.prenom || ''} ${client.nom || ''}`.trim() || client.nom_entreprise || 'Client',
    entreprise_nom: entreprise?.nom || 'ACTOOS PRO',
    montant_du: formatCurrency(facture.total_ttc - (facture.montant_paye || 0)),
    jours_retard: joursRetard,
    portal_url: portalUrl,
  };

  const subject = `Relance - Facture ${facture.numero_facture} en attente`;
  
  // Plain text fallback
  const body = `Bonjour ${templateData.client_nom},

Nous vous rappelons que la facture ${facture.numero_facture} d'un montant de ${templateData.montant_du} € est en attente de règlement${joursRetard > 0 ? ` depuis ${joursRetard} jours` : ''}.

Date d'émission: ${new Date(facture.created_at).toLocaleDateString('fr-FR')}

${portalUrl ? `Pour régler en ligne: ${portalUrl}\n\n` : ''}Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Si vous avez déjà effectué le paiement, veuillez ignorer ce message.

Cordialement,
${entreprise?.nom || 'L\'équipe'}
${entreprise?.telephone ? `Tél: ${entreprise.telephone}` : ''}`;

  const attachments = pdfBase64 ? [{
    filename: `relance_facture_${facture.numero_facture}.pdf`,
    content: pdfBase64,
    type: 'application/pdf'
  }] : undefined;

  return sendEmail({
    to: client.email,
    subject,
    body,
    template: 'facture_relance',
    templateData,
    attachments
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
