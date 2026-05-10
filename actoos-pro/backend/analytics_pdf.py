"""
Analytics PDF Report Generator
Generates professional PDF reports for analytics data
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from io import BytesIO
from datetime import datetime
import logging
import requests

from currency_utils import format_currency_for_pdf

logger = logging.getLogger(__name__)

# Period labels
PERIOD_LABELS = {
    "week": "Cette semaine",
    "month": "Ce mois",
    "quarter": "Ce trimestre",
    "year": "Cette année"
}


def try_fetch_logo(logo_url: str) -> Image:
    """Try to fetch and create logo image"""
    try:
        if logo_url and logo_url.startswith('http'):
            response = requests.get(logo_url, timeout=5)
            if response.status_code == 200:
                logo_buffer = BytesIO(response.content)
                return Image(logo_buffer, width=40*mm, height=20*mm)
    except Exception as e:
        logger.warning(f"Could not fetch logo: {e}")
    return None


def generate_analytics_pdf(
    entreprise: dict,
    revenue: dict,
    interventions: dict,
    technicians: list,
    clients: dict,
    devis: dict,
    trends: list,
    period: str = "month"
) -> bytes:
    """Generate a professional PDF analytics report"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        topMargin=15*mm, 
        bottomMargin=15*mm, 
        leftMargin=15*mm, 
        rightMargin=15*mm
    )
    
    # Get currency
    devise = entreprise.get('devise', 'EUR')
    entreprise_nom = entreprise.get('nom', 'Entreprise')
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=22,
        spaceAfter=10,
        textColor=colors.HexColor('#0F172A'),
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor('#1E40AF'),
        borderPadding=5
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#334155')
    )
    
    elements = []
    
    # === HEADER ===
    # Try to add logo
    logo = try_fetch_logo(entreprise.get('logo_url'))
    if logo:
        elements.append(logo)
        elements.append(Spacer(1, 5*mm))
    
    # Title
    elements.append(Paragraph(f"Rapport Analytics", title_style))
    elements.append(Paragraph(f"{entreprise_nom}", subtitle_style))
    
    # Period and date
    period_label = PERIOD_LABELS.get(period, period)
    date_str = datetime.now().strftime("%d/%m/%Y à %H:%M")
    elements.append(Paragraph(f"Période: {period_label} | Généré le {date_str}", subtitle_style))
    elements.append(Spacer(1, 10*mm))
    
    # === KPI SUMMARY ===
    elements.append(Paragraph("Indicateurs Clés", section_style))
    
    kpi_data = [
        ["Métrique", "Valeur", "Évolution"],
        [
            "Chiffre d'affaires",
            format_currency_for_pdf(revenue.get('current_revenue', 0), devise),
            f"{revenue.get('growth_rate', 0):+.1f}%"
        ],
        [
            "Factures en attente",
            format_currency_for_pdf(revenue.get('pending_amount', 0), devise),
            f"{revenue.get('pending_count', 0)} factures"
        ],
        [
            "Interventions",
            str(interventions.get('total', 0)),
            f"{interventions.get('completion_rate', 0):.1f}% terminées"
        ],
        [
            "Devis",
            format_currency_for_pdf(devis.get('total_amount', 0), devise),
            f"{devis.get('conversion_rate', 0):.1f}% convertis"
        ],
    ]
    
    kpi_table = Table(kpi_data, colWidths=[70*mm, 50*mm, 50*mm])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 10*mm))
    
    # === INTERVENTIONS BY STATUS ===
    elements.append(Paragraph("Répartition des Interventions", section_style))
    
    status_labels = {
        'planifiee': 'Planifiées',
        'en_cours': 'En cours',
        'terminee': 'Terminées',
        'annulee': 'Annulées'
    }
    
    status_data = [["Statut", "Nombre", "Pourcentage"]]
    total_interventions = interventions.get('total', 0) or 1  # Avoid division by zero
    
    for status, count in interventions.get('by_status', {}).items():
        percentage = (count / total_interventions) * 100
        status_data.append([
            status_labels.get(status, status),
            str(count),
            f"{percentage:.1f}%"
        ])
    
    status_table = Table(status_data, colWidths=[70*mm, 50*mm, 50*mm])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 10*mm))
    
    # === TECHNICIAN PERFORMANCE ===
    if technicians:
        elements.append(Paragraph("Performance des Techniciens", section_style))
        
        tech_data = [["Technicien", "Assignées", "Terminées", "Taux"]]
        for tech in technicians:
            tech_data.append([
                tech.get('name', 'N/A'),
                str(tech.get('interventions_assigned', 0)),
                str(tech.get('interventions_completed', 0)),
                f"{tech.get('completion_rate', 0):.0f}%"
            ])
        
        tech_table = Table(tech_data, colWidths=[60*mm, 35*mm, 35*mm, 35*mm])
        tech_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7C3AED')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ]))
        elements.append(tech_table)
        elements.append(Spacer(1, 10*mm))
    
    # === TOP CLIENTS ===
    top_clients = clients.get('top_clients', [])[:5]
    if top_clients:
        elements.append(Paragraph("Top 5 Clients", section_style))
        
        client_data = [["Client", "Chiffre d'affaires", "Factures"]]
        for client in top_clients:
            client_data.append([
                client.get('name', 'N/A')[:30],
                format_currency_for_pdf(client.get('total_revenue', 0), devise),
                str(client.get('invoice_count', 0))
            ])
        
        client_table = Table(client_data, colWidths=[70*mm, 50*mm, 50*mm])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DC2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ]))
        elements.append(client_table)
        elements.append(Spacer(1, 10*mm))
    
    # === FOOTER ===
    elements.append(Spacer(1, 10*mm))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94A3B8'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(
        f"Ce rapport a été généré automatiquement par Actoos | {entreprise_nom} | {date_str}",
        footer_style
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
