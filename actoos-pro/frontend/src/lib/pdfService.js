/**
 * PDF Generation Service
 * Uses jsPDF for client-side PDF generation
 */
import { jsPDF } from 'jspdf';

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

// Helper to format date
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
};

/**
 * Generate Devis PDF
 */
export const generateDevisPDF = async (devis, entreprise, client) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  // Header - Entreprise info
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(entreprise?.nom || 'Entreprise', 20, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  if (entreprise?.adresse) doc.text(entreprise.adresse, 20, y);
  y += 5;
  if (entreprise?.telephone) doc.text(`Tél: ${entreprise.telephone}`, 20, y);
  y += 5;
  if (entreprise?.email) doc.text(entreprise.email, 20, y);
  
  // Devis title
  y += 15;
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`DEVIS ${devis.numero_devis || ''}`, pageWidth - 20, 30, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(devis.created_at)}`, pageWidth - 20, 38, { align: 'right' });
  doc.text(`Validité: ${devis.validite_jours || 30} jours`, pageWidth - 20, 44, { align: 'right' });
  
  // Client info
  y += 5;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(pageWidth - 90, y, 70, 35, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Client:', pageWidth - 85, y + 8);
  doc.setFontSize(11);
  doc.text(`${client?.nom || ''} ${client?.prenom || ''}`, pageWidth - 85, y + 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (client?.adresse) doc.text(client.adresse, pageWidth - 85, y + 22);
  if (client?.email) doc.text(client.email, pageWidth - 85, y + 28);
  
  // Lines table
  y += 50;
  
  // Table header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(20, y, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Description', 25, y + 7);
  doc.text('Qté', 110, y + 7);
  doc.text('Prix unit. HT', 125, y + 7);
  doc.text('TVA', 155, y + 7);
  doc.text('Total HT', 175, y + 7, { align: 'right' });
  
  y += 12;
  doc.setTextColor(30, 41, 59);
  
  // Table rows
  const lignes = devis.lignes || [];
  lignes.forEach((ligne, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...bgColor);
    doc.rect(20, y - 4, pageWidth - 40, 10, 'F');
    
    doc.setFontSize(9);
    const description = (ligne.description || '').substring(0, 50);
    doc.text(description, 25, y + 2);
    doc.text(String(ligne.quantite || 1), 112, y + 2);
    doc.text(formatCurrency(ligne.prix_unitaire), 125, y + 2);
    doc.text(`${ligne.tva || 0}%`, 157, y + 2);
    const lineTotal = (ligne.quantite || 1) * (ligne.prix_unitaire || 0);
    doc.text(formatCurrency(lineTotal), 175, y + 2, { align: 'right' });
    
    y += 10;
  });
  
  // Totals
  y += 10;
  doc.setFillColor(248, 250, 252);
  doc.rect(pageWidth - 80, y, 60, 35, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Total HT:', pageWidth - 75, y + 10);
  doc.text('TVA:', pageWidth - 75, y + 18);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(12);
  doc.text('Total TTC:', pageWidth - 75, y + 28);
  
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(formatCurrency(devis.total_ht), pageWidth - 25, y + 10, { align: 'right' });
  doc.text(formatCurrency(devis.total_tva), pageWidth - 25, y + 18, { align: 'right' });
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(devis.total_ttc), pageWidth - 25, y + 28, { align: 'right' });
  
  // Conditions
  if (devis.conditions) {
    y += 50;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Conditions:', 20, y);
    y += 5;
    doc.setTextColor(30, 41, 59);
    const conditionsLines = doc.splitTextToSize(devis.conditions, pageWidth - 40);
    doc.text(conditionsLines, 20, y);
  }
  
  // Signature area if signed
  if (devis.signature_client) {
    y += 30;
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Devis signé', 20, y);
    doc.setTextColor(100, 116, 139);
    doc.text(`Par: ${devis.nom_signataire || 'Client'}`, 20, y + 6);
    doc.text(`Le: ${formatDate(devis.date_signature)}`, 20, y + 12);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Généré le ${formatDate(new Date())} - ACTOOS PRO`, pageWidth / 2, 285, { align: 'center' });
  
  return doc;
};

/**
 * Generate Multi-Options Devis PDF
 * Displays multiple pricing options side by side
 */
