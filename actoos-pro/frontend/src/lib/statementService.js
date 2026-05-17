/**
 * Statement PDF Generation Service
 * Génère des relevés de compte complets avec interventions, devis, factures
 */
import { jsPDF } from 'jspdf';
import { supabase } from './supabase';

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

// Helper to format date
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR');
};

// Helper to format duration
const formatDuration = (minutes) => {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${mins}min`;
};

// Get status label
const getStatusLabel = (status) => {
  const labels = {
    planifie: 'Planifiée',
    accepte: 'Acceptée',
    en_cours: 'En cours',
    termine: 'Terminée',
    annule: 'Annulée',
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    signe: 'Signé',
    refuse: 'Refusé',
    facture: 'Facturé',
    envoyee: 'Envoyée',
    payee: 'Payée',
    en_retard: 'En retard'
  };
  return labels[status] || status || '-';
};

/**
 * Fetch complete statement data for a client
 */
export const fetchClientStatementData = async (clientId, entrepriseId, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  
  // Fetch client info
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  
  // Fetch interventions for this client in this period
  const { data: interventions } = await supabase
    .from('interventions')
    .select('*, technicien:users!interventions_technicien_id_fkey(id, nom, prenom)')
    .eq('client_id', clientId)
    .eq('entreprise_id', entrepriseId)
    .gte('date_prevue', startISO.split('T')[0])
    .lte('date_prevue', endISO.split('T')[0])
    .order('date_prevue', { ascending: true });
  
  // Fetch photos for these interventions
  const interventionIds = (interventions || []).map(i => i.id);
  let photos = [];
  if (interventionIds.length > 0) {
    const { data: photosData } = await supabase
      .from('photos')
      .select('*')
      .in('intervention_id', interventionIds);
    photos = photosData || [];
  }
  
  // Fetch devis for this client in this period
  const { data: devis } = await supabase
    .from('devis')
    .select('*, lignes:devis_lignes(*)')
    .eq('client_id', clientId)
    .eq('entreprise_id', entrepriseId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: true });
  
  // Fetch factures for this client in this period
  const { data: factures } = await supabase
    .from('factures')
    .select('*, lignes:facture_lignes(*)')
    .eq('client_id', clientId)
    .eq('entreprise_id', entrepriseId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: true });
  
  // Fetch entreprise info
  const { data: entreprise } = await supabase
    .from('entreprises')
    .select('*')
    .eq('id', entrepriseId)
    .single();
  
  // Calculate totals
  const totalInterventions = interventions?.length || 0;
  const totalDuration = (interventions || []).reduce((sum, i) => sum + (i.duree_estimee || 0), 0);
  const totalPhotos = photos.length;
  const totalDevis = (devis || []).reduce((sum, d) => sum + (d.total_ttc || 0), 0);
  const totalFactures = (factures || []).reduce((sum, f) => sum + (f.total_ttc || 0), 0);
  const facturesPayees = (factures || []).filter(f => f.statut === 'payee');
  const totalPaye = facturesPayees.reduce((sum, f) => sum + (f.total_ttc || 0), 0);
  const facturesImpayees = (factures || []).filter(f => f.statut !== 'payee');
  const totalImpaye = facturesImpayees.reduce((sum, f) => sum + (f.total_ttc || 0), 0);
  
  return {
    client,
    entreprise,
    interventions: interventions || [],
    photos,
    devis: devis || [],
    factures: factures || [],
    period: { month, year, startDate, endDate },
    totals: {
      interventions: totalInterventions,
      duration: totalDuration,
      photos: totalPhotos,
      devis: totalDevis,
      factures: totalFactures,
      paye: totalPaye,
      impaye: totalImpaye
    }
  };
};

/**
 * Generate complete statement PDF
 */
export const generateStatementPDF = async (data) => {
  const { client, entreprise, interventions, photos, devis, factures, period, totals } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  const monthName = new Date(period.year, period.month - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
  
  // ============ PAGE 1: HEADER & SUMMARY ============
  
  // Company header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(entreprise?.nom || 'Entreprise', 20, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  if (entreprise?.adresse) doc.text(entreprise.adresse, 20, y);
  y += 5;
  if (entreprise?.telephone) doc.text(`Tél: ${entreprise.telephone}`, 20, y);
  
  // Title
  y = 20;
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text('RELEVÉ DE COMPTE', pageWidth - 20, y, { align: 'right' });
  y += 7;
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${period.year}`, pageWidth - 20, y, { align: 'right' });
  
  // Client info box
  y = 55;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y, pageWidth - 40, 30, 3, 3, 'F');
  
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(`${client?.nom || ''} ${client?.prenom || ''}`, 30, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (client?.adresse) doc.text(client.adresse, 30, y);
  y += 5;
  if (client?.email) doc.text(client.email, 30, y);
  if (client?.telephone) doc.text(client.telephone, 120, y);
  
  // Summary boxes
  y = 100;
  const boxWidth = (pageWidth - 50) / 4;
  
  // Box 1: Interventions
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, y, boxWidth, 35, 2, 2, 'F');
  doc.setFontSize(18);
  doc.setTextColor(22, 163, 74);
  doc.text(String(totals.interventions), 20 + boxWidth/2, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Interventions', 20 + boxWidth/2, y + 25, { align: 'center' });
  doc.text(formatDuration(totals.duration), 20 + boxWidth/2, y + 31, { align: 'center' });
  
  // Box 2: Photos
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(25 + boxWidth, y, boxWidth, 35, 2, 2, 'F');
  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246);
  doc.text(String(totals.photos), 25 + boxWidth + boxWidth/2, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Photos', 25 + boxWidth + boxWidth/2, y + 25, { align: 'center' });
  
  // Box 3: Devis
  doc.setFillColor(254, 249, 195);
  doc.roundedRect(30 + boxWidth*2, y, boxWidth, 35, 2, 2, 'F');
  doc.setFontSize(14);
  doc.setTextColor(161, 98, 7);
  doc.text(formatCurrency(totals.devis), 30 + boxWidth*2 + boxWidth/2, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Devis', 30 + boxWidth*2 + boxWidth/2, y + 25, { align: 'center' });
  doc.text(`${devis.length} devis`, 30 + boxWidth*2 + boxWidth/2, y + 31, { align: 'center' });
  
  // Box 4: Factures
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(35 + boxWidth*3, y, boxWidth, 35, 2, 2, 'F');
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(totals.factures), 35 + boxWidth*3 + boxWidth/2, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Factures', 35 + boxWidth*3 + boxWidth/2, y + 25, { align: 'center' });
  doc.text(`${factures.length} factures`, 35 + boxWidth*3 + boxWidth/2, y + 31, { align: 'center' });
  
  // Payment summary
  y = 150;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(pageWidth - 100, y, 80, 25, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(22, 163, 74);
  doc.text('Payé:', pageWidth - 95, y + 10);
  doc.setFontSize(12);
  doc.text(formatCurrency(totals.paye), pageWidth - 25, y + 10, { align: 'right' });
  
  if (totals.impaye > 0) {
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(pageWidth - 100, y + 28, 80, 25, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    doc.text('Reste à payer:', pageWidth - 95, y + 38);
    doc.setFontSize(12);
    doc.text(formatCurrency(totals.impaye), pageWidth - 25, y + 38, { align: 'right' });
  }
  
  // ============ INTERVENTIONS TABLE ============
  y = 210;
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Interventions', 20, y);
  
  y += 8;
  
  if (interventions.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucune intervention sur cette période', 20, y + 10);
    y += 20;
  } else {
    // Table header
    doc.setFillColor(30, 41, 59);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Date', 23, y + 5.5);
    doc.text('Titre', 50, y + 5.5);
    doc.text('Durée', 110, y + 5.5);
    doc.text('Photos', 135, y + 5.5);
    doc.text('Statut', 155, y + 5.5);
    doc.text('Technicien', pageWidth - 23, y + 5.5, { align: 'right' });
    
    y += 10;
    
    interventions.forEach((intervention, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...bgColor);
      doc.rect(20, y - 3, pageWidth - 40, 8, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(formatDate(intervention.date_prevue), 23, y + 2);
      doc.text((intervention.titre || '-').substring(0, 30), 50, y + 2);
      doc.text(formatDuration(intervention.duree_estimee), 110, y + 2);
      
      // Count photos for this intervention
      const interventionPhotos = photos.filter(p => p.intervention_id === intervention.id);
      doc.text(String(interventionPhotos.length), 138, y + 2);
      
      // Status with color
      const status = getStatusLabel(intervention.statut);
      if (intervention.statut === 'termine') {
        doc.setTextColor(22, 163, 74);
      } else if (intervention.statut === 'annule') {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(59, 130, 246);
      }
      doc.text(status, 155, y + 2);
      
      doc.setTextColor(100, 116, 139);
      const techName = intervention.technicien 
        ? `${intervention.technicien.prenom || ''} ${intervention.technicien.nom || ''}`.trim()
        : '-';
      doc.text(techName.substring(0, 15), pageWidth - 23, y + 2, { align: 'right' });
      
      y += 8;
    });
  }
  
  // ============ DEVIS TABLE ============
  y += 15;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Devis', 20, y);
  
  y += 8;
  
  if (devis.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun devis sur cette période', 20, y + 10);
    y += 20;
  } else {
    // Table header
    doc.setFillColor(161, 98, 7);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Date', 23, y + 5.5);
    doc.text('Numéro', 50, y + 5.5);
    doc.text('Statut', 100, y + 5.5);
    doc.text('Montant HT', 135, y + 5.5);
    doc.text('Montant TTC', pageWidth - 23, y + 5.5, { align: 'right' });
    
    y += 10;
    
    devis.forEach((d, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [254, 249, 195];
      doc.setFillColor(...bgColor);
      doc.rect(20, y - 3, pageWidth - 40, 8, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(formatDate(d.created_at), 23, y + 2);
      doc.text(d.numero_devis || '-', 50, y + 2);
      
      const status = getStatusLabel(d.statut);
      if (d.statut === 'signe') {
        doc.setTextColor(22, 163, 74);
      } else if (d.statut === 'refuse') {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(161, 98, 7);
      }
      doc.text(status, 100, y + 2);
      
      doc.setTextColor(30, 41, 59);
      doc.text(formatCurrency(d.total_ht), 135, y + 2);
      doc.text(formatCurrency(d.total_ttc), pageWidth - 23, y + 2, { align: 'right' });
      
      y += 8;
    });
  }
  
  // ============ FACTURES TABLE ============
  y += 15;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Factures', 20, y);
  
  y += 8;
  
  if (factures.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucune facture sur cette période', 20, y + 10);
    y += 20;
  } else {
    // Table header
    doc.setFillColor(59, 130, 246);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Date', 23, y + 5.5);
    doc.text('Numéro', 50, y + 5.5);
    doc.text('Statut', 100, y + 5.5);
    doc.text('Montant HT', 135, y + 5.5);
    doc.text('Montant TTC', pageWidth - 23, y + 5.5, { align: 'right' });
    
    y += 10;
    
    factures.forEach((f, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [239, 246, 255];
      doc.setFillColor(...bgColor);
      doc.rect(20, y - 3, pageWidth - 40, 8, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(formatDate(f.created_at), 23, y + 2);
      doc.text(f.numero_facture || '-', 50, y + 2);
      
      const status = getStatusLabel(f.statut);
      if (f.statut === 'payee') {
        doc.setTextColor(22, 163, 74);
      } else if (f.statut === 'en_retard') {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(59, 130, 246);
      }
      doc.text(status, 100, y + 2);
      
      doc.setTextColor(30, 41, 59);
      doc.text(formatCurrency(f.total_ht), 135, y + 2);
      doc.text(formatCurrency(f.total_ttc), pageWidth - 23, y + 2, { align: 'right' });
      
      y += 8;
    });
    
    // Totals row
    y += 5;
    doc.setFillColor(30, 41, 59);
    doc.rect(100, y - 3, pageWidth - 120, 10, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', 105, y + 3);
    doc.text(formatCurrency(totals.factures), pageWidth - 23, y + 3, { align: 'right' });
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Relevé généré le ${formatDate(new Date())} - Page ${i}/${pageCount} - ACTOOS PRO`,
      pageWidth / 2, 
      285, 
      { align: 'center' }
    );
  }
  
  return doc;
};

/**
 * Download statement PDF
 */
export const downloadStatementPDF = (doc, clientName, month, year) => {
  const filename = `releve_${clientName.replace(/\s+/g, '_')}_${month}_${year}.pdf`;
  doc.save(filename);
};

export default {
  fetchClientStatementData,
  generateStatementPDF,
  downloadStatementPDF
};
