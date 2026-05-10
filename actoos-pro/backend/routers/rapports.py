"""
Reports routes - Monthly revenue, top clients, conversion stats, and CSV exports
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, timezone, timedelta
import csv
from io import StringIO
import logging

from auth import get_current_user, require_admin
from dependencies import db, serialize_doc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rapports", tags=["Rapports"])


@router.get("/monthly-revenue")
async def get_monthly_revenue(current_user: dict = Depends(get_current_user)):
    """Get monthly revenue data for charts"""
    ent_id = current_user["entreprise_id"]
    
    # Get last 12 months of data
    today = datetime.now(timezone.utc)
    months_data = []
    
    for i in range(11, -1, -1):
        # Calculate month start and end
        month_date = today - timedelta(days=i * 30)
        month_start = datetime(month_date.year, month_date.month, 1, 0, 0, 0, tzinfo=timezone.utc)
        if month_date.month == 12:
            month_end = datetime(month_date.year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        else:
            month_end = datetime(month_date.year, month_date.month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        
        # Query revenue for this month
        pipeline = [
            {"$match": {
                "entreprise_id": ent_id,
                "statut": "payee",
                "date_paiement": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
        ]
        result = await db.factures.aggregate(pipeline).to_list(1)
        revenue = result[0]["total"] if result else 0
        
        # Get month label
        month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
        month_label = month_names[month_start.month - 1]
        
        months_data.append({
            "month": month_label,
            "year": month_start.year,
            "revenue": round(revenue, 2)
        })
    
    return months_data


@router.get("/top-clients")
async def get_top_clients(limit: int = 10, current_user: dict = Depends(get_current_user)):
    """Get top clients by revenue"""
    ent_id = current_user["entreprise_id"]
    
    # Aggregate revenue by client from paid invoices
    pipeline = [
        {"$match": {"entreprise_id": ent_id, "statut": "payee"}},
        {"$group": {
            "_id": "$client_id",
            "total_ca": {"$sum": "$total_ttc"},
            "factures_count": {"$sum": 1}
        }},
        {"$sort": {"total_ca": -1}},
        {"$limit": limit}
    ]
    
    results = await db.factures.aggregate(pipeline).to_list(limit)
    
    # Enrich with client info and intervention count
    top_clients = []
    for r in results:
        client = await db.clients.find_one({"id": r["_id"]}, {"_id": 0, "id": 1, "nom": 1, "prenom": 1, "email": 1})
        if client:
            # Count interventions for this client
            interventions_count = await db.interventions.count_documents({
                "entreprise_id": ent_id,
                "client_id": r["_id"]
            })
            
            top_clients.append({
                "id": client["id"],
                "nom": client.get("nom", ""),
                "prenom": client.get("prenom", ""),
                "email": client.get("email", ""),
                "total_ca": round(r["total_ca"], 2),
                "factures": r["factures_count"],
                "interventions": interventions_count
            })
    
    return top_clients


@router.get("/conversion-stats")
async def get_conversion_stats(current_user: dict = Depends(get_current_user)):
    """Get conversion funnel statistics"""
    ent_id = current_user["entreprise_id"]
    
    # Count by status
    interventions_total = await db.interventions.count_documents({"entreprise_id": ent_id})
    interventions_completed = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "terminee"})
    
    devis_total = await db.devis.count_documents({"entreprise_id": ent_id})
    devis_signed = await db.devis.count_documents({"entreprise_id": ent_id, "statut": "signe"})
    
    factures_total = await db.factures.count_documents({"entreprise_id": ent_id})
    factures_paid = await db.factures.count_documents({"entreprise_id": ent_id, "statut": "payee"})
    
    return {
        "interventions": {"total": interventions_total, "completed": interventions_completed},
        "devis": {"total": devis_total, "signed": devis_signed},
        "factures": {"total": factures_total, "paid": factures_paid},
        "conversion_rate": round((devis_signed / devis_total * 100) if devis_total > 0 else 0, 1),
        "payment_rate": round((factures_paid / factures_total * 100) if factures_total > 0 else 0, 1)
    }


@router.get("/export/{type}")
async def export_report(type: str, current_user: dict = Depends(get_current_user)):
    """Export data as CSV"""
    ent_id = current_user["entreprise_id"]
    
    if type == "devis":
        items = await db.devis.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["numero_devis", "client_id", "statut", "total_ht", "total_ttc", "created_at", "date_signature"]
    elif type == "factures":
        items = await db.factures.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["numero_facture", "client_id", "statut", "total_ht", "total_ttc", "montant_paye", "created_at", "date_echeance"]
    elif type == "clients":
        items = await db.clients.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["id", "nom", "prenom", "email", "telephone", "ville", "created_at"]
    elif type == "interventions":
        items = await db.interventions.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["id", "titre", "client_id", "technicien_id", "statut", "date_prevue", "duree_estimee"]
    else:
        raise HTTPException(status_code=400, detail="Type d'export invalide")
    
    # Build CSV
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')
    writer.writeheader()
    for item in items:
        writer.writerow(item)
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=export_{type}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
