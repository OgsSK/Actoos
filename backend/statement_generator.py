"""
Monthly Client Statement Generator
Generates and sends monthly statements to clients with their invoice history
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import logging

from currency_utils import format_currency_for_pdf

logger = logging.getLogger(__name__)


def generate_client_statement_pdf(
    entreprise: dict,
    client: dict,
    factures: list,
    period_start: datetime,
    period_end: datetime
) -> bytes:
    """Generate a monthly statement PDF for a client"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        topMargin=20*mm, 
        bottomMargin=20*mm, 
        leftMargin=20*mm, 
        rightMargin=20*mm
    )
    
    devise = entreprise.get('devise', 'EUR')
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0F172A'),
        alignment=TA_CENTER,
        spaceAfter=5
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_CENTER,
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=10,
        spaceAfter=8,
        textColor=colors.HexColor('#1E40AF')
    )
    
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#334155')
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph("Relevé de compte", title_style))
    elements.append(Paragraph(
        f"Période du {period_start.strftime('%d/%m/%Y')} au {period_end.strftime('%d/%m/%Y')}",
        subtitle_style
    ))
    elements.append(Spacer(1, 5*mm))
    
    # Company info
    elements.append(Paragraph(f"<b>{entreprise.get('nom', '')}</b>", normal_style))
    if entreprise.get('adresse'):
        elements.append(Paragraph(entreprise.get('adresse'), normal_style))
    if entreprise.get('ville') or entreprise.get('code_postal'):
        elements.append(Paragraph(
            f"{entreprise.get('code_postal', '')} {entreprise.get('ville', '')}",
            normal_style
        ))
    elements.append(Spacer(1, 5*mm))
    
    # Client info
    elements.append(Paragraph("Destinataire:", section_style))
    client_name = f"{client.get('prenom', '')} {client.get('nom', '')}".strip() or client.get('nom', '')
    elements.append(Paragraph(f"<b>{client_name}</b>", normal_style))
    if client.get('adresse'):
        elements.append(Paragraph(client.get('adresse'), normal_style))
    if client.get('ville') or client.get('code_postal'):
        elements.append(Paragraph(
            f"{client.get('code_postal', '')} {client.get('ville', '')}",
            normal_style
        ))
    elements.append(Spacer(1, 10*mm))
    
    # Invoices table
    elements.append(Paragraph("Détail des factures", section_style))
    
    if factures:
        table_data = [["N° Facture", "Date", "Montant TTC", "Statut"]]
        
        total_montant = 0
        total_paye = 0
        total_impaye = 0
        
        for facture in factures:
            # Use correct field name: total_ttc (not montant_ttc)
            montant = facture.get('total_ttc') or facture.get('montant_ttc', 0)
            total_montant += montant
            
            # Use correct statut field: statut = 'payee' (not paye = True)
            statut_str = facture.get('statut', '')
            if statut_str == 'payee':
                statut = "Payée"
                total_paye += montant
            elif statut_str == 'annulee':
                statut = "Annulée"
            else:
                statut = "En attente"
                total_impaye += montant
            
            # Format date
            date_str = ""
            if facture.get('created_at'):
                try:
                    date_obj = datetime.fromisoformat(facture['created_at'].replace('Z', '+00:00'))
                    date_str = date_obj.strftime('%d/%m/%Y')
                except:
                    date_str = facture['created_at'][:10]
            
            # Use correct field name: numero_facture (not numero)
            numero_facture = facture.get('numero_facture') or facture.get('numero', 'N/A')
            
            table_data.append([
                numero_facture,
                date_str,
                format_currency_for_pdf(montant, devise),
                statut
            ])
        
        table = Table(table_data, colWidths=[45*mm, 35*mm, 45*mm, 35*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 5*mm))
        
        # Summary
        summary_data = [
            ["", "", "Total facturé:", format_currency_for_pdf(total_montant, devise)],
            ["", "", "Total payé:", format_currency_for_pdf(total_paye, devise)],
            ["", "", "Solde dû:", format_currency_for_pdf(total_impaye, devise)],
        ]
        
        summary_table = Table(summary_data, colWidths=[45*mm, 35*mm, 45*mm, 35*mm])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
            ('FONTNAME', (2, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (2, 2), (3, 2), colors.HexColor('#DC2626') if total_impaye > 0 else colors.HexColor('#059669')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(summary_table)
    else:
        elements.append(Paragraph("Aucune facture pour cette période.", normal_style))
    
    elements.append(Spacer(1, 15*mm))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94A3B8'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(
        f"Relevé généré automatiquement le {datetime.now().strftime('%d/%m/%Y')} | {entreprise.get('nom', '')}",
        footer_style
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


async def generate_monthly_statements(db, entreprise_id: str, month: int = None, year: int = None):
    """Generate monthly statements for all clients with invoices"""
    # Default to previous month
    if month is None or year is None:
        today = datetime.now(timezone.utc)
        last_month = today - relativedelta(months=1)
        month = last_month.month
        year = last_month.year
    
    # Calculate period
    period_start = datetime(year, month, 1, tzinfo=timezone.utc)
    period_end = period_start + relativedelta(months=1) - timedelta(seconds=1)
    
    # Get entreprise
    entreprise = await db.entreprises.find_one({"id": entreprise_id}, {"_id": 0})
    if not entreprise:
        logger.error(f"Entreprise {entreprise_id} not found")
        return []
    
    # Find all clients with invoices in this period
    pipeline = [
        {
            "$match": {
                "entreprise_id": entreprise_id,
                "created_at": {
                    "$gte": period_start.isoformat(),
                    "$lte": period_end.isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": "$client_id",
                "factures": {"$push": "$$ROOT"}
            }
        }
    ]
    
    results = await db.factures.aggregate(pipeline).to_list(1000)
    
    statements = []
    for result in results:
        client_id = result["_id"]
        factures = result["factures"]
        
        # Get client info
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            continue
        
        # Remove _id from factures
        for f in factures:
            if '_id' in f:
                del f['_id']
        
        # Generate PDF
        try:
            pdf_bytes = generate_client_statement_pdf(
                entreprise=entreprise,
                client=client,
                factures=factures,
                period_start=period_start,
                period_end=period_end
            )
            
            statements.append({
                "client_id": client_id,
                "client_name": f"{client.get('prenom', '')} {client.get('nom', '')}".strip(),
                "client_email": client.get('email'),
                "period": f"{month:02d}/{year}",
                "facture_count": len(factures),
                "pdf_bytes": pdf_bytes
            })
        except Exception as e:
            logger.error(f"Error generating statement for client {client_id}: {e}")
    
    return statements
