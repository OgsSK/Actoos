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

def load_logo_image(logo_url: str, max_width: int = 350, max_height: int = 120) -> Image:
    """Load company logo from URL and return ReportLab Image
    
    Logo sizing: 350px width max, height auto-scaled to maintain aspect ratio
    Similar to CSS: width: 350px; height: auto; object-fit: contain;
    """
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
    """
    Build payment data string for QR code.
    Uses EPC QR standard for SEPA payments if IBAN is available.
    Otherwise falls back to portal URL or basic info.
    """
    iban = entreprise.get('iban', '').replace(' ', '').upper()
    bic = entreprise.get('bic', '')  # Optional BIC/SWIFT code
    
    # If we have IBAN, generate EPC QR code (EU standard for SEPA payments)
    if iban and len(iban) >= 15:
        # EPC QR format: https://www.europeanpaymentscouncil.eu/what-we-do/epc-qr-code
        amount = facture.get('total_ttc', 0)
        reference = facture.get('numero_facture', '')
        beneficiary = entreprise.get('nom', '')[:70]  # Max 70 chars
        
        # Build EPC QR string
        epc_lines = [
            "BCD",                              # Service Tag
            "002",                              # Version
            "1",                                # Character set (UTF-8)
            "SCT",                              # SEPA Credit Transfer
            bic if bic else "",                 # BIC (optional)
            beneficiary,                        # Beneficiary name
            iban,                               # IBAN
            f"EUR{amount:.2f}",                 # Amount
            "",                                 # Purpose code (optional)
            reference,                          # Payment reference
            f"Facture {reference}",             # Remittance info
            ""                                  # Beneficiary to originator info
        ]
        
        return "\n".join(epc_lines)
    
    # If we have a portal URL, use that for easy payment
    if portal_url:
        return portal_url
    
    # Fallback: Build a payment reference string
    parts = [
        f"Facture: {facture.get('numero_facture', '')}",
        f"Montant: {facture.get('total_ttc', 0):.2f} EUR",
        f"Entreprise: {entreprise.get('nom', '')}",
    ]
    
    if entreprise.get('email'):
        parts.append(f"Contact: {entreprise.get('email')}")
    
    return "\n".join(parts)

