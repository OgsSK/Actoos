"""
Scheduled Tasks Router - Trial Reminders, Automated Emails
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from dependencies import db
from auth import get_current_user
from email_service import send_trial_reminder_email

router = APIRouter(prefix="/tasks", tags=["Scheduled Tasks"])
logger = logging.getLogger(__name__)


# =====================================================
# TRIAL REMINDER ENDPOINTS
# =====================================================

@router.post("/send-trial-reminders")
async def send_trial_reminders(
    background_tasks: BackgroundTasks,
    days_before: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """
    Send trial expiration reminder emails
    Called by cron job or manually by super admin
    
    - J-3: First reminder
    - J-1: Urgent reminder
    - J0: Last chance reminder
    """
    # Only super admin can trigger this
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Accès réservé au super admin")
    
    now = datetime.now(timezone.utc)
    target_date = now + timedelta(days=days_before)
    
    # Find enterprises with trial ending on target date
    # trial_ends_at should be within the target day
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    enterprises = await db.entreprises.find({
        "subscription_status": "trialing",
        "trial_ends_at": {
            "$gte": start_of_day.isoformat(),
            "$lt": end_of_day.isoformat()
        }
    }, {"_id": 0}).to_list(length=100)
    
    results = {
        "total_found": len(enterprises),
        "emails_queued": 0,
        "errors": []
    }
    
    for entreprise in enterprises:
        try:
            # Get admin user for this enterprise
            admin = await db.users.find_one({
                "entreprise_id": entreprise["id"],
                "role": "admin"
            }, {"_id": 0})
            
            if not admin or not admin.get("email"):
                results["errors"].append({
                    "entreprise": entreprise.get("nom"),
                    "error": "Admin email not found"
                })
                continue
            
            # Generate upgrade URL
            upgrade_url = f"https://pro.actoos.com/dashboard/subscription?upgrade=true&source=trial_reminder"
            
            # Queue email in background
            background_tasks.add_task(
                send_trial_reminder_email,
                entreprise,
                admin,
                days_before,
                upgrade_url
            )
            
            results["emails_queued"] += 1
            
            # Log the reminder
            await db.email_logs.insert_one({
                "type": "trial_reminder",
                "entreprise_id": entreprise["id"],
                "admin_email": admin["email"],
                "days_before": days_before,
                "sent_at": now.isoformat()
            })
            
        except Exception as e:
            results["errors"].append({
                "entreprise": entreprise.get("nom"),
                "error": str(e)
            })
    
    logger.info(f"Trial reminders: {results['emails_queued']} queued for J-{days_before}")
    
    return results


@router.get("/trial-expiring")
async def get_expiring_trials(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of enterprises with trials expiring within N days
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Accès réservé au super admin")
    
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=days)
    
    enterprises = await db.entreprises.find({
        "subscription_status": "trialing",
        "trial_ends_at": {
            "$gte": now.isoformat(),
            "$lte": future.isoformat()
        }
    }, {"_id": 0, "nom": 1, "plan": 1, "trial_ends_at": 1, "id": 1}).to_list(length=100)
    
    # Add admin email to each
    for ent in enterprises:
        admin = await db.users.find_one({
            "entreprise_id": ent["id"],
            "role": "admin"
        }, {"_id": 0, "email": 1, "nom": 1, "prenom": 1})
        ent["admin"] = admin
        
        # Calculate days remaining
        if ent.get("trial_ends_at"):
            try:
                trial_end = datetime.fromisoformat(ent["trial_ends_at"].replace('Z', '+00:00'))
                ent["days_remaining"] = (trial_end - now).days
            except:
                ent["days_remaining"] = None
    
    return {
        "total": len(enterprises),
        "enterprises": enterprises
    }


@router.post("/check-and-send-reminders")
async def check_and_send_all_reminders(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Check all trial expirations and send appropriate reminders
    Sends J-3, J-1, and J0 reminders automatically
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Accès réservé au super admin")
    
    results = {
        "j3": {"sent": 0, "errors": []},
        "j1": {"sent": 0, "errors": []},
        "j0": {"sent": 0, "errors": []}
    }
    
    now = datetime.now(timezone.utc)
    
    for days, key in [(3, "j3"), (1, "j1"), (0, "j0")]:
        target_date = now + timedelta(days=days)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        # Find enterprises that haven't received this reminder yet
        enterprises = await db.entreprises.find({
            "subscription_status": "trialing",
            "trial_ends_at": {
                "$gte": start_of_day.isoformat(),
                "$lt": end_of_day.isoformat()
            }
        }, {"_id": 0}).to_list(length=100)
        
        for entreprise in enterprises:
            # Check if reminder already sent
            existing = await db.email_logs.find_one({
                "type": "trial_reminder",
                "entreprise_id": entreprise["id"],
                "days_before": days
            })
            
            if existing:
                continue  # Already sent
            
            try:
                admin = await db.users.find_one({
                    "entreprise_id": entreprise["id"],
                    "role": "admin"
                }, {"_id": 0})
                
                if not admin or not admin.get("email"):
                    continue
                
                upgrade_url = f"https://pro.actoos.com/dashboard/subscription?upgrade=true&source=trial_reminder_j{days}"
                
                background_tasks.add_task(
                    send_trial_reminder_email,
                    entreprise,
                    admin,
                    days,
                    upgrade_url
                )
                
                await db.email_logs.insert_one({
                    "type": "trial_reminder",
                    "entreprise_id": entreprise["id"],
                    "admin_email": admin["email"],
                    "days_before": days,
                    "sent_at": now.isoformat()
                })
                
                results[key]["sent"] += 1
                
            except Exception as e:
                results[key]["errors"].append(str(e))
    
    total_sent = sum(r["sent"] for r in results.values())
    logger.info(f"Trial reminder check: {total_sent} emails sent")
    
    return {
        "success": True,
        "results": results,
        "total_sent": total_sent
    }
