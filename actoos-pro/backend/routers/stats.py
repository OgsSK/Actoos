"""
Dashboard stats routes - UNIFIED with analytics_service
Uses the same calculation methods as Analytics for data consistency
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from auth import get_current_user
from dependencies import db, serialize_doc

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """
    Get dashboard statistics for the entreprise
    UNIFIED DATA SOURCE: Uses same logic as analytics for consistency
    """
    ent_id = current_user["entreprise_id"]
    now = datetime.now(timezone.utc)
    
    # Get counts
    clients_count = await db.clients.count_documents({"entreprise_id": ent_id})
    
    # Active technicians count
    techniciens_actifs = await db.users.count_documents({
        "entreprise_id": ent_id,
        "role": "technicien",
        "statut": "actif"
    })
    
    # Interventions by status
    interventions_planifiees = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "planifiee"})
    interventions_en_cours = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "en_cours"})
    interventions_terminees = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "terminee"})
    interventions_total = await db.interventions.count_documents({"entreprise_id": ent_id})
    
    # This month's date range
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Devis stats (UNIFIED with analytics)
    devis_total = await db.devis.count_documents({"entreprise_id": ent_id})
    devis_this_month = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "created_at": {"$gte": start_of_month}
    })
    devis_en_attente = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": {"$in": ["brouillon", "envoye"]}
    })
    devis_signes = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "signe"
    })
    devis_signes_mois = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "signe",
        "date_signature": {"$gte": start_of_month}
    })
    
    # Devis total amount
    devis_amount_pipeline = [
        {"$match": {"entreprise_id": ent_id}},
        {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
    ]
    devis_amount_result = await db.devis.aggregate(devis_amount_pipeline).to_list(1)
    devis_montant_total = devis_amount_result[0]["total"] if devis_amount_result else 0
    
    # Factures stats (UNIFIED - using correct field names)
    factures_this_month = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "created_at": {"$gte": start_of_month}
    })
    
    # Revenue this month (paid invoices) - CORRECT FIELD: statut = "payee"
    revenue_pipeline = [
        {"$match": {
            "entreprise_id": ent_id,
            "statut": "payee",
            "date_paiement": {"$gte": start_of_month}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}, "count": {"$sum": 1}}}
    ]
    revenue_result = await db.factures.aggregate(revenue_pipeline).to_list(1)
    revenue_this_month = revenue_result[0]["total"] if revenue_result else 0
    factures_payees_mois = revenue_result[0]["count"] if revenue_result else 0
    
    # Pending invoices - CORRECT FIELDS
    factures_en_attente = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "statut": {"$in": ["emise", "brouillon"]}
    })
    
    pending_pipeline = [
        {"$match": {
            "entreprise_id": ent_id,
            "statut": {"$in": ["emise", "brouillon"]}
        }},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$total_ttc", {"$ifNull": ["$montant_paye", 0]}]}}}}
    ]
    pending_result = await db.factures.aggregate(pending_pipeline).to_list(1)
    pending_amount = pending_result[0]["total"] if pending_result else 0
    
    # Overdue invoices
    factures_en_retard = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "statut": "emise",
        "date_echeance": {"$lt": now.isoformat()}
    })
    
    # Average invoice amount
    avg_facture_pipeline = [
        {"$match": {"entreprise_id": ent_id, "statut": "payee"}},
        {"$group": {"_id": None, "avg": {"$avg": "$total_ttc"}}}
    ]
    avg_result = await db.factures.aggregate(avg_facture_pipeline).to_list(1)
    facture_montant_moyen = avg_result[0]["avg"] if avg_result else 0
    
    # Today's interventions
    today = now.date().isoformat()
    today_interventions = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$regex": f"^{today}"}
    })
    
    # Calculate conversion rate (same as analytics)
    taux_conversion = round((devis_signes / devis_total * 100) if devis_total > 0 else 0, 1)
    
    return {
        # Basic counts
        "clients": clients_count,
        "techniciens_actifs": techniciens_actifs,
        
        # Interventions
        "interventions": {
            "total": interventions_total,
            "planifiees": interventions_planifiees,
            "en_cours": interventions_en_cours,
            "terminees": interventions_terminees,
            "today": today_interventions
        },
        
        # Devis (UNIFIED)
        "devis": {
            "total": devis_total,
            "this_month": devis_this_month,
            "en_attente": devis_en_attente,
            "signes": devis_signes,
            "signes_mois": devis_signes_mois,
            "montant_total": round(devis_montant_total, 2)
        },
        "devis_en_attente": devis_en_attente,
        "devis_signes_mois": devis_signes_mois,
        
        # Factures (UNIFIED)
        "factures": {
            "this_month": factures_this_month,
            "en_attente": factures_en_attente,
            "payees_mois": factures_payees_mois,
            "en_retard": factures_en_retard,
            "pending_amount": round(pending_amount, 2),
            "montant_moyen": round(facture_montant_moyen, 2)
        },
        
        # Revenue (UNIFIED)
        "revenue": {"this_month": round(revenue_this_month, 2)},
        "ca_mois": round(revenue_this_month, 2),
        
        # Conversion metrics (UNIFIED)
        "taux_conversion": taux_conversion
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