def generate_devis_pdf(
    devis: dict, 
    client: dict, 
    entreprise: dict,
    intervention_photos: list = None,
    intervention_notes: str = None
) -> bytes:
    """Generate PDF for a devis/quote with company logo, multi-currency support, and intervention details"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    
    # Get currency from document (snapshot) - falls back to entreprise if not present (legacy documents)
    devise = devis.get('devise', entreprise.get('devise', 'EUR'))
    
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
    
    # Message au client (if present)
    if devis.get('message_client'):
        elements.append(Paragraph("<b>Message:</b>", styles['Subtitle']))
        elements.append(Paragraph(devis.get('message_client', ''), styles['Normal10']))
        elements.append(Spacer(1, 5*mm))
    
    # Conditions
    if devis.get('conditions'):
        elements.append(Paragraph("<b>Conditions:</b>", styles['Subtitle']))
        elements.append(Paragraph(devis.get('conditions', ''), styles['Small']))
        elements.append(Spacer(1, 5*mm))
    
    # Intervention notes if available
    if intervention_notes:
        elements.append(Paragraph("<b>Notes du technicien:</b>", styles['Subtitle']))
        elements.append(Paragraph(intervention_notes, styles['Normal10']))
        elements.append(Spacer(1, 5*mm))
    
    # Intervention photos if available
    if intervention_photos and len(intervention_photos) > 0:
        elements.append(Paragraph("<b>Photos de l'intervention:</b>", styles['Subtitle']))
        elements.append(Spacer(1, 3*mm))
        
        # Create a grid of photos (2 per row max)
        photo_images = []
        for photo_url in intervention_photos[:6]:  # Limit to 6 photos
            try:
                photo_img = load_photo_image(photo_url, max_width=70*mm, max_height=50*mm)
                if photo_img:
                    photo_images.append(photo_img)
            except Exception as e:
                logger.warning(f"Could not load intervention photo: {e}")
        
        # Arrange photos in a 2-column table
        if photo_images:
            photo_rows = []
            for i in range(0, len(photo_images), 2):
                row = [photo_images[i]]
                if i + 1 < len(photo_images):
                    row.append(photo_images[i + 1])
                else:
                    row.append('')
                photo_rows.append(row)
            
            photo_table = Table(photo_rows, colWidths=[85*mm, 85*mm])
            photo_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(photo_table)
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
    
    # Get currency from document (snapshot) - falls back to entreprise if not present (legacy documents)
    devise = facture.get('devise', entreprise.get('devise', 'EUR'))
    
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



def generate_intervention_report_pdf(
    intervention: dict,
    entreprise: dict,
    client: dict,
    technicien: dict = None,
    photos: list = None,
    categorie: dict = None
) -> bytes:
    """
    Generate a comprehensive intervention report PDF
    
    Args:
        intervention: Intervention data with signature, notes, times
        entreprise: Company information
        client: Client information  
        technicien: Technician who performed the intervention
        photos: List of photo objects with URLs/data
        categorie: Optional category with checklist template
    
    Returns:
        PDF bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=10*mm,
        textColor=colors.HexColor('#1e293b')
    ))
    styles.add(ParagraphStyle(
        name='ReportSection',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=8*mm,
        spaceAfter=4*mm,
        textColor=colors.HexColor('#334155'),
        borderPadding=(0, 0, 2, 0)
    ))
    styles.add(ParagraphStyle(
        name='ReportLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#64748b')
    ))
    styles.add(ParagraphStyle(
        name='ReportValue',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1e293b')
    ))
    
    elements = []
    
    # ===== HEADER =====
    # Company logo and title
    header_data = []
    
    # Logo (if available)
    if entreprise.get('logo_url'):
        try:
            logo_response = requests.get(entreprise['logo_url'], timeout=5)
            if logo_response.status_code == 200:
                logo_buffer = BytesIO(logo_response.content)
                logo_img = Image(logo_buffer, width=40*mm, height=15*mm)
                logo_img.hAlign = 'LEFT'
                header_data.append([logo_img, ''])
        except:
            pass
    
    # Title
    elements.append(Paragraph("RAPPORT D'INTERVENTION", styles['ReportTitle']))
    
    # Reference and date
    intervention_date = get_local_time(intervention.get('date_prevue'))
    ref_text = f"<font size='9' color='#64748b'>Réf: {intervention.get('id', '')[:8].upper()}</font>"
    date_text = f"<font size='9' color='#64748b'>Date: {intervention_date.strftime('%d/%m/%Y')}</font>"
    
    ref_table = Table([[Paragraph(ref_text, styles['Normal']), Paragraph(date_text, styles['Normal'])]], 
                      colWidths=[90*mm, 90*mm])
    ref_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(ref_table)
    elements.append(Spacer(1, 5*mm))
    
    # ===== STATUS BANNER =====
    statut = intervention.get('statut', 'planifiee')
    statut_colors = {
        'planifiee': ('#3b82f6', 'Planifiée'),
        'en_cours': ('#f59e0b', 'En cours'),
        'terminee': ('#22c55e', 'Terminée'),
        'annulee': ('#ef4444', 'Annulée'),
        'en_validation': ('#8b5cf6', 'En validation')
    }
    statut_color, statut_label = statut_colors.get(statut, ('#64748b', statut))
    
    status_para = Paragraph(
        f"<font color='white'><b>STATUT: {statut_label.upper()}</b></font>",
        ParagraphStyle('StatusStyle', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER)
    )
    status_table = Table([[status_para]], colWidths=[180*mm])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(statut_color)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 5*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5*mm),
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 5*mm))
    
    # ===== COMPANY & CLIENT INFO (side by side) =====
    # Company info
    company_lines = [
        f"<b>{entreprise.get('nom', '')}</b>",
        entreprise.get('adresse', ''),
        f"{entreprise.get('code_postal', '')} {entreprise.get('ville', '')}",
        f"Tél: {entreprise.get('telephone', '')}",
        entreprise.get('email', '')
    ]
    company_text = Paragraph('<br/>'.join([l for l in company_lines if l.strip()]), styles['ReportValue'])
    
    # Client info
    client_name = f"{client.get('nom', '')} {client.get('prenom', '')}".strip()
    client_lines = [
        f"<b>{client_name}</b>",
        client.get('adresse', ''),
        f"{client.get('code_postal', '')} {client.get('ville', '')}",
        f"Tél: {client.get('telephone', '')}",
        client.get('email', '')
    ]
    client_text = Paragraph('<br/>'.join([l for l in client_lines if l.strip()]), styles['ReportValue'])
    
    info_table = Table([
        [Paragraph("<b>ENTREPRISE</b>", styles['ReportLabel']), Paragraph("<b>CLIENT</b>", styles['ReportLabel'])],
        [company_text, client_text]
    ], colWidths=[90*mm, 90*mm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))
    
    # ===== INTERVENTION DETAILS =====
    elements.append(Paragraph("DÉTAILS DE L'INTERVENTION", styles['ReportSection']))
    
    # Title and category
    titre = intervention.get('titre', 'Sans titre')
    cat_name = categorie.get('nom', '') if categorie else ''
    cat_color = categorie.get('couleur', '#64748b') if categorie else '#64748b'
    
    details_data = [
        ['Titre', Paragraph(f"<b>{titre}</b>", styles['ReportValue'])],
    ]
    
    if cat_name:
        details_data.append(['Catégorie', Paragraph(f"<font color='{cat_color}'>{cat_name}</font>", styles['ReportValue'])])
    
    # Address
    address_parts = [intervention.get('adresse', ''), intervention.get('ville', ''), intervention.get('code_postal', '')]
    address = ', '.join([p for p in address_parts if p])
    if address:
        details_data.append(['Adresse', Paragraph(address, styles['ReportValue'])])
    
    # Priority
    priorite_labels = {'basse': 'Basse', 'normale': 'Normale', 'haute': 'Haute', 'urgente': 'URGENTE'}
    priorite = priorite_labels.get(intervention.get('priorite', 'normale'), 'Normale')
    details_data.append(['Priorité', Paragraph(priorite, styles['ReportValue'])])
    
    # Scheduled date/time
    date_prevue = get_local_time(intervention.get('date_prevue'))
    details_data.append(['Date prévue', Paragraph(date_prevue.strftime('%d/%m/%Y à %H:%M'), styles['ReportValue'])])
    
    # Duration estimated
    duree = intervention.get('duree_estimee', 0)
    if duree:
        details_data.append(['Durée estimée', Paragraph(f"{duree} minutes", styles['ReportValue'])])
    
    # Description
    description = intervention.get('description', '')
    if description:
        details_data.append(['Description', Paragraph(description, styles['ReportValue'])])
    
    details_table = Table(details_data, colWidths=[40*mm, 140*mm])
    details_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
        ('FONTSIZE', (0, 0), (0, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
        ('LINEBELOW', (0, 0), (-1, -2), 0.25, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(details_table)
    
    # ===== TIME TRACKING =====
    if intervention.get('heure_debut') or intervention.get('heure_fin'):
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph("SUIVI HORAIRE", styles['ReportSection']))
        
        time_data = []
        
        if intervention.get('heure_debut'):
            heure_debut = get_local_time(intervention['heure_debut'])
            time_data.append(['Début', heure_debut.strftime('%d/%m/%Y à %H:%M')])
        
        if intervention.get('heure_fin'):
            heure_fin = get_local_time(intervention['heure_fin'])
            time_data.append(['Fin', heure_fin.strftime('%d/%m/%Y à %H:%M')])
            
            # Calculate duration
            if intervention.get('heure_debut'):
                debut = get_local_time(intervention['heure_debut'])
                duration_minutes = int((heure_fin - debut).total_seconds() / 60)
                hours = duration_minutes // 60
                minutes = duration_minutes % 60
                time_data.append(['Durée réelle', f"{hours}h{minutes:02d}" if hours else f"{minutes} min"])
        
        if time_data:
            time_table = Table(time_data, colWidths=[40*mm, 140*mm])
            time_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
                ('FONTSIZE', (0, 0), (0, -1), 9),
                ('TOPPADDING', (0, 0), (-1, -1), 1.5*mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5*mm),
            ]))
            elements.append(time_table)
    
    # ===== TECHNICIAN INFO =====
    if technicien:
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph("TECHNICIEN", styles['ReportSection']))
        
        tech_name = f"{technicien.get('prenom', '')} {technicien.get('nom', '')}".strip()
        tech_data = [['Nom', tech_name]]
        if technicien.get('telephone'):
            tech_data.append(['Téléphone', technicien['telephone']])
        
        tech_table = Table(tech_data, colWidths=[40*mm, 140*mm])
        tech_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('FONTSIZE', (0, 0), (0, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 1.5*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5*mm),
        ]))
        elements.append(tech_table)
    
    # ===== NOTES =====
    notes_internes = intervention.get('notes_internes', '')
    notes_terrain = intervention.get('notes_terrain', '')
    
    if notes_internes or notes_terrain:
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph("NOTES & OBSERVATIONS", styles['ReportSection']))
        
        if notes_terrain:
            elements.append(Paragraph("<font color='#64748b' size='9'>Notes du technicien:</font>", styles['Normal']))
            elements.append(Spacer(1, 1*mm))
            notes_para = Paragraph(notes_terrain, styles['ReportValue'])
            notes_box = Table([[notes_para]], colWidths=[175*mm])
            notes_box.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
                ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
            ]))
            elements.append(notes_box)
            elements.append(Spacer(1, 2*mm))
        
        if notes_internes:
            elements.append(Paragraph("<font color='#64748b' size='9'>Notes internes (admin):</font>", styles['Normal']))
            elements.append(Spacer(1, 1*mm))
            notes_para = Paragraph(notes_internes, styles['ReportValue'])
            notes_box = Table([[notes_para]], colWidths=[175*mm])
            notes_box.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#fcd34d')),
                ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
                ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
            ]))
            elements.append(notes_box)
    
    # ===== CHECKLIST RESPONSES =====
    checklist_responses = intervention.get('checklist_responses', [])
    if checklist_responses and categorie and categorie.get('checklist_template'):
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph("CHECKLIST", styles['ReportSection']))
        
        checklist_data = [['', 'Élément', 'Réponse']]
        
        for response in checklist_responses:
            # Find template item
            item_id = response.get('item_id')
            template_item = next((t for t in categorie.get('checklist_template', []) if t.get('id') == item_id), None)
            label = response.get('label') or (template_item.get('label') if template_item else 'N/A')
            
            # Determine response value
            if response.get('checked'):
                status = '✓'
                value = 'Oui'
            elif response.get('value'):
                status = '✓'
                value = str(response['value'])
            else:
                status = '○'
                value = '-'
            
            checklist_data.append([status, label, value])
        
        checklist_table = Table(checklist_data, colWidths=[10*mm, 120*mm, 50*mm])
        checklist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1.5*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        elements.append(checklist_table)
    
    # ===== PHOTOS =====
    if photos and len(photos) > 0:
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(f"PHOTOS ({len(photos)})", styles['ReportSection']))
        
        # Group by type
        photos_by_type = {'avant': [], 'pendant': [], 'apres': [], 'autre': []}
        for photo in photos:
            ptype = photo.get('type_photo', 'autre')
            if ptype in photos_by_type:
                photos_by_type[ptype].append(photo)
            else:
                photos_by_type['autre'].append(photo)
        
        type_labels = {'avant': 'Avant', 'pendant': 'Pendant', 'apres': 'Après', 'autre': 'Autres'}
        
        for ptype, type_photos in photos_by_type.items():
            if type_photos:
                elements.append(Paragraph(f"<font color='#64748b' size='9'>{type_labels[ptype]}:</font>", styles['Normal']))
                elements.append(Spacer(1, 1*mm))
                
                # Create photo grid (3 per row)
                photo_row = []
                for photo in type_photos:
                    # Try to load photo
                    photo_img = None
                    try:
                        if photo.get('url'):
                            response = requests.get(photo['url'], timeout=5)
                            if response.status_code == 200:
                                img_buffer = BytesIO(response.content)
                                photo_img = Image(img_buffer, width=55*mm, height=40*mm)
                    except:
                        pass
                    
                    if photo_img:
                        photo_row.append(photo_img)
                    else:
                        # Placeholder
                        placeholder = Paragraph("<font color='#94a3b8' size='8'>[Photo]</font>", 
                                               ParagraphStyle('PhotoPlaceholder', alignment=TA_CENTER))
                        photo_row.append(placeholder)
                    
                    if len(photo_row) == 3:
                        photo_table = Table([photo_row], colWidths=[60*mm, 60*mm, 60*mm])
                        photo_table.setStyle(TableStyle([
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                            ('TOPPADDING', (0, 0), (-1, -1), 1*mm),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 1*mm),
                        ]))
                        elements.append(photo_table)
                        photo_row = []
                
                # Remaining photos
                if photo_row:
                    while len(photo_row) < 3:
                        photo_row.append('')
                    photo_table = Table([photo_row], colWidths=[60*mm, 60*mm, 60*mm])
                    photo_table.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    elements.append(photo_table)
                
                elements.append(Spacer(1, 2*mm))
    
    # ===== SIGNATURE =====
    if intervention.get('signature_client'):
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph("SIGNATURE CLIENT", styles['ReportSection']))
        
        sig_buffer = decode_signature_image(intervention['signature_client'])
        if sig_buffer:
            sig_img = Image(sig_buffer, width=60*mm, height=25*mm)
            
            sig_date = intervention.get('date_signature')
            sig_date_str = get_local_time(sig_date).strftime('%d/%m/%Y à %H:%M') if sig_date else ''
            nom_signataire = intervention.get('nom_signataire', '')
            
            sig_data = [
                [sig_img],
                [Paragraph(f"<b>{nom_signataire}</b>", styles['ReportValue'])],
                [Paragraph(f"<font color='#64748b' size='8'>Signé le {sig_date_str}</font>", styles['Normal'])]
            ]
            
            sig_table = Table(sig_data, colWidths=[80*mm])
            sig_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ]))
            elements.append(sig_table)
    
    # ===== FOOTER =====
    elements.append(Spacer(1, 10*mm))
    footer_text = f"<font color='#94a3b8' size='8'>Rapport généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} par {entreprise.get('nom', 'ACTOOS PRO')}</font>"
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', alignment=TA_CENTER)))
    
    doc.build(elements)
    return buffer.getvalue()



