"""
PDF Generation for Devis and Factures using ReportLab
With QR Code payment, company logo, and multi-currency support
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
import qrcode
import requests

from currency_utils import format_currency_for_pdf

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
        if not signature_base64:
            return None
            
        if signature_base64.startswith('data:image'):
            # Remove data URL prefix
            base64_data = signature_base64.split(',')[1]
        else:
            base64_data = signature_base64
            
        image_data = base64.b64decode(base64_data)
        
        # Validate the image is readable
        from PIL import Image as PILImage
        img_buffer = BytesIO(image_data)
        pil_img = PILImage.open(img_buffer)
        
        # Convert to RGB if necessary (removes alpha channel issues)
        if pil_img.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = PILImage.new('RGB', pil_img.size, (255, 255, 255))
            if pil_img.mode == 'P':
                pil_img = pil_img.convert('RGBA')
            if pil_img.mode in ('RGBA', 'LA'):
                background.paste(pil_img, mask=pil_img.split()[-1])
            pil_img = background
        elif pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        
        # Save to new buffer as PNG
        output_buffer = BytesIO()
        pil_img.save(output_buffer, format='PNG')
        output_buffer.seek(0)
        return output_buffer
        
    except Exception as e:
        logger.warning(f"Error decoding signature: {e}")
        return None

def generate_qr_code(data: str, size: int = 100) -> BytesIO:
    """Generate QR code image from data string"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer
    except Exception as e:
        logger.error(f"Error generating QR code: {e}")
        return None

def load_logo_image(logo_url: str, max_width: int = 150, max_height: int = 60) -> Image:
    """Load company logo from URL and return ReportLab Image"""
    try:
        if not logo_url:
            return None
        
        # Check if it's an Emergent storage URL
        if "integrations.emergentagent.com/objstore" in logo_url:
            # Extract path from URL and use storage API
            from storage import get_object
            # URL format: .../objects/logos/xxx.png -> path: logos/xxx.png
            path = logo_url.split("/objects/")[-1] if "/objects/" in logo_url else None
            if path:
                content, content_type = get_object(path)
                if content:
                    img_buffer = BytesIO(content)
                    img = Image(img_buffer)
                    
                    # Scale to fit within max dimensions while maintaining aspect ratio
                    aspect = img.imageWidth / img.imageHeight
                    if img.imageWidth > max_width:
                        img.drawWidth = max_width
                        img.drawHeight = max_width / aspect
                    if img.drawHeight > max_height:
                        img.drawHeight = max_height
                        img.drawWidth = max_height * aspect
                    
                    return img
        else:
            # Regular URL - download directly
            response = requests.get(logo_url, timeout=5)
            if response.status_code == 200:
                img_buffer = BytesIO(response.content)
                img = Image(img_buffer)
                
                # Scale to fit within max dimensions while maintaining aspect ratio
                aspect = img.imageWidth / img.imageHeight
                if img.imageWidth > max_width:
                    img.drawWidth = max_width
                    img.drawHeight = max_width / aspect
                if img.drawHeight > max_height:
                    img.drawHeight = max_height
                    img.drawWidth = max_height * aspect
                
                return img
    except Exception as e:
        logger.error(f"Error loading logo: {e}")
    return None


def load_photo_image(photo_url: str, max_width: int = 170, max_height: int = 120) -> Image:
    """Load intervention photo from URL and return ReportLab Image for embedding in PDF"""
    try:
        if not photo_url:
            return None
        
        img_buffer = None
        
        # Check if it's an Emergent storage URL
        if "integrations.emergentagent.com/objstore" in photo_url:
            from storage import get_object
            path = photo_url.split("/objects/")[-1] if "/objects/" in photo_url else None
            if path:
                content, content_type = get_object(path)
                if content:
                    img_buffer = BytesIO(content)
        else:
            # Regular URL - download directly
            response = requests.get(photo_url, timeout=10)
            if response.status_code == 200:
                img_buffer = BytesIO(response.content)
        
        if img_buffer:
            img = Image(img_buffer)
            
            # Scale to fit within max dimensions while maintaining aspect ratio
            if img.imageWidth > 0 and img.imageHeight > 0:
                aspect = img.imageWidth / img.imageHeight
                if img.imageWidth > max_width:
                    img.drawWidth = max_width
                    img.drawHeight = max_width / aspect
                if img.drawHeight > max_height:
                    img.drawHeight = max_height
                    img.drawWidth = max_height * aspect
                return img
    except Exception as e:
        logger.error(f"Error loading photo: {e}")
    return None


