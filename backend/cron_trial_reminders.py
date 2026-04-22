#!/usr/bin/env python3
"""
Cron Job: Trial Reminder Emails
Runs daily to send trial expiration reminders (J-3, J-1, J0)

Usage:
  - Manual: python cron_trial_reminders.py
  - Cron: 0 9 * * * cd /app/backend && python cron_trial_reminders.py >> /var/log/trial_reminders.log 2>&1
  - Or via API: POST /api/tasks/check-and-send-reminders (super admin only)
"""
import os
import sys
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def run_trial_reminders():
    """Send trial reminder emails for J-3, J-1, J0"""
    from motor.motor_asyncio import AsyncIOMotorClient
    from email_service import send_trial_reminder_email
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        logger.error("MONGO_URL or DB_NAME not configured")
        return {"success": False, "error": "Database not configured"}
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    now = datetime.now(timezone.utc)
    results = {
        "timestamp": now.isoformat(),
        "j3": {"sent": 0, "errors": []},
        "j1": {"sent": 0, "errors": []},
        "j0": {"sent": 0, "errors": []}
    }
    
    try:
        for days, key in [(3, "j3"), (1, "j1"), (0, "j0")]:
            target_date = now + timedelta(days=days)
            start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            # Find enterprises with trial ending on target date
            enterprises = await db.entreprises.find({
                "subscription_status": "trialing",
                "trial_ends_at": {
                    "$gte": start_of_day.isoformat(),
                    "$lt": end_of_day.isoformat()
                }
            }, {"_id": 0}).to_list(length=100)
            
            logger.info(f"J-{days}: Found {len(enterprises)} enterprises with expiring trials")
            
            for entreprise in enterprises:
                # Check if reminder already sent
                existing = await db.email_logs.find_one({
                    "type": "trial_reminder",
                    "entreprise_id": entreprise["id"],
                    "days_before": days
                })
                
                if existing:
                    logger.debug(f"Reminder J-{days} already sent for {entreprise.get('nom')}")
                    continue
                
                try:
                    # Get admin user
                    admin = await db.users.find_one({
                        "entreprise_id": entreprise["id"],
                        "role": "admin"
                    }, {"_id": 0})
                    
                    if not admin or not admin.get("email"):
                        logger.warning(f"No admin email for {entreprise.get('nom')}")
                        continue
                    
                    # Generate upgrade URL
                    upgrade_url = f"https://actoos.com/dashboard/subscription?upgrade=true&source=trial_reminder_j{days}"
                    
                    # Send email
                    result = await send_trial_reminder_email(
                        entreprise,
                        admin,
                        days,
                        upgrade_url
                    )
                    
                    if result.get("status") == "success":
                        # Log successful send
                        await db.email_logs.insert_one({
                            "type": "trial_reminder",
                            "entreprise_id": entreprise["id"],
                            "admin_email": admin["email"],
                            "days_before": days,
                            "sent_at": now.isoformat()
                        })
                        results[key]["sent"] += 1
                        logger.info(f"✓ Sent J-{days} reminder to {admin['email']} ({entreprise.get('nom')})")
                    else:
                        results[key]["errors"].append({
                            "entreprise": entreprise.get("nom"),
                            "error": result.get("message")
                        })
                        logger.error(f"✗ Failed J-{days} for {entreprise.get('nom')}: {result.get('message')}")
                        
                except Exception as e:
                    results[key]["errors"].append({
                        "entreprise": entreprise.get("nom"),
                        "error": str(e)
                    })
                    logger.error(f"✗ Error J-{days} for {entreprise.get('nom')}: {e}")
        
        total_sent = sum(r["sent"] for r in results.values())
        total_errors = sum(len(r["errors"]) for r in results.values())
        
        logger.info(f"Trial reminders completed: {total_sent} sent, {total_errors} errors")
        
        return {
            "success": True,
            "results": results,
            "total_sent": total_sent,
            "total_errors": total_errors
        }
        
    except Exception as e:
        logger.error(f"Fatal error in trial reminders: {e}")
        return {"success": False, "error": str(e)}
    
    finally:
        client.close()


if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(f"ACTOOS PRO - Trial Reminder Cron Job")
    print(f"Started at: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}\n")
    
    result = asyncio.run(run_trial_reminders())
    
    print(f"\n{'='*60}")
    print(f"Result: {result}")
    print(f"{'='*60}\n")
    
    # Exit with appropriate code
    sys.exit(0 if result.get("success") else 1)