def generate_payment_receipt_pdf(
    payment: dict,
    facture: dict,
    client: dict,
    entreprise: dict
) -> bytes:
    """
    Generate a payment receipt PDF (Reçu de paiement)
    
    Args:
        payment: Payment record from invoice_payments collection
        facture: The invoice being paid
        client: Client information
        entreprise: Company information
        
    Returns:
        PDF as bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Currency from facture
    devise = facture.get("devise", "EUR")
    taux_change = facture.get("taux_change_eur", 1.0)
    
    # ===== HEADER WITH LOGO =====
    header_data = []
    
    # Company info (left column)
    company_info = []
    company_name = entreprise.get("nom", "Entreprise")
    company_info.append(Paragraph(f"<b>{company_name}</b>", styles["Heading2"]))
    
    if entreprise.get("adresse"):
        company_info.append(Paragraph(entreprise["adresse"], styles["Normal"]))
    
    city_postal = []
    if entreprise.get("code_postal"):
        city_postal.append(entreprise["code_postal"])
    if entreprise.get("ville"):
        city_postal.append(entreprise["ville"])
    if city_postal:
        company_info.append(Paragraph(" ".join(city_postal), styles["Normal"]))
    
    if entreprise.get("telephone"):
        company_info.append(Paragraph(f"Tél: {entreprise['telephone']}", styles["Normal"]))
    if entreprise.get("email"):
        company_info.append(Paragraph(entreprise["email"], styles["Normal"]))
    
    # SIRET/TVA
    if entreprise.get("siret"):
        company_info.append(Paragraph(f"SIRET: {entreprise['siret']}", styles["Normal"]))
    if entreprise.get("tva_intracommunautaire"):
        company_info.append(Paragraph(f"TVA: {entreprise['tva_intracommunautaire']}", styles["Normal"]))
    
    header_data.append([company_info, []])
    
    header_table = Table(header_data, colWidths=[90*mm, 90*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10*mm))
    
    # ===== RECEIPT TITLE =====
    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#059669'),
        alignment=TA_CENTER,
        spaceAfter=5*mm
    )
    elements.append(Paragraph("REÇU DE PAIEMENT", title_style))
    
    # Receipt number and date
    payment_date = get_local_time(payment.get("recorded_at", ""))
    receipt_number = f"REC-{payment.get('id', '')[:8].upper()}"
    
    meta_style = ParagraphStyle('Meta', fontSize=10, textColor=colors.HexColor('#64748b'), alignment=TA_CENTER)
    elements.append(Paragraph(f"N° {receipt_number} - {payment_date.strftime('%d/%m/%Y')}", meta_style))
    elements.append(Spacer(1, 8*mm))
    
    # ===== CLIENT INFO =====
    client_box_style = ParagraphStyle('ClientBox', fontSize=10, leading=14)
    
    client_info = f"<b>Reçu de:</b><br/>"
    client_info += f"{client.get('prenom', '')} {client.get('nom', '')}<br/>"
    if client.get("email"):
        client_info += f"{client['email']}<br/>"
    if client.get("telephone"):
        client_info += f"{client['telephone']}<br/>"
    if client.get("adresse"):
        client_info += f"{client['adresse']}<br/>"
        if client.get("code_postal") or client.get("ville"):
            client_info += f"{client.get('code_postal', '')} {client.get('ville', '')}"
    
    client_table = Table([[Paragraph(client_info, client_box_style)]], colWidths=[180*mm])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#059669')),
        ('TOPPADDING', (0, 0), (-1, -1), 4*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 4*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4*mm),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 8*mm))
    
    # ===== PAYMENT DETAILS =====
    section_style = ParagraphStyle('Section', fontSize=12, textColor=colors.HexColor('#1e293b'), spaceBefore=5*mm, spaceAfter=3*mm)
    elements.append(Paragraph("<b>DÉTAILS DU PAIEMENT</b>", section_style))
    
    # Payment info table
    payment_amount = payment.get("montant", 0)
    payment_method = payment.get("mode_paiement", "Autre")
    payment_methods_labels = {
        "especes": "Espèces",
        "carte": "Carte bancaire",
        "virement": "Virement bancaire",
        "cheque": "Chèque",
        "en_ligne": "Paiement en ligne",
        "stripe": "Stripe"
    }
    payment_method_label = payment_methods_labels.get(payment_method, payment_method.capitalize())
    
    payment_data = [
        ["Facture concernée:", facture.get("numero_facture", "N/A")],
        ["Montant payé:", format_currency_for_pdf(payment_amount, devise)],
        ["Mode de paiement:", payment_method_label],
        ["Date du paiement:", payment_date.strftime("%d/%m/%Y à %H:%M")],
    ]
    
    if payment.get("reference"):
        payment_data.append(["Référence:", payment["reference"]])
    
    if payment.get("notes"):
        payment_data.append(["Notes:", payment["notes"]])
    
    payment_table = Table(payment_data, colWidths=[50*mm, 130*mm])
    payment_table.setStyle(TableStyle([
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONT', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
        ('LINEBELOW', (0, 0), (-1, -2), 0.25, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 8*mm))
    
    # ===== INVOICE SUMMARY =====
    elements.append(Paragraph("<b>RÉCAPITULATIF DE LA FACTURE</b>", section_style))
    
    total_ttc = facture.get("total_ttc", 0)
    montant_paye_total = facture.get("montant_paye", 0)
    reste_a_payer = total_ttc - montant_paye_total
    
    summary_data = [
        ["Total de la facture:", format_currency_for_pdf(total_ttc, devise)],
        ["Total payé à ce jour:", format_currency_for_pdf(montant_paye_total, devise)],
        ["Reste à payer:", format_currency_for_pdf(max(0, reste_a_payer), devise)],
    ]
    
    summary_table = Table(summary_data, colWidths=[80*mm, 100*mm])
    summary_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
        ('LINEBELOW', (0, 0), (-1, -2), 0.25, colors.HexColor('#e2e8f0')),
        # Highlight "Reste à payer" row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fef2f2') if reste_a_payer > 0 else colors.HexColor('#f0fdf4')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#dc2626') if reste_a_payer > 0 else colors.HexColor('#059669')),
        ('FONT', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 10*mm))
    
    # ===== STATUS BOX =====
    if reste_a_payer <= 0:
        status_text = "✓ FACTURE SOLDÉE"
        status_bg = colors.HexColor('#dcfce7')
        status_border = colors.HexColor('#059669')
        status_text_color = colors.HexColor('#166534')
    else:
        status_text = f"SOLDE RESTANT: {format_currency_for_pdf(reste_a_payer, devise)}"
        status_bg = colors.HexColor('#fef3c7')
        status_border = colors.HexColor('#f59e0b')
        status_text_color = colors.HexColor('#92400e')
    
    status_style = ParagraphStyle('StatusBox', fontSize=14, textColor=status_text_color, alignment=TA_CENTER)
    status_table = Table([[Paragraph(f"<b>{status_text}</b>", status_style)]], colWidths=[180*mm])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), status_bg),
        ('BOX', (0, 0), (-1, -1), 1, status_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5*mm),
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 15*mm))
    
    # ===== FOOTER =====
    company_email = entreprise.get('email', "l'adresse indiquée")
    company_name = entreprise.get('nom', 'votre entreprise')
    gen_date = datetime.now().strftime('%d/%m/%Y à %H:%M')
    footer_text = f"""
    <font color='#94a3b8' size='8'>
    Ce reçu a été généré automatiquement par ACTOOS PRO le {gen_date}.<br/>
    Pour toute question, contactez {company_name} à {company_email}.
    </font>
    """
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', alignment=TA_CENTER)))
    
    doc.build(elements)
    return buffer.getvalue()