export const generateMultiOptionsDevisPDF = async (devis, entreprise, client) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;
  
  const options = devis.options || [];
  const optionCount = options.length;
  
  // Header - Entreprise info
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(entreprise?.nom || 'Entreprise', 20, y);
  
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (entreprise?.adresse) doc.text(entreprise.adresse, 20, y);
  y += 4;
  if (entreprise?.telephone) doc.text(`Tél: ${entreprise.telephone}`, 20, y);
  
  // Devis title
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text(`DEVIS ${devis.numero_devis || ''} - OPTIONS COMPARATIVES`, pageWidth - 20, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(devis.created_at)} | Validité: ${devis.validite_jours || 30} jours`, pageWidth - 20, 28, { align: 'right' });
  
  // Client info
  doc.setFillColor(248, 250, 252);
  doc.rect(pageWidth - 85, 35, 65, 25, 'F');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Client:', pageWidth - 80, 42);
  doc.setFontSize(9);
  doc.text(`${client?.nom || ''} ${client?.prenom || ''}`, pageWidth - 80, 48);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (client?.email) doc.text(client.email, pageWidth - 80, 54);
  
  // Options columns
  y = 70;
  const colWidth = (pageWidth - 40) / optionCount;
  const colGap = 5;
  
  // Option colors
  const colorMap = {
    slate: { bg: [248, 250, 252], accent: [100, 116, 139] },
    blue: { bg: [239, 246, 255], accent: [59, 130, 246] },
    amber: { bg: [255, 251, 235], accent: [245, 158, 11] },
    emerald: { bg: [236, 253, 245], accent: [16, 185, 129] },
    purple: { bg: [250, 245, 255], accent: [168, 85, 247] },
  };
  
  options.forEach((option, index) => {
    const x = 20 + (index * colWidth);
    const colors = colorMap[option.color] || colorMap.slate;
    
    // Option header
    doc.setFillColor(...colors.bg);
    doc.rect(x, y, colWidth - colGap, 25, 'F');
    
    // Recommended badge
    if (option.recommended) {
      doc.setFillColor(...colors.accent);
      doc.rect(x + (colWidth - colGap) / 2 - 20, y - 5, 40, 8, 'F');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text('RECOMMANDE', x + (colWidth - colGap) / 2, y - 1, { align: 'center' });
    }
    
    // Option name
    doc.setFontSize(12);
    doc.setTextColor(...colors.accent);
    doc.text(option.name || `Option ${index + 1}`, x + (colWidth - colGap) / 2, y + 10, { align: 'center' });
    
    // Option description
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const desc = option.description || '';
    doc.text(desc.substring(0, 35), x + (colWidth - colGap) / 2, y + 18, { align: 'center' });
  });
  
  // Lines table for each option
  y += 35;
  
  // Table header
  options.forEach((option, index) => {
    const x = 20 + (index * colWidth);
    
    doc.setFillColor(30, 41, 59);
    doc.rect(x, y, colWidth - colGap, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('Description', x + 3, y + 5);
    doc.text('Qte', x + colWidth - colGap - 35, y + 5);
    doc.text('Total HT', x + colWidth - colGap - 5, y + 5, { align: 'right' });
  });
  
  y += 10;
  
  // Find max lines
  const maxLines = Math.max(...options.map(o => (o.lignes || []).length));
  
  // Table rows
  for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }
    
    options.forEach((option, optIndex) => {
      const x = 20 + (optIndex * colWidth);
      const ligne = (option.lignes || [])[lineIdx];
      
      const bgColor = lineIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...bgColor);
      doc.rect(x, y - 3, colWidth - colGap, 8, 'F');
      
      if (ligne) {
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        const desc = (ligne.description || '').substring(0, 25);
        doc.text(desc, x + 3, y + 2);
        doc.text(String(ligne.quantite || 1), x + colWidth - colGap - 35, y + 2);
        const lineTotal = (ligne.quantite || 1) * (ligne.prix_unitaire || 0);
        doc.text(formatCurrency(lineTotal), x + colWidth - colGap - 5, y + 2, { align: 'right' });
      }
    });
    
    y += 8;
  }
  
  // Totals for each option
  y += 10;
  options.forEach((option, index) => {
    const x = 20 + (index * colWidth);
    const colors = colorMap[option.color] || colorMap.slate;
    const lignes = option.lignes || [];
    
    const total_ht = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0)), 0);
    const total_tva = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0) * (l.tva || 0) / 100), 0);
    const total_ttc = total_ht + total_tva;
    
    doc.setFillColor(...colors.bg);
    doc.rect(x, y, colWidth - colGap, 30, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Total HT:', x + 5, y + 8);
    doc.text('TVA:', x + 5, y + 15);
    
    doc.setTextColor(30, 41, 59);
    doc.text(formatCurrency(total_ht), x + colWidth - colGap - 5, y + 8, { align: 'right' });
    doc.text(formatCurrency(total_tva), x + colWidth - colGap - 5, y + 15, { align: 'right' });
    
    // Total TTC - highlighted
    doc.setFillColor(...colors.accent);
    doc.rect(x, y + 20, colWidth - colGap, 10, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Total TTC', x + 5, y + 27);
    doc.text(formatCurrency(total_ttc), x + colWidth - colGap - 5, y + 27, { align: 'right' });
  });
  
  // Conditions
  if (devis.conditions) {
    y += 45;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Conditions:', 20, y);
    y += 4;
    doc.setTextColor(30, 41, 59);
    const conditionsLines = doc.splitTextToSize(devis.conditions, pageWidth - 40);
    doc.text(conditionsLines.slice(0, 3), 20, y);
  }
  
  // Signature if signed
  if (devis.signature_client) {
    y = pageHeight - 35;
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('Devis signe', 20, y);
    doc.setTextColor(100, 116, 139);
    doc.text(`Par: ${devis.nom_signataire || 'Client'} | Le: ${formatDate(devis.date_signature)}`, 20, y + 5);
  }
  
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Genere le ${formatDate(new Date())} - ACTOOS PRO`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  return doc;
};

