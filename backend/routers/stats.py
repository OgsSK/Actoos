"""
Dashboard stats routes
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from auth import get_current_user
from dependencies import db, serialize_doc

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics for the entreprise"""
    ent_id = current_user["entreprise_id"]
    
    # Get counts
    clients_count = await db.clients.count_documents({"entreprise_id": ent_id})
    
    # Interventions by status
    interventions_planifiees = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "planifiee"})
    interventions_en_cours = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "en_cours"})
    interventions_terminees = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "terminee"})
    
    # This month's stats
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    devis_this_month = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "created_at": {"$gte": start_of_month}
    })
    
    factures_this_month = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "created_at": {"$gte": start_of_month}
    })
    
    # Revenue this month (paid invoices)
    pipeline = [
        {"$match": {
            "entreprise_id": ent_id,
            "paye": True,
            "created_at": {"$gte": start_of_month}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$montant_ttc"}}}
    ]
    revenue_result = await db.factures.aggregate(pipeline).to_list(1)
    revenue_this_month = revenue_result[0]["total"] if revenue_result else 0
    
    # Pending invoices
    factures_pending = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "paye": False,
        "statut": {"$ne": "annulee"}
    })
    
    pending_pipeline = [
        {"$match": {
            "entreprise_id": ent_id,
            "paye": False,
            "statut": {"$ne": "annulee"}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$montant_ttc"}}}
    ]
    pending_result = await db.factures.aggregate(pending_pipeline).to_list(1)
    pending_amount = pending_result[0]["total"] if pending_result else 0
    
    # Today's interventions
    today = datetime.now(timezone.utc).date().isoformat()
    today_interventions = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$regex": f"^{today}"}
    })
    
    return {
        "clients": clients_count,
        "interventions": {
            "planifiees": interventions_planifiees,
            "en_cours": interventions_en_cours,
            "terminees": interventions_terminees,
            "today": today_interventions
        },
        "devis": {"this_month": devis_this_month},
        "factures": {
            "this_month": factures_this_month,
            "pending": factures_pending,
            "pending_amount": round(pending_amount, 2)
        },
        "revenue": {"this_month": round(revenue_this_month, 2)}
    }


@router.get("/weekly")
async def get_weekly_stats(current_user: dict = Depends(get_current_user)):
    """Get weekly intervention stats"""
    ent_id = current_user["entreprise_id"]
    
    # Get stats for the last 7 days
    stats = []
    for i in range(6, -1, -1):
        date = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        date_str = date.isoformat()
        
        count = await db.interventions.count_documents({
            "entreprise_id": ent_id,
            "date_prevue": {"$regex": f"^{date_str}"}
        })
        
        completed = await db.interventions.count_documents({
            "entreprise_id": ent_id,
            "date_prevue": {"$regex": f"^{date_str}"},
            "statut": "terminee"
        })
        
        stats.append({
            "date": date_str,
            "day": date.strftime("%a"),
            "total": count,
            "completed": completed
        })
    
    return stats
