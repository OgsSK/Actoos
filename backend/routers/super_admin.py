"""
Super Admin Router
Platform owner dashboard - full control over all enterprises
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)

from dependencies import db, serialize_doc
from auth import get_current_user

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

# Super admin email (platform owner)
SUPER_ADMIN_EMAIL = os.environ.get("SUPER_ADMIN_EMAIL", "salifkane612@gmail.com")

def require_super_admin(current_user: dict = Depends(get_current_user)):
    """Check if user is the super admin (platform owner)"""
    # Accept any email variant with salifkane612
    user_email = current_user.get("email", "").lower()
    if "salifkane612" not in user_email:
        raise HTTPException(status_code=403, detail="Accès réservé au super administrateur")
    return current_user


@router.get("/stats")
async def get_platform_stats(current_user: dict = Depends(require_super_admin)):
    """Get global platform statistics"""
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    
    # Count enterprises by plan
    all_entreprises = await db.entreprises.find({}, {"_id": 0}).to_list(1000)
    
    total_entreprises = len(all_entreprises)
    by_plan = {"startup": 0, "pro": 0, "enterprise": 0}
    by_status = {"active": 0, "trial": 0, "cancelled": 0, "past_due": 0}
    recent_signups = 0
    
    for ent in all_entreprises:
        plan = ent.get("plan", "startup")
        if plan in by_plan:
            by_plan[plan] += 1
        
        status = ent.get("subscription_status", "active")
        if status in by_status:
            by_status[status] += 1
        
        created = ent.get("created_at", "")
        if created > thirty_days_ago:
            recent_signups += 1
    
    # Count users
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_techs = await db.users.count_documents({"role": "tech"})
    
    # Count interventions
    total_interventions = await db.interventions.count_documents({})
    interventions_this_month = await db.interventions.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Count devis and factures
    total_devis = await db.devis.count_documents({})
    total_factures = await db.factures.count_documents({})
    
    # Cancellations
    cancellations = await db.entreprises.count_documents({
        "subscription_status": "cancelled"
    })
    recent_cancellations = await db.entreprises.find({
        "subscription_status": "cancelled",
        "cancelled_at": {"$gte": seven_days_ago}
    }, {"_id": 0}).to_list(100)
    
    # Calculate MRR (Monthly Recurring Revenue)
    plan_prices = {"startup": 29, "pro": 79, "enterprise": 199}
    mrr = sum(plan_prices.get(ent.get("plan", "startup"), 0) 
              for ent in all_entreprises 
              if ent.get("subscription_status") == "active")
    
    return {
        "entreprises": {
            "total": total_entreprises,
            "by_plan": by_plan,
            "by_status": by_status,
            "recent_signups": recent_signups
        },
        "users": {
            "total": total_users,
            "admins": total_admins,
            "technicians": total_techs
        },
        "activity": {
            "total_interventions": total_interventions,
            "interventions_this_month": interventions_this_month,
            "total_devis": total_devis,
            "total_factures": total_factures
        },
        "revenue": {
            "mrr": mrr,
            "currency": "EUR"
        },
        "cancellations": {
            "total": cancellations,
            "recent": len(recent_cancellations),
            "recent_list": recent_cancellations[:5]
        },
        "generated_at": now.isoformat()
    }


@router.get("/entreprises")
async def list_all_entreprises(
    current_user: dict = Depends(require_super_admin),
    plan: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0
):
    """List all enterprises with filtering"""
    
    query = {}
    
    if plan:
        query["plan"] = plan
    
    if status:
        query["subscription_status"] = status
    
    if search:
        query["$or"] = [
            {"nom": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    entreprises = await db.entreprises.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.entreprises.count_documents(query)
    
    # Add user counts for each enterprise
    for ent in entreprises:
        ent["user_count"] = await db.users.count_documents({"entreprise_id": ent["id"]})
        ent["intervention_count"] = await db.interventions.count_documents({"entreprise_id": ent["id"]})
    
    return {
        "entreprises": entreprises,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/entreprises/{entreprise_id}")
async def get_entreprise_details(
    entreprise_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Get detailed info about a specific enterprise"""
    
    entreprise = await db.entreprises.find_one(
        {"id": entreprise_id}, {"_id": 0}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Get users
    users = await db.users.find(
        {"entreprise_id": entreprise_id}, 
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    # Get activity stats
    interventions = await db.interventions.count_documents({"entreprise_id": entreprise_id})
    devis = await db.devis.count_documents({"entreprise_id": entreprise_id})
    factures = await db.factures.count_documents({"entreprise_id": entreprise_id})
    clients = await db.clients.count_documents({"entreprise_id": entreprise_id})
    
    # Get recent activity
    recent_interventions = await db.interventions.find(
        {"entreprise_id": entreprise_id}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "entreprise": entreprise,
        "users": users,
        "stats": {
            "interventions": interventions,
            "devis": devis,
            "factures": factures,
            "clients": clients
        },
        "recent_activity": recent_interventions
    }


@router.put("/entreprises/{entreprise_id}/plan")
async def update_entreprise_plan(
    entreprise_id: str,
    data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Update enterprise plan (super admin override)"""
    
    new_plan = data.get("plan")
    if new_plan not in ["startup", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    # Get plan limits
    from subscription_service import PLANS
    plan_config = PLANS.get(new_plan, {})
    
    result = await db.entreprises.update_one(
        {"id": entreprise_id},
        {
            "$set": {
                "plan": new_plan,
                "plan_name": plan_config.get("name", new_plan.title()),
                "plan_limits": plan_config.get("limits", {}),
                "plan_updated_by_admin": True,
                "plan_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    logger.info(f"Super admin updated plan for {entreprise_id} to {new_plan}")
    
    return {"message": f"Plan mis à jour vers {new_plan}"}


@router.put("/entreprises/{entreprise_id}/status")
async def update_entreprise_status(
    entreprise_id: str,
    data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Update enterprise subscription status"""
    
    new_status = data.get("status")
    if new_status not in ["active", "trial", "cancelled", "suspended", "past_due"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    update_data = {
        "subscription_status": new_status,
        "status_updated_by_admin": True,
        "status_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if new_status == "cancelled":
        update_data["cancelled_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.entreprises.update_one(
        {"id": entreprise_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    return {"message": f"Statut mis à jour vers {new_status}"}


@router.get("/feedbacks")
async def get_feedbacks(
    current_user: dict = Depends(require_super_admin),
    limit: int = Query(50, le=200)
):
    """Get customer feedbacks and support requests"""
    
    feedbacks = await db.feedbacks.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"feedbacks": feedbacks, "total": len(feedbacks)}


@router.post("/feedbacks")
async def create_feedback_endpoint(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Allow any user to submit feedback"""
    import uuid
    
    feedback = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user.get("entreprise_id"),
        "user_id": current_user.get("id"),
        "user_email": current_user.get("email"),
        "type": data.get("type", "feedback"),  # feedback, bug, feature_request, cancellation_reason
        "subject": data.get("subject", ""),
        "message": data.get("message", ""),
        "rating": data.get("rating"),  # 1-5 stars
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.feedbacks.insert_one(feedback)
    
    return {"message": "Feedback envoyé", "id": feedback["id"]}


@router.get("/cancellations")
async def get_cancellations(
    current_user: dict = Depends(require_super_admin),
    days: int = Query(30, le=365)
):
    """Get recent cancellations with reasons"""
    
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    cancelled = await db.entreprises.find({
        "subscription_status": "cancelled",
        "cancelled_at": {"$gte": since}
    }, {"_id": 0}).sort("cancelled_at", -1).to_list(100)
    
    # Get cancellation reasons from feedbacks
    cancellation_reasons = await db.feedbacks.find({
        "type": "cancellation_reason",
        "created_at": {"$gte": since}
    }, {"_id": 0}).to_list(100)
    
    return {
        "cancellations": cancelled,
        "reasons": cancellation_reasons,
        "period_days": days
    }


@router.get("/revenue")
async def get_revenue_stats(
    current_user: dict = Depends(require_super_admin),
    months: int = Query(12, le=24)
):
    """Get revenue statistics over time"""
    
    plan_prices = {"startup": 29, "pro": 79, "enterprise": 199}
    
    # Get all active subscriptions
    active = await db.entreprises.find({
        "subscription_status": "active"
    }, {"_id": 0, "plan": 1, "created_at": 1}).to_list(1000)
    
    # Calculate current MRR
    current_mrr = sum(plan_prices.get(ent.get("plan", "startup"), 0) for ent in active)
    
    # Get subscription history (simplified - just count by month)
    now = datetime.now(timezone.utc)
    monthly_data = []
    
    for i in range(months):
        month_start = (now - timedelta(days=30 * i)).replace(day=1)
        month_name = month_start.strftime("%Y-%m")
        
        # Count active at that time (approximation)
        count = await db.entreprises.count_documents({
            "created_at": {"$lte": month_start.isoformat()},
            "$or": [
                {"subscription_status": "active"},
                {"cancelled_at": {"$gt": month_start.isoformat()}}
            ]
        })
        
        monthly_data.append({
            "month": month_name,
            "estimated_mrr": count * 50  # Average price estimate
        })
    
    return {
        "current_mrr": current_mrr,
        "arr": current_mrr * 12,
        "active_subscriptions": len(active),
        "by_plan": {
            plan: sum(1 for ent in active if ent.get("plan") == plan)
            for plan in ["startup", "pro", "enterprise"]
        },
        "monthly_trend": list(reversed(monthly_data))
    }


@router.get("/activity-log")
async def get_activity_log(
    current_user: dict = Depends(require_super_admin),
    limit: int = Query(100, le=500)
):
    """Get platform-wide activity log"""
    
    logs = await db.audit_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"logs": logs, "total": len(logs)}


@router.delete("/entreprises/{entreprise_id}")
async def delete_entreprise(
    entreprise_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Delete an enterprise and all its data (dangerous!)"""
    
    # Safety check - don't delete your own
    if current_user.get("entreprise_id") == entreprise_id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre entreprise")
    
    entreprise = await db.entreprises.find_one({"id": entreprise_id})
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Delete all related data
    await db.users.delete_many({"entreprise_id": entreprise_id})
    await db.clients.delete_many({"entreprise_id": entreprise_id})
    await db.interventions.delete_many({"entreprise_id": entreprise_id})
    await db.devis.delete_many({"entreprise_id": entreprise_id})
    await db.factures.delete_many({"entreprise_id": entreprise_id})
    await db.categories.delete_many({"entreprise_id": entreprise_id})
    await db.entreprises.delete_one({"id": entreprise_id})
    
    logger.warning(f"Super admin deleted enterprise {entreprise_id} ({entreprise.get('nom')})")
    
    return {"message": f"Entreprise {entreprise.get('nom')} supprimée"}