/**
 * Generate Facture PDF
 */
export const generateFacturePDF = async (facture, entreprise, client) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  // Header - Entreprise info
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(entreprise?.nom || 'Entreprise', 20, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  if (entreprise?.adresse) doc.text(entreprise.adresse, 20, y);
  y += 5;
  if (entreprise?.telephone) doc.text(`Tél: ${entreprise.telephone}`, 20, y);
  y += 5;
  if (entreprise?.email) doc.text(entreprise.email, 20, y);
  if (entreprise?.siret) {
    y += 5;
    doc.text(`SIRET: ${entreprise.siret}`, 20, y);
  }
  
  // Facture title
  doc.setFontSize(16);
  doc.setTextColor(59, 130, 246); // blue-500
  doc.text(`FACTURE ${facture.numero_facture || ''}`, pageWidth - 20, 30, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(facture.created_at)}`, pageWidth - 20, 38, { align: 'right' });
  if (facture.echeance_jours) {
    const echeance = new Date(facture.created_at);
    echeance.setDate(echeance.getDate() + facture.echeance_jours);
    doc.text(`Échéance: ${formatDate(echeance)}`, pageWidth - 20, 44, { align: 'right' });
  }
  
  // Status badge
  y = 50;
  const statusColors = {
    brouillon: [148, 163, 184],
    envoyee: [59, 130, 246],
    payee: [16, 185, 129],
    en_retard: [239, 68, 68]
  };
  const statusColor = statusColors[facture.statut] || [148, 163, 184];
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 50, y, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(facture.statut?.toUpperCase() || 'BROUILLON', pageWidth - 35, y + 5.5, { align: 'center' });
  
  // Client info
  y += 15;
  doc.setFillColor(248, 250, 252);
  doc.rect(pageWidth - 90, y, 70, 35, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Facturé à:', pageWidth - 85, y + 8);
  doc.setFontSize(11);
  doc.text(`${client?.nom || ''} ${client?.prenom || ''}`, pageWidth - 85, y + 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (client?.adresse) doc.text(client.adresse, pageWidth - 85, y + 22);
  if (client?.email) doc.text(client.email, pageWidth - 85, y + 28);
  
  // Lines table
  y += 50;
  
  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(20, y, pageWidth - 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Description', 25, y + 7);
  doc.text('Qté', 110, y + 7);
  doc.text('Prix unit. HT', 125, y + 7);
  doc.text('TVA', 155, y + 7);
  doc.text('Total HT', 175, y + 7, { align: 'right' });
  
  y += 12;
  doc.setTextColor(30, 41, 59);
  
  // Table rows
  const lignes = facture.lignes || [];
  lignes.forEach((ligne, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...bgColor);
    doc.rect(20, y - 4, pageWidth - 40, 10, 'F');
    
    doc.setFontSize(9);
    const description = (ligne.description || '').substring(0, 50);
    doc.text(description, 25, y + 2);
    doc.text(String(ligne.quantite || 1), 112, y + 2);
    doc.text(formatCurrency(ligne.prix_unitaire), 125, y + 2);
    doc.text(`${ligne.tva || 0}%`, 157, y + 2);
    const lineTotal = (ligne.quantite || 1) * (ligne.prix_unitaire || 0);
    doc.text(formatCurrency(lineTotal), 175, y + 2, { align: 'right' });
    
    y += 10;
  });
  
  // Totals
  y += 10;
  doc.setFillColor(248, 250, 252);
  doc.rect(pageWidth - 80, y, 60, 35, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Total HT:', pageWidth - 75, y + 10);
  doc.text('TVA:', pageWidth - 75, y + 18);
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(12);
  doc.text('Total TTC:', pageWidth - 75, y + 28);
  
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(formatCurrency(facture.total_ht), pageWidth - 25, y + 10, { align: 'right' });
  doc.text(formatCurrency(facture.total_tva), pageWidth - 25, y + 18, { align: 'right' });
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text(formatCurrency(facture.total_ttc), pageWidth - 25, y + 28, { align: 'right' });
  
  // Payment info
  y += 50;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Conditions de paiement:', 20, y);
  y += 5;
  doc.setTextColor(30, 41, 59);
  doc.text(facture.conditions_paiement || 'Paiement à réception de facture', 20, y);
  
  // Mentions légales
  y += 15;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  if (entreprise?.mentions_legales) {
    const mentionsLines = doc.splitTextToSize(entreprise.mentions_legales, pageWidth - 40);
    doc.text(mentionsLines, 20, y);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Généré le ${formatDate(new Date())} - ACTOOS PRO`, pageWidth / 2, 285, { align: 'center' });
  
  return doc;
};

