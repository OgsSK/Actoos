"""
Super Admin Router - Enhanced Version
Platform owner dashboard - full control over all enterprises
Features: Communication, Analytics, Coupons, Export, Detailed Stats
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import logging
import os
import uuid
import csv
import io

logger = logging.getLogger(__name__)

from dependencies import db, serialize_doc
from auth import get_current_user

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

# Super admin email (platform owner)
SUPER_ADMIN_EMAIL = os.environ.get("SUPER_ADMIN_EMAIL", "salifkane612@gmail.com")

# Plan prices for MRR calculation
PLAN_PRICES = {
    "startup": {"monthly": 49, "yearly": 470},
    "pro": {"monthly": 79, "yearly": 758},
    "enterprise": {"monthly": 149, "yearly": 1430}
}


async def require_super_admin(current_user: dict = Depends(get_current_user)):
    """Check if user is the super admin (platform owner)"""
    user_doc = await db.users.find_one(
        {"id": current_user.get("user_id")}, 
        {"_id": 0, "email": 1}
    )
    
    if not user_doc:
        raise HTTPException(status_code=403, detail="Utilisateur non trouvé")
    
    user_email = user_doc.get("email", "").lower()
    
    if "salifkane612" not in user_email:
        raise HTTPException(status_code=403, detail="Accès réservé au super administrateur")
    
    current_user["email"] = user_email
    return current_user


# ==================== STATISTICS ====================

@router.get("/stats")
async def get_platform_stats(current_user: dict = Depends(require_super_admin)):
    """Get comprehensive platform statistics"""
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    yesterday = (now - timedelta(days=1)).isoformat()
    
    # Get all entreprises
    all_entreprises = await db.entreprises.find({}, {"_id": 0}).to_list(10000)
    
    total_entreprises = len(all_entreprises)
    by_plan = {"startup": 0, "pro": 0, "enterprise": 0}
    by_status = {"active": 0, "trial": 0, "cancelled": 0, "past_due": 0, "suspended": 0}
    by_billing = {"monthly": 0, "yearly": 0}
    recent_signups = 0
    active_today = 0
    active_this_week = 0
    
    mrr = 0
    arr = 0
    
    for ent in all_entreprises:
        plan = ent.get("plan", "startup")
        if plan in by_plan:
            by_plan[plan] += 1
        
        status = ent.get("subscription_status", "active")
        if status in by_status:
            by_status[status] += 1
        
        billing_cycle = ent.get("billing_cycle", "monthly")
        if billing_cycle in by_billing:
            by_billing[billing_cycle] += 1
        
        created = ent.get("created_at", "")
        if created > thirty_days_ago:
            recent_signups += 1
        
        last_activity = ent.get("last_activity", "")
        if last_activity > yesterday:
            active_today += 1
        if last_activity > seven_days_ago:
            active_this_week += 1
        
        # Calculate MRR (only active subscriptions)
        if status == "active":
            plan_price = PLAN_PRICES.get(plan, PLAN_PRICES["startup"])
            if billing_cycle == "yearly":
                mrr += plan_price["yearly"] / 12
            else:
                mrr += plan_price["monthly"]
    
    arr = mrr * 12
    
    # Count users
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_techs = await db.users.count_documents({"role": "tech"})
    active_users_today = await db.users.count_documents({"last_login": {"$gte": yesterday}})
    
    # Count activity
    total_interventions = await db.interventions.count_documents({})
    interventions_this_month = await db.interventions.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    total_devis = await db.devis.count_documents({})
    devis_this_month = await db.devis.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    total_factures = await db.factures.count_documents({})
    factures_this_month = await db.factures.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Cancellations
    cancellations = await db.entreprises.count_documents({
        "subscription_status": "cancelled"
    })
    recent_cancellations = await db.entreprises.count_documents({
        "subscription_status": "cancelled",
        "cancelled_at": {"$gte": seven_days_ago}
    })
    
    # Trial conversions
    trials_expired = await db.entreprises.count_documents({
        "subscription_status": "trial",
        "trial_ends_at": {"$lt": now.isoformat()}
    })
    
    return {
        "entreprises": {
            "total": total_entreprises,
            "by_plan": by_plan,
            "by_status": by_status,
            "by_billing": by_billing,
            "recent_signups": recent_signups,
            "active_today": active_today,
            "active_this_week": active_this_week
        },
        "users": {
            "total": total_users,
            "admins": total_admins,
            "technicians": total_techs,
            "active_today": active_users_today
        },
        "activity": {
            "total_interventions": total_interventions,
            "interventions_this_month": interventions_this_month,
            "total_devis": total_devis,
            "devis_this_month": devis_this_month,
            "total_factures": total_factures,
            "factures_this_month": factures_this_month
        },
        "revenue": {
            "mrr": round(mrr, 2),
            "arr": round(arr, 2),
            "currency": "EUR"
        },
        "cancellations": {
            "total": cancellations,
            "recent": recent_cancellations,
            "trials_expired": trials_expired
        },
        "generated_at": now.isoformat()
    }


@router.get("/growth")
async def get_growth_stats(
    current_user: dict = Depends(require_super_admin),
    months: int = Query(12, le=24)
):
    """Get monthly growth statistics for charts"""
    
    now = datetime.now(timezone.utc)
    monthly_data = []
    
    for i in range(months - 1, -1, -1):
        # Calculate month boundaries
        if i == 0:
            month_end = now
        else:
            month_end = (now.replace(day=1) - timedelta(days=1))
            for _ in range(i - 1):
                month_end = (month_end.replace(day=1) - timedelta(days=1))
        
        month_start = month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_name = month_start.strftime("%Y-%m")
        
        # Count new signups in this month
        new_signups = await db.entreprises.count_documents({
            "created_at": {
                "$gte": month_start.isoformat(),
                "$lt": (month_start + timedelta(days=32)).replace(day=1).isoformat()
            }
        })
        
        # Count cancellations in this month
        cancellations = await db.entreprises.count_documents({
            "cancelled_at": {
                "$gte": month_start.isoformat(),
                "$lt": (month_start + timedelta(days=32)).replace(day=1).isoformat()
            }
        })
        
        # Estimate MRR at end of month
        active_at_month = await db.entreprises.count_documents({
            "created_at": {"$lt": (month_start + timedelta(days=32)).replace(day=1).isoformat()},
            "$or": [
                {"subscription_status": "active"},
                {"cancelled_at": {"$gte": (month_start + timedelta(days=32)).replace(day=1).isoformat()}}
            ]
        })
        
        monthly_data.append({
            "month": month_name,
            "new_signups": new_signups,
            "cancellations": cancellations,
            "net_growth": new_signups - cancellations,
            "estimated_mrr": active_at_month * 60  # Average price estimate
        })
    
    return {
        "monthly_data": monthly_data,
        "period_months": months
    }


# ==================== ENTREPRISES ====================

@router.get("/entreprises")
async def list_all_entreprises(
    current_user: dict = Depends(require_super_admin),
    plan: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", enum=["created_at", "nom", "plan", "last_activity"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    limit: int = Query(50, le=500),
    skip: int = 0
):
    """List all enterprises with detailed info and filtering"""
    
    query = {}
    
    if plan and plan != "all":
        query["plan"] = plan
    
    if status and status != "all":
        query["subscription_status"] = status
    
    if search:
        query["$or"] = [
            {"nom": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    sort_direction = -1 if sort_order == "desc" else 1
    
    entreprises = await db.entreprises.find(
        query, {"_id": 0}
    ).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    total = await db.entreprises.count_documents(query)
    
    # Enrich with additional data
    for ent in entreprises:
        ent_id = ent.get("id")
        
        # User counts
        ent["user_count"] = await db.users.count_documents({"entreprise_id": ent_id})
        ent["admin_count"] = await db.users.count_documents({"entreprise_id": ent_id, "role": "admin"})
        ent["tech_count"] = await db.users.count_documents({"entreprise_id": ent_id, "role": "tech"})
        
        # Activity counts
        ent["intervention_count"] = await db.interventions.count_documents({"entreprise_id": ent_id})
        ent["devis_count"] = await db.devis.count_documents({"entreprise_id": ent_id})
        ent["facture_count"] = await db.factures.count_documents({"entreprise_id": ent_id})
        ent["client_count"] = await db.clients.count_documents({"entreprise_id": ent_id})
        
        # Get last user login
        last_user = await db.users.find_one(
            {"entreprise_id": ent_id, "last_login": {"$exists": True}},
            {"_id": 0, "last_login": 1}
        )
        ent["last_user_login"] = last_user.get("last_login") if last_user else None
        
        # Calculate monthly price
        plan_key = ent.get("plan", "startup")
        billing = ent.get("billing_cycle", "monthly")
        plan_price = PLAN_PRICES.get(plan_key, PLAN_PRICES["startup"])
        ent["monthly_price"] = plan_price["yearly"] / 12 if billing == "yearly" else plan_price["monthly"]
    
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
    """Get comprehensive details about a specific enterprise"""
    
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
    
    # Monthly activity
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    interventions_month = await db.interventions.count_documents({
        "entreprise_id": entreprise_id,
        "created_at": {"$gte": thirty_days_ago}
    })
    devis_month = await db.devis.count_documents({
        "entreprise_id": entreprise_id,
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Get recent activity
    recent_interventions = await db.interventions.find(
        {"entreprise_id": entreprise_id}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get payment history (if stored)
    payments = await db.payments.find(
        {"entreprise_id": entreprise_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Get communications history
    communications = await db.super_admin_communications.find(
        {"entreprise_id": entreprise_id}, {"_id": 0}
    ).sort("sent_at", -1).limit(10).to_list(10)
    
    # Get applied coupons
    coupons = await db.applied_coupons.find(
        {"entreprise_id": entreprise_id}, {"_id": 0}
    ).to_list(10)
    
    return {
        "entreprise": entreprise,
        "users": users,
        "stats": {
            "interventions": interventions,
            "interventions_this_month": interventions_month,
            "devis": devis,
            "devis_this_month": devis_month,
            "factures": factures,
            "clients": clients
        },
        "recent_activity": recent_interventions,
        "payments": payments,
        "communications": communications,
        "coupons": coupons
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
    
    from subscription_service import PLANS
    plan_config = PLANS.get(new_plan, {})
    
    result = await db.entreprises.update_one(
        {"id": entreprise_id},
        {
            "$set": {
                "plan": new_plan,
                "plan_name": plan_config.get("name", new_plan.title()),
                "plan_limits": {
                    "max_admins": plan_config.get("max_admins", 1),
                    "max_technicians": plan_config.get("max_technicians", 3),
                    "max_categories": plan_config.get("max_categories", 1),
                    "multi_sites": plan_config.get("multi_sites", False),
                    "offline_mode": plan_config.get("offline_mode", False),
                    "api_access": plan_config.get("api_access", False),
                },
                "plan_updated_by_admin": True,
                "plan_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Log the action
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "super_admin_plan_change",
        "entreprise_id": entreprise_id,
        "new_plan": new_plan,
        "admin_email": current_user.get("email"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
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
    reason = data.get("reason", "")
    
    if new_status not in ["active", "trial", "cancelled", "suspended", "past_due"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    update_data = {
        "subscription_status": new_status,
        "status_updated_by_admin": True,
        "status_updated_at": datetime.now(timezone.utc).isoformat(),
        "status_change_reason": reason
    }
    
    if new_status == "cancelled":
        update_data["cancelled_at"] = datetime.now(timezone.utc).isoformat()
    elif new_status == "suspended":
        update_data["suspended_at"] = datetime.now(timezone.utc).isoformat()
    elif new_status == "active":
        # Remove suspension/cancellation dates when reactivating
        update_data["cancelled_at"] = None
        update_data["suspended_at"] = None
    
    result = await db.entreprises.update_one(
        {"id": entreprise_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Log the action
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "super_admin_status_change",
        "entreprise_id": entreprise_id,
        "new_status": new_status,
        "reason": reason,
        "admin_email": current_user.get("email"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Statut mis à jour vers {new_status}"}


@router.put("/entreprises/{entreprise_id}/extend-trial")
async def extend_trial(
    entreprise_id: str,
    data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Extend trial period for an enterprise"""
    
    days = data.get("days", 14)
    if days < 1 or days > 90:
        raise HTTPException(status_code=400, detail="Durée invalide (1-90 jours)")
    
    entreprise = await db.entreprises.find_one({"id": entreprise_id}, {"_id": 0})
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Calculate new trial end date
    current_trial_end = entreprise.get("trial_ends_at")
    if current_trial_end:
        try:
            base_date = datetime.fromisoformat(current_trial_end.replace('Z', '+00:00'))
        except:
            base_date = datetime.now(timezone.utc)
    else:
        base_date = datetime.now(timezone.utc)
    
    new_trial_end = (base_date + timedelta(days=days)).isoformat()
    
    await db.entreprises.update_one(
        {"id": entreprise_id},
        {
            "$set": {
                "subscription_status": "trial",
                "trial_ends_at": new_trial_end,
                "trial_extended_by_admin": True,
                "trial_extended_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log the action
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "super_admin_trial_extension",
        "entreprise_id": entreprise_id,
        "days_extended": days,
        "new_trial_end": new_trial_end,
        "admin_email": current_user.get("email"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "message": f"Période d'essai prolongée de {days} jours",
        "new_trial_end": new_trial_end
    }


# ==================== COMMUNICATION ====================

@router.post("/communicate")
async def send_communication(
    data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Send email/notification to one or multiple enterprises"""
    
    target = data.get("target", "single")  # single, plan, all
    entreprise_ids = data.get("entreprise_ids", [])
    plan_filter = data.get("plan")
    subject = data.get("subject", "")
    message = data.get("message", "")
    send_email = data.get("send_email", True)
    send_notification = data.get("send_notification", True)
    
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Sujet et message requis")
    
    # Determine recipients
    recipients = []
    
    if target == "single" and entreprise_ids:
        recipients = await db.entreprises.find(
            {"id": {"$in": entreprise_ids}},
            {"_id": 0, "id": 1, "nom": 1, "email": 1}
        ).to_list(1000)
    elif target == "plan" and plan_filter:
        recipients = await db.entreprises.find(
            {"plan": plan_filter, "subscription_status": {"$ne": "cancelled"}},
            {"_id": 0, "id": 1, "nom": 1, "email": 1}
        ).to_list(1000)
    elif target == "all":
        recipients = await db.entreprises.find(
            {"subscription_status": {"$ne": "cancelled"}},
            {"_id": 0, "id": 1, "nom": 1, "email": 1}
        ).to_list(1000)
    
    if not recipients:
        raise HTTPException(status_code=400, detail="Aucun destinataire trouvé")
    
    sent_count = 0
    errors = []
    
    for recipient in recipients:
        try:
            # Store communication record
            comm_record = {
                "id": str(uuid.uuid4()),
                "entreprise_id": recipient["id"],
                "entreprise_nom": recipient.get("nom"),
                "recipient_email": recipient.get("email"),
                "subject": subject,
                "message": message,
                "type": "announcement",
                "sent_by": current_user.get("email"),
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "email_sent": False,
                "notification_sent": False
            }
            
            # Send email if requested
            if send_email and recipient.get("email"):
                try:
                    from email_service import send_super_admin_email
                    await send_super_admin_email(
                        to_email=recipient["email"],
                        subject=subject,
                        message=message,
                        entreprise_name=recipient.get("nom")
                    )
                    comm_record["email_sent"] = True
                except Exception as e:
                    logger.error(f"Failed to send email to {recipient['email']}: {e}")
                    comm_record["email_error"] = str(e)
            
            # Create in-app notification if requested
            if send_notification:
                notification = {
                    "id": str(uuid.uuid4()),
                    "entreprise_id": recipient["id"],
                    "type": "super_admin_message",
                    "title": subject,
                    "message": message,
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.notifications.insert_one(notification)
                comm_record["notification_sent"] = True
            
            await db.super_admin_communications.insert_one(comm_record)
            sent_count += 1
            
        except Exception as e:
            errors.append({"entreprise_id": recipient["id"], "error": str(e)})
    
    return {
        "message": f"Communication envoyée à {sent_count} entreprise(s)",
        "sent_count": sent_count,
        "total_recipients": len(recipients),
        "errors": errors if errors else None
    }


@router.get("/communications")
async def get_communications_history(
    current_user: dict = Depends(require_super_admin),
    limit: int = Query(50, le=200)
):
    """Get history of all super admin communications"""
    
    communications = await db.super_admin_communications.find(
        {}, {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    return {"communications": communications, "total": len(communications)}


@router.get("/notifications")
async def get_entreprise_notifications(
    entreprise_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Get notifications for a specific enterprise"""
    
    notifications = await db.notifications.find(
        {"entreprise_id": entreprise_id}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return {"notifications": notifications}


# ==================== COUPONS & DISCOUNTS ====================

@router.post("/coupons")
async def create_coupon(
    data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Create a discount coupon"""
    
    code = data.get("code", "").upper().strip()
    discount_type = data.get("discount_type", "percentage")  # percentage, fixed
    discount_value = data.get("discount_value", 0)
    valid_plans = data.get("valid_plans", ["startup", "pro", "enterprise"])
    max_uses = data.get("max_uses", -1)  # -1 = unlimited
    expires_at = data.get("expires_at")
    description = data.get("description", "")
    
    if not code:
        code = f"PROMO{uuid.uuid4().hex[:6].upper()}"
    
    # Check if code already exists
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code existe déjà")
    
    coupon = {
        "id": str(uuid.uuid4()),
        "code": code,
        "discount_type": discount_type,
        "discount_value": discount_value,
        "valid_plans": valid_plans,
        "max_uses": max_uses,
        "current_uses": 0,
        "expires_at": expires_at,
        "description": description,
        "active": True,
        "created_by": current_user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.coupons.insert_one(coupon)
    
    return {"message": "Coupon créé", "coupon": {k: v for k, v in coupon.items() if k != "_id"}}


@router.get("/coupons")
async def list_coupons(
    current_user: dict = Depends(require_super_admin),
    active_only: bool = True
):
    """List all coupons"""
    
    query = {}
    if active_only:
        query["active"] = True
    
    coupons = await db.coupons.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"coupons": coupons}


@router.put("/coupons/{coupon_id}")
async def update_coupon(
    coupon_id: str,
    data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Update a coupon (activate/deactivate)"""
    
    update_fields = {}
    
    if "active" in data:
        update_fields["active"] = data["active"]
    if "max_uses" in data:
        update_fields["max_uses"] = data["max_uses"]
    if "expires_at" in data:
        update_fields["expires_at"] = data["expires_at"]
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    
    result = await db.coupons.update_one(
        {"id": coupon_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Coupon non trouvé")
    
    return {"message": "Coupon mis à jour"}


@router.post("/entreprises/{entreprise_id}/apply-coupon")
async def apply_coupon_to_entreprise(
    entreprise_id: str,
    data: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Apply a coupon/discount to a specific enterprise"""
    
    discount_type = data.get("discount_type", "percentage")  # percentage, fixed, free_months
    discount_value = data.get("discount_value", 0)
    duration_months = data.get("duration_months", 1)
    reason = data.get("reason", "")
    
    entreprise = await db.entreprises.find_one({"id": entreprise_id}, {"_id": 0})
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    applied_coupon = {
        "id": str(uuid.uuid4()),
        "entreprise_id": entreprise_id,
        "discount_type": discount_type,
        "discount_value": discount_value,
        "duration_months": duration_months,
        "reason": reason,
        "applied_by": current_user.get("email"),
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30 * duration_months)).isoformat(),
        "active": True
    }
    
    await db.applied_coupons.insert_one(applied_coupon)
    
    # Update entreprise with discount info
    await db.entreprises.update_one(
        {"id": entreprise_id},
        {
            "$set": {
                "has_active_discount": True,
                "discount_type": discount_type,
                "discount_value": discount_value,
                "discount_expires_at": applied_coupon["expires_at"]
            }
        }
    )
    
    return {
        "message": f"Réduction appliquée: {discount_value}{'%' if discount_type == 'percentage' else '€'} pour {duration_months} mois"
    }


# ==================== EXPORT ====================

@router.get("/export/entreprises")
async def export_entreprises_csv(
    current_user: dict = Depends(require_super_admin),
    plan: Optional[str] = None,
    status: Optional[str] = None
):
    """Export enterprises list as CSV"""
    
    query = {}
    if plan:
        query["plan"] = plan
    if status:
        query["subscription_status"] = status
    
    entreprises = await db.entreprises.find(query, {"_id": 0}).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Nom", "Email", "Plan", "Statut", "Cycle facturation",
        "Date inscription", "Dernière activité", "Nb utilisateurs",
        "Nb interventions", "Nb devis", "Nb factures"
    ])
    
    for ent in entreprises:
        ent_id = ent.get("id")
        user_count = await db.users.count_documents({"entreprise_id": ent_id})
        intervention_count = await db.interventions.count_documents({"entreprise_id": ent_id})
        devis_count = await db.devis.count_documents({"entreprise_id": ent_id})
        facture_count = await db.factures.count_documents({"entreprise_id": ent_id})
        
        writer.writerow([
            ent.get("id", ""),
            ent.get("nom", ""),
            ent.get("email", ""),
            ent.get("plan", ""),
            ent.get("subscription_status", ""),
            ent.get("billing_cycle", "monthly"),
            ent.get("created_at", "")[:10] if ent.get("created_at") else "",
            ent.get("last_activity", "")[:10] if ent.get("last_activity") else "",
            user_count,
            intervention_count,
            devis_count,
            facture_count
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=entreprises_export_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


# ==================== FEEDBACKS & CANCELLATIONS ====================

@router.get("/feedbacks")
async def get_feedbacks(
    current_user: dict = Depends(require_super_admin),
    feedback_type: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """Get customer feedbacks and support requests"""
    
    query = {}
    if feedback_type:
        query["type"] = feedback_type
    
    feedbacks = await db.feedbacks.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get counts by type
    counts = {
        "total": await db.feedbacks.count_documents({}),
        "feedback": await db.feedbacks.count_documents({"type": "feedback"}),
        "bug": await db.feedbacks.count_documents({"type": "bug"}),
        "feature_request": await db.feedbacks.count_documents({"type": "feature_request"}),
        "cancellation_reason": await db.feedbacks.count_documents({"type": "cancellation_reason"})
    }
    
    return {"feedbacks": feedbacks, "counts": counts}


@router.post("/feedbacks")
async def create_feedback_endpoint(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Allow any user to submit feedback"""
    
    feedback = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user.get("entreprise_id"),
        "user_id": current_user.get("user_id"),
        "user_email": current_user.get("email"),
        "type": data.get("type", "feedback"),
        "subject": data.get("subject", ""),
        "message": data.get("message", ""),
        "rating": data.get("rating"),
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
    
    # Aggregate reasons
    reason_counts = {}
    for reason in cancellation_reasons:
        r = reason.get("subject", "Autre")
        reason_counts[r] = reason_counts.get(r, 0) + 1
    
    return {
        "cancellations": cancelled,
        "reasons": cancellation_reasons,
        "reason_summary": reason_counts,
        "period_days": days,
        "total": len(cancelled)
    }


# ==================== REVENUE ====================

@router.get("/revenue")
async def get_revenue_stats(
    current_user: dict = Depends(require_super_admin),
    months: int = Query(12, le=24)
):
    """Get detailed revenue statistics"""
    
    # Get all active subscriptions
    active = await db.entreprises.find({
        "subscription_status": "active"
    }, {"_id": 0, "plan": 1, "billing_cycle": 1, "created_at": 1}).to_list(10000)
    
    # Calculate current MRR
    current_mrr = 0
    by_plan_mrr = {"startup": 0, "pro": 0, "enterprise": 0}
    by_billing = {"monthly": 0, "yearly": 0}
    
    for ent in active:
        plan = ent.get("plan", "startup")
        billing = ent.get("billing_cycle", "monthly")
        plan_price = PLAN_PRICES.get(plan, PLAN_PRICES["startup"])
        
        if billing == "yearly":
            monthly_value = plan_price["yearly"] / 12
            by_billing["yearly"] += 1
        else:
            monthly_value = plan_price["monthly"]
            by_billing["monthly"] += 1
        
        current_mrr += monthly_value
        if plan in by_plan_mrr:
            by_plan_mrr[plan] += monthly_value
    
    return {
        "current_mrr": round(current_mrr, 2),
        "arr": round(current_mrr * 12, 2),
        "active_subscriptions": len(active),
        "by_plan": {
            plan: {"count": sum(1 for e in active if e.get("plan") == plan), "mrr": round(mrr, 2)}
            for plan, mrr in by_plan_mrr.items()
        },
        "by_billing_cycle": by_billing,
        "average_revenue_per_user": round(current_mrr / len(active), 2) if active else 0
    }


# ==================== ACTIVITY LOG ====================

@router.get("/activity-log")
async def get_activity_log(
    current_user: dict = Depends(require_super_admin),
    action_type: Optional[str] = None,
    limit: int = Query(100, le=500)
):
    """Get platform-wide activity log"""
    
    query = {}
    if action_type:
        query["action"] = {"$regex": action_type, "$options": "i"}
    
    logs = await db.audit_logs.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"logs": logs, "total": len(logs)}


# ==================== DELETE ====================

@router.delete("/entreprises/{entreprise_id}")
async def delete_entreprise(
    entreprise_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Delete an enterprise and all its data (dangerous!)"""
    
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
    await db.photos.delete_many({"entreprise_id": entreprise_id})
    await db.sites.delete_many({"entreprise_id": entreprise_id})
    await db.notifications.delete_many({"entreprise_id": entreprise_id})
    await db.entreprises.delete_one({"id": entreprise_id})
    
    # Log the action
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "super_admin_delete_entreprise",
        "entreprise_id": entreprise_id,
        "entreprise_name": entreprise.get("nom"),
        "admin_email": current_user.get("email"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    logger.warning(f"Super admin deleted enterprise {entreprise_id} ({entreprise.get('nom')})")
    
    return {"message": f"Entreprise {entreprise.get('nom')} supprimée"}