def build_photos_section(photos: list, styles: dict, max_photos: int = 6) -> list:
    """Build a section with intervention photos arranged in a grid"""
    elements = []
    
    if not photos:
        return elements
    
    # Limit number of photos
    photos_to_include = photos[:max_photos]
    
    # Add section title
    elements.append(Spacer(1, 15*mm))
    elements.append(Paragraph("Photos de l'intervention", styles['Subtitle']))
    elements.append(Spacer(1, 5*mm))
    
    # Load all photos
    photo_images = []
    for photo in photos_to_include:
        photo_url = photo.get('url') or photo.get('storage_path')
        if photo_url:
            img = load_photo_image(photo_url, max_width=80*mm, max_height=60*mm)
            if img:
                caption = photo.get('type_photo', '') or photo.get('description', '')
                photo_images.append((img, caption))
    
    if not photo_images:
        return elements
    
    # Create 2-column grid
    rows = []
    for i in range(0, len(photo_images), 2):
        row = []
        for j in range(2):
            if i + j < len(photo_images):
                img, caption = photo_images[i + j]
                cell_content = [img]
                if caption:
                    cell_content.append(Paragraph(f"<i>{caption}</i>", styles.get('Small', styles['Normal'])))
                # Create a small table for each photo cell
                cell_table = Table([[c] for c in cell_content], colWidths=[85*mm])
                cell_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                row.append(cell_table)
            else:
                row.append('')
        rows.append(row)
    
    if rows:
        photos_table = Table(rows, colWidths=[85*mm, 85*mm])
        photos_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5*mm),
        ]))
        elements.append(photos_table)
    
    if len(photos) > max_photos:
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(f"<i>+ {len(photos) - max_photos} autres photos disponibles dans l'application</i>", styles.get('Small', styles['Normal'])))
    
    return elements


def build_signature_section(signature_data: str, signer_name: str, signature_date: str, styles: dict) -> list:
    """Build a section with client signature"""
    elements = []
    
    if not signature_data:
        return elements
    
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph("Signature du client", styles['Subtitle']))
    
    # Decode and add signature image
    sig_buffer = decode_signature_image(signature_data)
    if sig_buffer:
        sig_img = Image(sig_buffer)
        # Scale signature
        if sig_img.imageWidth > 0:
            aspect = sig_img.imageWidth / sig_img.imageHeight
            sig_img.drawWidth = min(60*mm, sig_img.imageWidth)
            sig_img.drawHeight = sig_img.drawWidth / aspect
        elements.append(sig_img)
    
    # Add signer info
    sig_info = []
    if signer_name:
        sig_info.append(f"<b>{signer_name}</b>")
    if signature_date:
        try:
            dt = get_local_time(signature_date)
            sig_info.append(f"Signé le {dt.strftime('%d/%m/%Y à %H:%M')}")
        except:
            pass
    
    if sig_info:
        elements.append(Spacer(1, 2*mm))
        elements.append(Paragraph("<br/>".join(sig_info), styles.get('Small', styles['Normal'])))
    
    return elements

def build_payment_qr_data(facture: dict, entreprise: dict, portal_url: str = None) -> str:
    """Build payment data string for QR code"""
    # If we have a portal URL, use that for easy payment
    if portal_url:
        return portal_url
    
    # Otherwise, build a payment reference string
    # Format: Company | Invoice Number | Amount | IBAN (if available)
    parts = [
        f"Facture: {facture.get('numero_facture', '')}",
        f"Montant: {facture.get('total_ttc', 0):.2f} EUR",
        f"Entreprise: {entreprise.get('nom', '')}",
    ]
    
    if entreprise.get('iban'):
        parts.append(f"IBAN: {entreprise.get('iban')}")
    
    return "\n".join(parts)