/**
 * Generate Intervention Report PDF
 */
export const generateInterventionPDF = async (intervention, entreprise, client) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(entreprise?.nom || 'Entreprise', 20, y);
  
  y += 15;
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129);
  doc.text('RAPPORT D\'INTERVENTION', 20, y);
  
  // Intervention details
  y += 15;
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(intervention.titre || 'Intervention', 20, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date prévue: ${formatDate(intervention.date_prevue)}`, 20, y);
  y += 6;
  doc.text(`Statut: ${intervention.statut}`, 20, y);
  
  // Client info
  y += 15;
  doc.setFillColor(248, 250, 252);
  doc.rect(20, y, pageWidth - 40, 30, 'F');
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Client:', 25, y);
  doc.setFontSize(11);
  doc.text(`${client?.nom || ''} ${client?.prenom || ''}`, 60, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Adresse:', 25, y);
  doc.text(`${intervention.adresse || ''}, ${intervention.code_postal || ''} ${intervention.ville || ''}`, 60, y);
  y += 7;
  if (client?.telephone) {
    doc.text('Téléphone:', 25, y);
    doc.text(client.telephone, 60, y);
  }
  
  // Description
  y += 20;
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Description:', 20, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  if (intervention.description) {
    const descLines = doc.splitTextToSize(intervention.description, pageWidth - 40);
    doc.text(descLines, 20, y);
    y += descLines.length * 5;
  }
  
  // Rapport technicien
  if (intervention.rapport || intervention.notes_technicien) {
    y += 15;
    doc.setFillColor(240, 253, 244); // green-50
    doc.rect(20, y, pageWidth - 40, 40, 'F');
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74); // green-600
    doc.text('Rapport du technicien:', 25, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const rapport = intervention.rapport || intervention.notes_technicien || '';
    const rapportLines = doc.splitTextToSize(rapport, pageWidth - 50);
    doc.text(rapportLines, 25, y);
  }
  
  // Signature
  if (intervention.signature_client) {
    y += 50;
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Intervention validée par le client', 20, y);
    y += 6;
    doc.setTextColor(100, 116, 139);
    doc.text(`Signé par: ${intervention.nom_signataire || 'Client'}`, 20, y);
    y += 5;
    doc.text(`Date: ${formatDate(intervention.date_signature)}`, 20, y);
    
    // Try to add signature image
    try {
      if (intervention.signature_client.startsWith('data:image')) {
        doc.addImage(intervention.signature_client, 'PNG', 20, y + 5, 60, 20);
      }
    } catch (e) {
      console.warn('Could not add signature image to PDF');
    }
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Généré le ${formatDate(new Date())} - ACTOOS PRO`, pageWidth / 2, 285, { align: 'center' });
  
  return doc;
};

/**
 * Download PDF
 */
export const downloadPDF = (doc, filename) => {
  doc.save(filename);
};

/**
 * Open PDF in new tab
 */
export const openPDF = (doc) => {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

export default {
  generateDevisPDF,
  generateFacturePDF,
  generateInterventionPDF,
  downloadPDF,
  openPDF
};
