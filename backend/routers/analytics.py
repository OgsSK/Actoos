"""
Analytics routes
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from io import StringIO
from datetime import datetime
import csv

from auth import require_admin
from dependencies import db, serialize_doc
from analytics_service import (
    get_revenue_analytics, get_intervention_analytics, get_technician_performance,
    get_client_analytics, get_devis_analytics, get_trend_data
)
from currency_utils import format_currency_for_pdf

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/revenue")
async def revenue_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get revenue analytics"""
    return await get_revenue_analytics(db, current_user["entreprise_id"], period)


@router.get("/interventions")
async def intervention_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get intervention analytics"""
    return await get_intervention_analytics(db, current_user["entreprise_id"], period)


@router.get("/technicians")
async def technician_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get technician performance analytics"""
    return await get_technician_performance(db, current_user["entreprise_id"], period)


@router.get("/clients")
async def client_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get client analytics"""
    return await get_client_analytics(db, current_user["entreprise_id"], period)


@router.get("/devis")
async def devis_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get devis analytics"""
    return await get_devis_analytics(db, current_user["entreprise_id"], period)


@router.get("/trends")
async def trends_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get trend data for charts"""
    return await get_trend_data(db, current_user["entreprise_id"], period)


@router.get("/summary")
async def summary_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get complete analytics summary"""
    revenue = await get_revenue_analytics(db, current_user["entreprise_id"], period)
    interventions = await get_intervention_analytics(db, current_user["entreprise_id"], period)
    technicians = await get_technician_performance(db, current_user["entreprise_id"], period)
    clients = await get_client_analytics(db, current_user["entreprise_id"], period)
    devis = await get_devis_analytics(db, current_user["entreprise_id"], period)
    trends = await get_trend_data(db, current_user["entreprise_id"], period)
    
    return {
        "revenue": revenue,
        "interventions": interventions,
        "technicians": technicians,
        "clients": clients,
        "devis": devis,
        "trends": trends
    }


@router.get("/export/csv")
async def export_analytics_csv(period: str = "month", current_user: dict = Depends(require_admin)):
    """Export analytics data as CSV"""
    # Get entreprise for currency
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "devise": 1, "nom": 1}
    )
    devise = entreprise.get("devise", "EUR") if entreprise else "EUR"
    entreprise_nom = entreprise.get("nom", "Entreprise") if entreprise else "Entreprise"
    
    # Get all analytics data
    revenue = await get_revenue_analytics(db, current_user["entreprise_id"], period)
    interventions = await get_intervention_analytics(db, current_user["entreprise_id"], period)
    technicians = await get_technician_performance(db, current_user["entreprise_id"], period)
    clients = await get_client_analytics(db, current_user["entreprise_id"], period)
    devis = await get_devis_analytics(db, current_user["entreprise_id"], period)
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    # Header
    writer.writerow([f"Rapport Analytics - {entreprise_nom}"])
    writer.writerow([f"Période: {period}", f"Date: {datetime.now().strftime('%d/%m/%Y %H:%M')}"])
    writer.writerow([])
    
    # Revenue section
    writer.writerow(["=== REVENUS ==="])
    writer.writerow(["Métrique", "Valeur"])
    writer.writerow(["Chiffre d'affaires", format_currency_for_pdf(revenue.get("current_revenue", 0), devise)])
    writer.writerow(["Factures en attente", format_currency_for_pdf(revenue.get("pending_amount", 0), devise)])
    writer.writerow(["Croissance", f"{revenue.get('growth_rate', 0):.1f}%"])
    writer.writerow([])
    
    # Interventions section
    writer.writerow(["=== INTERVENTIONS ==="])
    writer.writerow(["Statut", "Nombre"])
    for status, count in interventions.get("by_status", {}).items():
        writer.writerow([status, count])
    writer.writerow(["Total", interventions.get("total", 0)])
    writer.writerow(["Taux completion", f"{interventions.get('completion_rate', 0):.1f}%"])
    writer.writerow([])
    
    # Technicians section
    writer.writerow(["=== PERFORMANCE TECHNICIENS ==="])
    writer.writerow(["Technicien", "Interventions assignées", "Complétées", "Taux completion"])
    # technicians is a list, not a dict
    for tech in technicians:
        writer.writerow([
            tech.get("name", ""),
            tech.get("interventions_assigned", 0),
            tech.get("interventions_completed", 0),
            f"{tech.get('completion_rate', 0):.1f}%"
        ])
    writer.writerow([])
    
    # Top clients section
    writer.writerow(["=== TOP CLIENTS ==="])
    writer.writerow(["Client", "CA", "Nombre factures"])
    for client in clients.get("top_clients", [])[:10]:
        writer.writerow([
            client.get("name", ""),
            format_currency_for_pdf(client.get("total_revenue", 0), devise),
            client.get("invoice_count", 0)
        ])
    writer.writerow([])
    
    # Devis section
    writer.writerow(["=== DEVIS ==="])
    writer.writerow(["Métrique", "Valeur"])
    writer.writerow(["Total devis", devis.get("total_devis", 0)])
    writer.writerow(["Taux conversion", f"{devis.get('conversion_rate', 0):.1f}%"])
    writer.writerow(["Montant total", format_currency_for_pdf(devis.get("total_amount", 0), devise)])
    
    output.seek(0)
    
    # Generate filename
    filename = f"analytics_{period}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    # Encode to UTF-8 with BOM for Excel compatibility
    csv_content = output.getvalue()
    csv_bytes = ('\ufeff' + csv_content).encode('utf-8')
    
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/json")
async def export_analytics_json(period: str = "month", current_user: dict = Depends(require_admin)):
    """Export analytics data as JSON (for Excel import)"""
    revenue = await get_revenue_analytics(db, current_user["entreprise_id"], period)
    interventions = await get_intervention_analytics(db, current_user["entreprise_id"], period)
    technicians = await get_technician_performance(db, current_user["entreprise_id"], period)
    clients = await get_client_analytics(db, current_user["entreprise_id"], period)
    devis = await get_devis_analytics(db, current_user["entreprise_id"], period)
    trends = await get_trend_data(db, current_user["entreprise_id"], period)
    
    return {
        "export_date": datetime.now().isoformat(),
        "period": period,
        "revenue": revenue,
        "interventions": interventions,
        "technicians": technicians,
        "clients": clients,
        "devis": devis,
        "trends": trends
    }
