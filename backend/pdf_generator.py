"""
PDF Generation for Devis and Factures using ReportLab
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from datetime import datetime, timezone, timedelta
import base64
import logging

logger = logging.getLogger(__name__)

def get_local_time(iso_string: str, offset_hours: int = 1) -> datetime:
    """Convert UTC ISO string to local time (default Paris +1)"""
    try:
        if iso_string:
            dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
            return dt + timedelta(hours=offset_hours)
        return datetime.now()
    except:
        return datetime.now()

def decode_signature_image(signature_base64: str) -> BytesIO:
    """Decode base64 signature to image BytesIO"""
    try:
        if signature_base64 and signature_base64.startswith('data:image'):
            # Remove data URL prefix
            base64_data = signature_base64.split(',')[1]
            image_data = base64.b64decode(base64_data)
            return BytesIO(image_data)
    except Exception as e:
        logger.error(f"Error decoding signature: {e}")
    return None

def generate_devis_pdf(devis: dict, client: dict, entreprise: dict) -> bytes:
    """Generate PDF for a devis/quote"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', alignment=TA_RIGHT, fontSize=10))
    styles.add(ParagraphStyle(name='DocTitle', alignment=TA_CENTER, fontSize=18, spaceAfter=20, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Subtitle', alignment=TA_LEFT, fontSize=12, spaceAfter=10, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Normal10', fontSize=10, leading=14))
    styles.add(ParagraphStyle(name='Small', fontSize=9, textColor=colors.grey))
    
    elements = []
    
    # Header with company info
    company_info = f"""
    <b>{entreprise.get('nom', '')}</b><br/>
    {entreprise.get('adresse', '')}<br/>
    {entreprise.get('code_postal', '')} {entreprise.get('ville', '')}<br/>
    Tél: {entreprise.get('telephone', '')}<br/>
    Email: {entreprise.get('email', '')}<br/>
    SIRET: {entreprise.get('siret', '')}
    """
    elements.append(Paragraph(company_info, styles['Normal10']))
    elements.append(Spacer(1, 15*mm))
    
    # Title
    elements.append(Paragraph(f"DEVIS N° {devis.get('numero_devis', '')}", styles['DocTitle']))
    elements.append(Spacer(1, 5*mm))
    
    # Date and validity
    date_str = get_local_time(devis.get('created_at')).strftime('%d/%m/%Y')
    exp_date = devis.get('date_expiration')
    exp_str = get_local_time(exp_date).strftime('%d/%m/%Y') if exp_date else ""
    elements.append(Paragraph(f"Date: {date_str} | Validité: {exp_str}", styles['RightAlign']))
    elements.append(Spacer(1, 10*mm))
    
    # Client info
    client_info = f"""
    <b>Client:</b><br/>
    {client.get('nom', '')} {client.get('prenom', '')}<br/>
    {client.get('adresse', '')}<br/>
    {client.get('code_postal', '')} {client.get('ville', '')}<br/>
    Tél: {client.get('telephone', '')}<br/>
    Email: {client.get('email', '')}
    """
    elements.append(Paragraph(client_info, styles['Normal10']))
    elements.append(Spacer(1, 10*mm))
    
    # Lines table
    table_data = [['Description', 'Qté', 'Prix Unit. HT', 'TVA %', 'Total HT']]
    
    for ligne in devis.get('lignes', []):
        total_ligne = ligne.get('quantite', 1) * ligne.get('prix_unitaire', 0)
        table_data.append([
            ligne.get('description', ''),
            str(ligne.get('quantite', 1)),
            f"{ligne.get('prix_unitaire', 0):.2f} €",
            f"{ligne.get('tva', 20):.0f}%",
            f"{total_ligne:.2f} €"
        ])
    
    table = Table(table_data, colWidths=[90*mm, 15*mm, 25*mm, 15*mm, 25*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 5*mm))
    
    # Totals
    totals_data = [
        ['', '', '', 'Total HT:', f"{devis.get('total_ht', 0):.2f} €"],
        ['', '', '', 'TVA:', f"{devis.get('total_tva', 0):.2f} €"],
        ['', '', '', 'Total TTC:', f"{devis.get('total_ttc', 0):.2f} €"],
    ]
    totals_table = Table(totals_data, colWidths=[90*mm, 15*mm, 25*mm, 20*mm, 25*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (3, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LINEABOVE', (3, -1), (-1, -1), 1, colors.HexColor('#0F172A')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 10*mm))
    
    # Conditions
    if devis.get('conditions'):
        elements.append(Paragraph("<b>Conditions:</b>", styles['Subtitle']))
        elements.append(Paragraph(devis.get('conditions', ''), styles['Small']))
        elements.append(Spacer(1, 5*mm))
    
    # Signature area
    if devis.get('statut') == 'signe' and devis.get('signature_client'):
        elements.append(Paragraph("<b>Bon pour accord - Signature client:</b>", styles['Subtitle']))
        sig_date = get_local_time(devis.get('date_signature'))
        elements.append(Paragraph(f"Signé par: {devis.get('nom_signataire', '')} le {sig_date.strftime('%d/%m/%Y à %H:%M')}", styles['Small']))
        
        # Add signature image
        signature_image = decode_signature_image(devis.get('signature_client'))
        if signature_image:
            try:
                img = Image(signature_image, width=60*mm, height=25*mm)
                elements.append(Spacer(1, 3*mm))
                elements.append(img)
            except Exception as e:
                logger.warning(f"Could not add signature image: {e}")
    else:
        elements.append(Spacer(1, 20*mm))
        elements.append(Paragraph("Bon pour accord - Signature client:", styles['Subtitle']))
        elements.append(Spacer(1, 20*mm))
        elements.append(Paragraph("Date: ____________    Signature: ____________", styles['Normal10']))
    
    doc.build(elements)
    return buffer.getvalue()


def generate_facture_pdf(facture: dict, client: dict, entreprise: dict) -> bytes:
    """Generate PDF for an invoice"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', alignment=TA_RIGHT, fontSize=10))
    styles.add(ParagraphStyle(name='DocTitle', alignment=TA_CENTER, fontSize=18, spaceAfter=20, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Subtitle', alignment=TA_LEFT, fontSize=12, spaceAfter=10, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Normal10', fontSize=10, leading=14))
    styles.add(ParagraphStyle(name='Small', fontSize=9, textColor=colors.grey))
    
    elements = []
    
    # Header with company info
    company_info = f"""
    <b>{entreprise.get('nom', '')}</b><br/>
    {entreprise.get('adresse', '')}<br/>
    {entreprise.get('code_postal', '')} {entreprise.get('ville', '')}<br/>
    Tél: {entreprise.get('telephone', '')}<br/>
    Email: {entreprise.get('email', '')}<br/>
    SIRET: {entreprise.get('siret', '')}<br/>
    TVA Intra: {entreprise.get('tva_intra', '')}
    """
    elements.append(Paragraph(company_info, styles['Normal10']))
    elements.append(Spacer(1, 15*mm))
    
    # Title
    elements.append(Paragraph(f"FACTURE N° {facture.get('numero_facture', '')}", styles['DocTitle']))
    elements.append(Spacer(1, 5*mm))
    
    # Date and due date
    date_str = get_local_time(facture.get('created_at')).strftime('%d/%m/%Y')
    due_date = facture.get('date_echeance')
    due_str = get_local_time(due_date).strftime('%d/%m/%Y') if due_date else ""
    elements.append(Paragraph(f"Date: {date_str} | Échéance: {due_str}", styles['RightAlign']))
    elements.append(Spacer(1, 10*mm))
    
    # Client info
    client_info = f"""
    <b>Client:</b><br/>
    {client.get('nom', '')} {client.get('prenom', '')}<br/>
    {client.get('adresse', '')}<br/>
    {client.get('code_postal', '')} {client.get('ville', '')}<br/>
    Tél: {client.get('telephone', '')}<br/>
    Email: {client.get('email', '')}
    """
    elements.append(Paragraph(client_info, styles['Normal10']))
    elements.append(Spacer(1, 10*mm))
    
    # Lines table
    table_data = [['Description', 'Qté', 'Prix Unit. HT', 'TVA %', 'Total HT']]
    
    for ligne in facture.get('lignes', []):
        total_ligne = ligne.get('quantite', 1) * ligne.get('prix_unitaire', 0)
        table_data.append([
            ligne.get('description', ''),
            str(ligne.get('quantite', 1)),
            f"{ligne.get('prix_unitaire', 0):.2f} €",
            f"{ligne.get('tva', 20):.0f}%",
            f"{total_ligne:.2f} €"
        ])
    
    table = Table(table_data, colWidths=[90*mm, 15*mm, 25*mm, 15*mm, 25*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 5*mm))
    
    # Totals
    totals_data = [
        ['', '', '', 'Total HT:', f"{facture.get('total_ht', 0):.2f} €"],
        ['', '', '', 'TVA:', f"{facture.get('total_tva', 0):.2f} €"],
        ['', '', '', 'Total TTC:', f"{facture.get('total_ttc', 0):.2f} €"],
    ]
    totals_table = Table(totals_data, colWidths=[90*mm, 15*mm, 25*mm, 20*mm, 25*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (3, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LINEABOVE', (3, -1), (-1, -1), 1, colors.HexColor('#0F172A')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 10*mm))
    
    # Payment info
    elements.append(Paragraph("<b>Conditions de paiement:</b>", styles['Subtitle']))
    elements.append(Paragraph(facture.get('conditions_paiement', 'Paiement à réception de facture.'), styles['Small']))
    if facture.get('mode_paiement'):
        elements.append(Paragraph(f"Mode de paiement: {facture.get('mode_paiement')}", styles['Small']))
    
    # Status
    statut = facture.get('statut', 'brouillon')
    if statut == 'payee':
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph("<b>PAYÉE</b>", ParagraphStyle(name='Paid', alignment=TA_CENTER, fontSize=16, textColor=colors.HexColor('#059669'), fontName='Helvetica-Bold')))
        if facture.get('date_paiement'):
            pay_date = get_local_time(facture.get('date_paiement'))
            elements.append(Paragraph(f"Payée le {pay_date.strftime('%d/%m/%Y')}", styles['Small']))
    
    doc.build(elements)
    return buffer.getvalue()
