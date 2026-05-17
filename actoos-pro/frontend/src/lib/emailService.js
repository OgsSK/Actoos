/**
 * Email Service
 * 
 * Pour l'envoi automatique d'emails, configurez Supabase Edge Functions avec Resend.
 * En attendant, ce service utilise mailto: comme fallback.
 */

import { supabase } from './supabase';

/**
 * Try to send email via Supabase Edge Function
 * Falls back to mailto: if edge function not available
 */
export const sendEmail = async ({ to, subject, body, html }) => {
  try {
    // Try Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, body, html }
    });
    
    if (!error && data?.success) {
      return { success: true, method: 'edge_function' };
    }
    
    throw new Error('Edge function not available');
  } catch (e) {
    // Fallback to mailto
    console.log('Email edge function not available, using mailto fallback');
    
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
