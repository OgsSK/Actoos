"""
Dashboard routes - Alias for stats and quick access endpoints
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from auth import get_current_user
from dependencies import db, serialize_doc

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
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
    
    devis_pending = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": {"$in": ["brouillon", "envoye"]}
    })
    
    devis_signed = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "accepte",
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
    
    # Today's interventions - use wider timezone window for Europe
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    today_start = datetime(yesterday.year, yesterday.month, yesterday.day, 22, 0, 0, tzinfo=timezone.utc).isoformat()
    today_end = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 2, 0, 0, tzinfo=timezone.utc).isoformat()
    
    today_interventions = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$gte": today_start, "$lte": today_end}
    })
    
    # Week interventions
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    week_interventions = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$gte": week_start}
    })
    
    return {
        "clients": clients_count,
        "total_clients": clients_count,
        "interventions": {
            "planifiees": interventions_planifiees,
            "en_cours": interventions_en_cours,
            "terminees": interventions_terminees,
            "today": today_interventions,
            "week": week_interventions
        },
        "interventions_today": today_interventions,
        "interventions_week": week_interventions,
        "devis": {
            "this_month": devis_this_month,
            "pending": devis_pending,
            "signed_this_month": devis_signed
        },
        "devis_en_attente": devis_pending,
        "devis_signes_mois": devis_signed,
        "factures": {
            "this_month": factures_this_month,
            "pending": factures_pending,
            "pending_amount": round(pending_amount, 2)
        },
        "revenue": {"this_month": round(revenue_this_month, 2)},
        "ca_mois": round(revenue_this_month, 2),
        "montant_en_attente": round(pending_amount, 2)
    }


@router.get("/alerts")
async def get_dashboard_alerts(current_user: dict = Depends(get_current_user)):
    """Get important alerts for the dashboard"""
    ent_id = current_user["entreprise_id"]
    alerts = []
    
    now = datetime.now(timezone.utc)
    
    # Overdue invoices
    overdue_count = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "paye": False,
        "statut": {"$ne": "annulee"},
        "date_echeance": {"$lt": now.isoformat()}
    })
    if overdue_count > 0:
        alerts.append({
            "type": "warning",
            "title": f"{overdue_count} facture(s) en retard",
            "message": "Des factures ont dépassé leur date d'échéance",
            "link": "/factures?filter=overdue"
        })
    
    # Interventions today not started
    today = now.date()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    today_start = datetime(yesterday.year, yesterday.month, yesterday.day, 22, 0, 0, tzinfo=timezone.utc).isoformat()
    today_end = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 2, 0, 0, tzinfo=timezone.utc).isoformat()
    
    pending_today = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$gte": today_start, "$lte": today_end},
        "statut": "planifiee"
    })
    if pending_today > 0:
        alerts.append({
            "type": "info",
            "title": f"{pending_today} intervention(s) planifiée(s) aujourd'hui",
            "message": "Des interventions n'ont pas encore été démarrées",
            "link": "/interventions?filter=today"
        })
    
    # Pending devis requiring action
    pending_devis = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "envoye",
        "date_validite": {"$lt": (now + timedelta(days=7)).isoformat()}
    })
    if pending_devis > 0:
        alerts.append({
            "type": "warning",
            "title": f"{pending_devis} devis expire(nt) bientôt",
            "message": "Relancez vos clients avant l'expiration",
            "link": "/devis?filter=expiring"
        })
    
    return alerts


@router.get("/recent")
async def get_recent_activity(current_user: dict = Depends(get_current_user)):
    """Get recent activity for the dashboard"""
    ent_id = current_user["entreprise_id"]
    
    # Recent interventions
    recent_interventions = await db.interventions.find(
        {"entreprise_id": ent_id},
        {"_id": 0}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    # Enrich with client names
    for intervention in recent_interventions:
        client = await db.clients.find_one(
            {"id": intervention.get("client_id")},
            {"_id": 0, "nom": 1, "prenom": 1}
        )
        intervention["client_name"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else "N/A"
    
    # Recent devis
    recent_devis = await db.devis.find(
        {"entreprise_id": ent_id},
        {"_id": 0, "id": 1, "numero": 1, "montant_ttc": 1, "statut": 1, "created_at": 1, "client_id": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Enrich with client names
    for devis in recent_devis:
        client = await db.clients.find_one(
            {"id": devis.get("client_id")},
            {"_id": 0, "nom": 1, "prenom": 1}
        )
        devis["client_name"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else "N/A"
    
    # Recent factures
    recent_factures = await db.factures.find(
        {"entreprise_id": ent_id},
        {"_id": 0, "id": 1, "numero": 1, "montant_ttc": 1, "paye": 1, "created_at": 1, "client_id": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Enrich with client names
    for facture in recent_factures:
        client = await db.clients.find_one(
            {"id": facture.get("client_id")},
            {"_id": 0, "nom": 1, "prenom": 1}
        )
        facture["client_name"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else "N/A"
    
    return {
        "interventions": [serialize_doc(i) for i in recent_interventions],
        "devis": [serialize_doc(d) for d in recent_devis],
        "factures": [serialize_doc(f) for f in recent_factures]
    }
