"""
Analytics Service for Actoos
Provides advanced reporting and business intelligence metrics
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


async def get_revenue_analytics(db, entreprise_id: str, period: str = "month") -> Dict:
    """
    Get revenue analytics for the specified period
    
    Args:
        db: Database connection
        entreprise_id: Company ID
        period: 'week', 'month', 'quarter', 'year'
    
    Returns:
        Dict with revenue metrics and trends
    """
    now = datetime.now(timezone.utc)
    
    # Calculate date ranges based on period
    if period == "week":
        current_start = now - timedelta(days=now.weekday())
        previous_start = current_start - timedelta(weeks=1)
        previous_end = current_start
    elif period == "month":
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = (current_start - timedelta(days=1)).replace(day=1)
        previous_end = current_start
    elif period == "quarter":
        quarter = (now.month - 1) // 3
        current_start = now.replace(month=quarter * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start - timedelta(days=90)
        previous_end = current_start
    else:  # year
        current_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start.replace(year=now.year - 1)
        previous_end = current_start
    
    current_start_str = current_start.isoformat()
    previous_start_str = previous_start.isoformat()
    previous_end_str = previous_end.isoformat()
    
    # Current period revenue (paid invoices)
    current_revenue_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "statut": "payee",
            "date_paiement": {"$gte": current_start_str}
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$total_ttc"},
            "count": {"$sum": 1}
        }}
    ]
    current_result = await db.factures.aggregate(current_revenue_pipeline).to_list(1)
    current_revenue = current_result[0]["total"] if current_result else 0
    current_count = current_result[0]["count"] if current_result else 0
    
    # Previous period revenue
    previous_revenue_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "statut": "payee",
            "date_paiement": {"$gte": previous_start_str, "$lt": previous_end_str}
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$total_ttc"},
            "count": {"$sum": 1}
        }}
    ]
    previous_result = await db.factures.aggregate(previous_revenue_pipeline).to_list(1)
    previous_revenue = previous_result[0]["total"] if previous_result else 0
    
    # Calculate growth
    if previous_revenue > 0:
        growth_percent = ((current_revenue - previous_revenue) / previous_revenue) * 100
    else:
        growth_percent = 100 if current_revenue > 0 else 0
    
    # Pending invoices
    pending_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "statut": {"$in": ["emise", "brouillon"]}
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": {"$subtract": ["$total_ttc", {"$ifNull": ["$montant_paye", 0]}]}},
            "count": {"$sum": 1}
        }}
    ]
    pending_result = await db.factures.aggregate(pending_pipeline).to_list(1)
    pending_amount = pending_result[0]["total"] if pending_result else 0
    pending_count = pending_result[0]["count"] if pending_result else 0
    
    # Overdue invoices
    overdue_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "statut": "emise",
            "date_echeance": {"$lt": now.isoformat()}
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": {"$subtract": ["$total_ttc", {"$ifNull": ["$montant_paye", 0]}]}},
            "count": {"$sum": 1}
        }}
    ]
    overdue_result = await db.factures.aggregate(overdue_pipeline).to_list(1)
    overdue_amount = overdue_result[0]["total"] if overdue_result else 0
    overdue_count = overdue_result[0]["count"] if overdue_result else 0
    
    return {
        "period": period,
        "current_revenue": round(current_revenue, 2),
        "current_invoices_paid": current_count,
        "previous_revenue": round(previous_revenue, 2),
        "growth_percent": round(growth_percent, 1),
        "pending_amount": round(pending_amount, 2),
        "pending_count": pending_count,
        "overdue_amount": round(overdue_amount, 2),
        "overdue_count": overdue_count,
        "average_invoice": round(current_revenue / current_count, 2) if current_count > 0 else 0
    }


async def get_intervention_analytics(db, entreprise_id: str, period: str = "month") -> Dict:
    """
    Get intervention/mission analytics
    """
    now = datetime.now(timezone.utc)
    
    if period == "week":
        start_date = now - timedelta(days=now.weekday())
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        quarter = (now.month - 1) // 3
        start_date = now.replace(month=quarter * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    start_str = start_date.isoformat()
    
    # Interventions by status
    status_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "created_at": {"$gte": start_str}
        }},
        {"$group": {
            "_id": "$statut",
            "count": {"$sum": 1}
        }}
    ]
    status_result = await db.interventions.aggregate(status_pipeline).to_list(20)
    by_status = {r["_id"]: r["count"] for r in status_result}
    
    # Total and completed
    total = sum(by_status.values())
    completed = by_status.get("terminee", 0) + by_status.get("facturee", 0)
    in_progress = by_status.get("en_cours", 0)
    planned = by_status.get("planifiee", 0)
    cancelled = by_status.get("annulee", 0)
    
    # Completion rate
    completion_rate = (completed / (total - cancelled) * 100) if (total - cancelled) > 0 else 0
    
    # By priority
    priority_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "created_at": {"$gte": start_str}
        }},
        {"$group": {
            "_id": "$priorite",
            "count": {"$sum": 1}
        }}
    ]
    priority_result = await db.interventions.aggregate(priority_pipeline).to_list(10)
    by_priority = {r["_id"] or "normale": r["count"] for r in priority_result}
    
    # By category
    category_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "created_at": {"$gte": start_str},
            "categorie_id": {"$exists": True, "$ne": None}
        }},
        {"$group": {
            "_id": "$categorie_id",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    category_result = await db.interventions.aggregate(category_pipeline).to_list(5)
    
    # Get category names
    category_ids = [r["_id"] for r in category_result]
    categories = await db.categories.find({"id": {"$in": category_ids}}, {"_id": 0, "id": 1, "nom": 1}).to_list(10)
    category_names = {c["id"]: c["nom"] for c in categories}
    
    by_category = [
        {"category": category_names.get(r["_id"], r["_id"]), "count": r["count"]}
        for r in category_result
    ]
    
    return {
        "period": period,
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "planned": planned,
        "cancelled": cancelled,
        "completion_rate": round(completion_rate, 1),
        "by_status": by_status,
        "by_priority": by_priority,
        "by_category": by_category
    }


async def get_technician_performance(db, entreprise_id: str, period: str = "month") -> List[Dict]:
    """
    Get performance metrics for each technician
    """
    now = datetime.now(timezone.utc)
    
    if period == "week":
        start_date = now - timedelta(days=now.weekday())
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    start_str = start_date.isoformat()
    
    # Get technicians
    technicians = await db.users.find(
        {"entreprise_id": entreprise_id, "role": "tech"},
        {"_id": 0, "id": 1, "nom": 1, "prenom": 1}
    ).to_list(50)
    
    results = []
    for tech in technicians:
        tech_id = tech["id"]
        
        # Interventions completed
        completed = await db.interventions.count_documents({
            "entreprise_id": entreprise_id,
            "technicien_id": tech_id,
            "statut": {"$in": ["terminee", "facturee"]},
            "heure_fin": {"$gte": start_str}
        })
        
        # Interventions assigned
        assigned = await db.interventions.count_documents({
            "entreprise_id": entreprise_id,
            "technicien_id": tech_id,
            "created_at": {"$gte": start_str}
        })
        
        # Average completion time (simplified)
        time_pipeline = [
            {"$match": {
                "entreprise_id": entreprise_id,
                "technicien_id": tech_id,
                "statut": {"$in": ["terminee", "facturee"]},
                "heure_debut": {"$exists": True},
                "heure_fin": {"$exists": True, "$gte": start_str}
            }},
            {"$project": {
                "duration": {
                    "$divide": [
                        {"$subtract": [{"$toDate": "$heure_fin"}, {"$toDate": "$heure_debut"}]},
                        60000  # Convert to minutes
                    ]
                }
            }},
            {"$group": {
                "_id": None,
                "avg_duration": {"$avg": "$duration"}
            }}
        ]
        time_result = await db.interventions.aggregate(time_pipeline).to_list(1)
        avg_duration = time_result[0]["avg_duration"] if time_result else 0
        
        results.append({
            "technician_id": tech_id,
            "name": f"{tech.get('prenom', '')} {tech.get('nom', '')}".strip(),
            "interventions_completed": completed,
            "interventions_assigned": assigned,
            "completion_rate": round(completed / assigned * 100, 1) if assigned > 0 else 0,
            "avg_duration_minutes": round(avg_duration, 0) if avg_duration else None
        })
    
    # Sort by completed interventions
    results.sort(key=lambda x: x["interventions_completed"], reverse=True)
    
    return results


async def get_client_analytics(db, entreprise_id: str, period: str = "month") -> Dict:
    """
    Get client-related analytics
    """
    now = datetime.now(timezone.utc)
    
    if period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    start_str = start_date.isoformat()
    
    # Total clients
    total_clients = await db.clients.count_documents({"entreprise_id": entreprise_id})
    
    # New clients this period
    new_clients = await db.clients.count_documents({
        "entreprise_id": entreprise_id,
        "created_at": {"$gte": start_str}
    })
    
    # Top clients by revenue
    top_clients_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "statut": "payee"
        }},
        {"$group": {
            "_id": "$client_id",
            "total_revenue": {"$sum": "$total_ttc"},
            "invoice_count": {"$sum": 1}
        }},
        {"$sort": {"total_revenue": -1}},
        {"$limit": 5}
    ]
    top_clients_result = await db.factures.aggregate(top_clients_pipeline).to_list(5)
    
    # Get client names
    client_ids = [r["_id"] for r in top_clients_result]
    clients = await db.clients.find(
        {"id": {"$in": client_ids}},
        {"_id": 0, "id": 1, "nom": 1, "prenom": 1}
    ).to_list(10)
    client_names = {c["id"]: f"{c.get('nom', '')} {c.get('prenom', '')}".strip() for c in clients}
    
    top_clients = [
        {
            "client_id": r["_id"],
            "name": client_names.get(r["_id"], "Client"),
            "total_revenue": round(r["total_revenue"], 2),
            "invoice_count": r["invoice_count"]
        }
        for r in top_clients_result
    ]
    
    # Clients by type
    type_pipeline = [
        {"$match": {"entreprise_id": entreprise_id}},
        {"$group": {
            "_id": "$type_client",
            "count": {"$sum": 1}
        }}
    ]
    type_result = await db.clients.aggregate(type_pipeline).to_list(10)
    by_type = {r["_id"] or "particulier": r["count"] for r in type_result}
    
    return {
        "period": period,
        "total_clients": total_clients,
        "new_clients": new_clients,
        "top_clients": top_clients,
        "by_type": by_type
    }


async def get_devis_analytics(db, entreprise_id: str, period: str = "month") -> Dict:
    """
    Get quote/devis analytics
    """
    now = datetime.now(timezone.utc)
    
    if period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    start_str = start_date.isoformat()
    
    # Devis by status
    status_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "created_at": {"$gte": start_str}
        }},
        {"$group": {
            "_id": "$statut",
            "count": {"$sum": 1},
            "total": {"$sum": "$total_ttc"}
        }}
    ]
    status_result = await db.devis.aggregate(status_pipeline).to_list(10)
    
    by_status = {}
    total_count = 0
    total_amount = 0
    signed_count = 0
    signed_amount = 0
    
    for r in status_result:
        status = r["_id"]
        by_status[status] = {"count": r["count"], "amount": round(r["total"], 2)}
        total_count += r["count"]
        total_amount += r["total"]
        if status == "signe":
            signed_count = r["count"]
            signed_amount = r["total"]
    
    # Conversion rate
    sent_count = by_status.get("envoye", {}).get("count", 0) + signed_count
    conversion_rate = (signed_count / sent_count * 100) if sent_count > 0 else 0
    
    # Average time to sign
    sign_time_pipeline = [
        {"$match": {
            "entreprise_id": entreprise_id,
            "statut": "signe",
            "created_at": {"$gte": start_str},
            "date_signature": {"$exists": True}
        }},
        {"$project": {
            "days_to_sign": {
                "$divide": [
                    {"$subtract": [{"$toDate": "$date_signature"}, {"$toDate": "$created_at"}]},
                    86400000  # Convert to days
                ]
            }
        }},
        {"$group": {
            "_id": None,
            "avg_days": {"$avg": "$days_to_sign"}
        }}
    ]
    sign_time_result = await db.devis.aggregate(sign_time_pipeline).to_list(1)
    avg_days_to_sign = sign_time_result[0]["avg_days"] if sign_time_result else None
    
    return {
        "period": period,
        "total_count": total_count,
        "total_amount": round(total_amount, 2),
        "signed_count": signed_count,
        "signed_amount": round(signed_amount, 2),
        "conversion_rate": round(conversion_rate, 1),
        "avg_days_to_sign": round(avg_days_to_sign, 1) if avg_days_to_sign else None,
        "by_status": by_status
    }


async def get_trend_data(db, entreprise_id: str, metric: str = "revenue", days: int = 30) -> List[Dict]:
    """
    Get daily trend data for charts
    
    Args:
        metric: 'revenue', 'interventions', 'devis'
        days: Number of days to include
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    results = []
    
    for i in range(days):
        day = start_date + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        if metric == "revenue":
            pipeline = [
                {"$match": {
                    "entreprise_id": entreprise_id,
                    "statut": "payee",
                    "date_paiement": {"$gte": day_start, "$lte": day_end}
                }},
                {"$group": {"_id": None, "value": {"$sum": "$total_ttc"}}}
            ]
            result = await db.factures.aggregate(pipeline).to_list(1)
            value = result[0]["value"] if result else 0
            
        elif metric == "interventions":
            value = await db.interventions.count_documents({
                "entreprise_id": entreprise_id,
                "statut": {"$in": ["terminee", "facturee"]},
                "heure_fin": {"$gte": day_start, "$lte": day_end}
            })
            
        elif metric == "devis":
            value = await db.devis.count_documents({
                "entreprise_id": entreprise_id,
                "created_at": {"$gte": day_start, "$lte": day_end}
            })
        else:
            value = 0
        
        results.append({
            "date": day.strftime("%Y-%m-%d"),
            "label": day.strftime("%d/%m"),
            "value": round(value, 2) if metric == "revenue" else value
        })
    
    return results