def generate_devis_pdf(devis: dict, client: dict, entreprise: dict) -> bytes:
    """Generate PDF for a devis/quote with company logo and multi-currency support"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    
    # Get currency from entreprise
    devise = entreprise.get('devise', 'EUR')
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', alignment=TA_RIGHT, fontSize=10))
    styles.add(ParagraphStyle(name='DocTitle', alignment=TA_CENTER, fontSize=18, spaceAfter=20, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Subtitle', alignment=TA_LEFT, fontSize=12, spaceAfter=10, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Normal10', fontSize=10, leading=14))
    styles.add(ParagraphStyle(name='Small', fontSize=9, textColor=colors.grey))
    
    elements = []
    
    # Header with logo and company info
    logo_img = load_logo_image(entreprise.get('logo_url'))
    
    company_info = f"""
    <b>{entreprise.get('nom', '')}</b><br/>
    {entreprise.get('adresse', '')}<br/>
    {entreprise.get('code_postal', '')} {entreprise.get('ville', '')}<br/>
    Tél: {entreprise.get('telephone', '')}<br/>
    Email: {entreprise.get('email', '')}<br/>
    SIRET: {entreprise.get('siret', '')}
    """
    
    if logo_img:
        # Create a table with logo on left and company info on right
        header_table = Table([
            [logo_img, Paragraph(company_info, styles['Normal10'])]
        ], colWidths=[60*mm, 100*mm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        elements.append(header_table)
    else:
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
            format_currency_for_pdf(ligne.get('prix_unitaire', 0), devise),
            f"{ligne.get('tva', 20):.0f}%",
            format_currency_for_pdf(total_ligne, devise)
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
    
    # Totals with currency formatting
    totals_data = [
        ['', '', '', 'Total HT:', format_currency_for_pdf(devis.get('total_ht', 0), devise)],
        ['', '', '', 'TVA:', format_currency_for_pdf(devis.get('total_tva', 0), devise)],
        ['', '', '', 'Total TTC:', format_currency_for_pdf(devis.get('total_ttc', 0), devise)],
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


def generate_facture_pdf(
    facture: dict, 
    client: dict, 
    entreprise: dict, 
    portal_url: str = None,
    intervention_photos: list = None,
    intervention_signature: dict = None
) -> bytes:
    """Generate PDF for an invoice with company logo, payment QR code, photos, signature and multi-currency support"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    
    # Get currency from entreprise
    devise = entreprise.get('devise', 'EUR')
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', alignment=TA_RIGHT, fontSize=10))
    styles.add(ParagraphStyle(name='DocTitle', alignment=TA_CENTER, fontSize=18, spaceAfter=20, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Subtitle', alignment=TA_LEFT, fontSize=12, spaceAfter=10, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Normal10', fontSize=10, leading=14))
    styles.add(ParagraphStyle(name='Small', fontSize=9, textColor=colors.grey))
    styles.add(ParagraphStyle(name='CenterSmall', alignment=TA_CENTER, fontSize=8, textColor=colors.grey))
    
    elements = []
    
    # Header with logo and company info
    logo_img = load_logo_image(entreprise.get('logo_url'))
    
    company_info = f"""
    <b>{entreprise.get('nom', '')}</b><br/>
    {entreprise.get('adresse', '')}<br/>
    {entreprise.get('code_postal', '')} {entreprise.get('ville', '')}<br/>
    Tél: {entreprise.get('telephone', '')}<br/>
    Email: {entreprise.get('email', '')}<br/>
    SIRET: {entreprise.get('siret', '')}<br/>
    TVA Intra: {entreprise.get('tva_intra', '')}
    """
    
    if logo_img:
        # Create a table with logo on left and company info on right
        header_table = Table([
            [logo_img, Paragraph(company_info, styles['Normal10'])]
        ], colWidths=[60*mm, 100*mm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        elements.append(header_table)
    else:
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
            format_currency_for_pdf(ligne.get('prix_unitaire', 0), devise),
            f"{ligne.get('tva', 20):.0f}%",
            format_currency_for_pdf(total_ligne, devise)
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
    
    # Totals with currency formatting
    totals_data = [
        ['', '', '', 'Total HT:', format_currency_for_pdf(facture.get('total_ht', 0), devise)],
        ['', '', '', 'TVA:', format_currency_for_pdf(facture.get('total_tva', 0), devise)],
        ['', '', '', 'Total TTC:', format_currency_for_pdf(facture.get('total_ttc', 0), devise)],
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
    conditions = facture.get('conditions_paiement') or 'Paiement à réception de facture.'
    elements.append(Paragraph(conditions, styles['Small']))
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
    else:
        # Add QR code for payment (only for unpaid invoices)
        elements.append(Spacer(1, 10*mm))
        
        # Build payment QR data
        qr_data = build_payment_qr_data(facture, entreprise, portal_url)
        qr_image_buffer = generate_qr_code(qr_data, size=100)
        
        if qr_image_buffer:
            try:
                qr_img = Image(qr_image_buffer, width=30*mm, height=30*mm)
                
                # Create a table with QR code and payment info
                qr_table_data = [
                    [qr_img, Paragraph("<b>Scannez pour payer</b><br/>Ce QR code contient les informations de paiement", styles['Small'])]
                ]
                qr_table = Table(qr_table_data, colWidths=[35*mm, 80*mm])
                qr_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                    ('ALIGN', (1, 0), (1, 0), 'LEFT'),
                    ('LEFTPADDING', (1, 0), (1, 0), 10),
                ]))
                elements.append(qr_table)
            except Exception as e:
                logger.warning(f"Could not add QR code: {e}")
    
    # Add intervention photos if provided
    if intervention_photos:
        photo_elements = build_photos_section(intervention_photos, styles)
        elements.extend(photo_elements)
    
    # Add intervention signature if provided
    if intervention_signature:
        sig_elements = build_signature_section(
            intervention_signature.get('signature_client'),
            intervention_signature.get('nom_signataire'),
            intervention_signature.get('date_signature'),
            styles
        )
        elements.extend(sig_elements)
    
    doc.build(elements)
    return buffer.getvalue()
