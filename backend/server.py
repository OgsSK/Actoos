"""
Actoos API - Field Service Management SaaS
Refactored modular architecture with all routes in /routers/
PostgreSQL (Supabase) primary database
"""
from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
import asyncio

# Load environment variables FIRST before other imports
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from storage import init_storage
from sms_service import init_twilio
from email_service import send_relance_email
from sms_service import send_payment_reminder, send_intervention_reminder

# Import dependencies with database
from dependencies import db, USE_POSTGRES, USE_MONGO

# Import routers - use PostgreSQL optimized versions when available
if USE_POSTGRES:
    from routers import (
        auth as auth_router,
        users_pg as users_router,
        technicians as technicians_router,
        clients_pg as clients_router,
        categories as categories_router,
        push as push_router,
        analytics as analytics_router,
        communications as communications_router,
        entreprise as entreprise_router,
        search as search_router,
        stats as stats_router,
        statements as statements_router,
        interventions_pg as interventions_router,
        devis as devis_router,
        factures as factures_router,
        portal as portal_router,
        sms as sms_router,
        subscription as subscription_router,
        photos as photos_router,
        rapports as rapports_router,
        audit as audit_router,
        public_api as public_api_router,
        sites as sites_router,
        calendar as calendar_router,
        accounting_export as accounting_export_router,
        admin_analytics as admin_analytics_router,
        gdpr as gdpr_router,
        offline_sync as offline_sync_router,
        super_admin as super_admin_router,
        settings as settings_router,
        integrations as integrations_router,
        dashboard as dashboard_router,
        chat as chat_router,
        import_data as import_data_router,
        scheduled_tasks as scheduled_tasks_router,
        two_factor as two_factor_router,
        demo as demo_router
    )
else:
    from routers import (
        auth as auth_router,
        users as users_router,
        technicians as technicians_router,
        clients as clients_router,
        categories as categories_router,
        push as push_router,
        analytics as analytics_router,
        communications as communications_router,
        entreprise as entreprise_router,
        search as search_router,
        stats as stats_router,
        statements as statements_router,
        interventions as interventions_router,
        devis as devis_router,
        factures as factures_router,
        portal as portal_router,
        sms as sms_router,
        subscription as subscription_router,
        photos as photos_router,
        rapports as rapports_router,
        audit as audit_router,
        public_api as public_api_router,
        sites as sites_router,
        calendar as calendar_router,
        accounting_export as accounting_export_router,
        admin_analytics as admin_analytics_router,
        gdpr as gdpr_router,
        offline_sync as offline_sync_router,
        super_admin as super_admin_router,
        settings as settings_router,
        integrations as integrations_router,
        dashboard as dashboard_router,
        chat as chat_router,
        import_data as import_data_router,
        scheduled_tasks as scheduled_tasks_router,
        two_factor as two_factor_router,
        demo as demo_router
    )
import realtime_events

# Initialize communication logging (if MongoDB is available)
if USE_MONGO:
    import communication_log
    from dependencies import mongo_db
    if mongo_db:
        communication_log.set_db(mongo_db)

# Create the main app
app = FastAPI(title="Actoos API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# Include modular routers
api_router.include_router(auth_router.router)
api_router.include_router(users_router.router)
api_router.include_router(technicians_router.router)
api_router.include_router(clients_router.router)
api_router.include_router(categories_router.router)
api_router.include_router(push_router.router)
api_router.include_router(analytics_router.router)
api_router.include_router(communications_router.router)
api_router.include_router(entreprise_router.router)
api_router.include_router(search_router.router)
api_router.include_router(stats_router.router)
api_router.include_router(statements_router.router)
api_router.include_router(interventions_router.router)
api_router.include_router(devis_router.router)
api_router.include_router(factures_router.router)
api_router.include_router(portal_router.router)
api_router.include_router(sms_router.router)
api_router.include_router(subscription_router.router)
api_router.include_router(photos_router.router)
api_router.include_router(rapports_router.router)
api_router.include_router(audit_router.router)
api_router.include_router(public_api_router.router)
api_router.include_router(sites_router.router)
api_router.include_router(calendar_router.router)
api_router.include_router(accounting_export_router.router)
api_router.include_router(admin_analytics_router.router)
api_router.include_router(gdpr_router.router)
api_router.include_router(offline_sync_router.router)
api_router.include_router(super_admin_router.router)
api_router.include_router(settings_router.router)
api_router.include_router(integrations_router.router)
api_router.include_router(dashboard_router.router)
api_router.include_router(realtime_events.router)
api_router.include_router(chat_router.router)
api_router.include_router(import_data_router.router)
api_router.include_router(scheduled_tasks_router.router)
api_router.include_router(two_factor_router.router)
api_router.include_router(demo_router.router)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Health check endpoint for Railway (both /health and /api/health)
@app.get("/health")
async def health_check():
    """Health check endpoint for Railway deployment with connection status"""
    status = {
        "status": "healthy",
        "service": "actoos-api",
        "version": "2.0.0",
        "database_mode": "postgresql" if USE_POSTGRES else "mongodb" if USE_MONGO else "none"
    }
    
    # Check PostgreSQL
    if USE_POSTGRES:
        try:
            from dependencies import get_pg_session
            from sqlalchemy import text
            async with get_pg_session() as session:
                await session.execute(text("SELECT 1"))
            status["postgresql"] = "connected"
        except Exception as e:
            status["postgresql"] = f"error: {str(e)[:50]}"
    else:
        status["postgresql"] = "not_configured"
    
    # Check Redis
    try:
        from redis_service import is_redis_available
        status["redis"] = "connected" if is_redis_available() else "fallback"
    except:
        status["redis"] = "fallback"
    
    # Check MongoDB (optional now)
    if USE_MONGO:
        try:
            from dependencies import mongo_db
            if mongo_db:
                await mongo_db.command("ping")
                status["mongodb"] = "connected"
            else:
                status["mongodb"] = "not_configured"
        except:
            status["mongodb"] = "error"
    else:
        status["mongodb"] = "not_configured"
    
    return status

@api_router.get("/health")
async def api_health_check():
    """Health check via /api/health"""
    return await health_check()

# CORS configuration - Use environment variable for allowed origins
# In production, set CORS_ORIGINS to your specific domains
cors_origins_str = os.environ.get("CORS_ORIGINS", "*")
if cors_origins_str == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
from rate_limit_middleware import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)

# Mount static files for SQL schema download
static_dir = ROOT_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Keep clients portal link in server.py for backward compatibility
from fastapi import HTTPException, Depends
import uuid
from auth import get_current_user
from dependencies import serialize_doc

@api_router.get("/clients/{client_id}/portal-link")
async def get_client_portal_link(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get the portal link for a client (admin only)"""
    client_doc = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "id": 1, "portal_token": 1, "nom": 1, "prenom": 1}
    )
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Generate portal_token if not exists
    if not client_doc.get("portal_token"):
        portal_token = str(uuid.uuid4())
        await db.clients.update_one(
            {"id": client_id},
            {"$set": {"portal_token": portal_token}}
        )
        client_doc["portal_token"] = portal_token
    
    return {
        "client_id": client_doc["id"],
        "client_name": f"{client_doc.get('nom', '')} {client_doc.get('prenom', '')}".strip(),
        "portal_token": client_doc["portal_token"],
        "portal_url": f"/portal/client/{client_doc['portal_token']}"
    }


# Include the api_router in the app
app.include_router(api_router)


# ==================== BACKGROUND TASKS ====================
from datetime import datetime, timezone, timedelta

async def run_scheduled_reminders():
    """Background task to send automatic payment reminders"""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            
            today = datetime.now(timezone.utc).isoformat()
            
            # Find overdue invoices
            overdue_factures = await db.factures.find(
                {"statut": "emise", "date_echeance": {"$lt": today}},
                {"_id": 0}
            ).to_list(100)
            
            for facture in overdue_factures:
                # Check if reminder was sent recently (within 3 days)
                last_reminder = facture.get("last_reminder_sent")
                if last_reminder:
                    last_reminder_date = datetime.fromisoformat(last_reminder.replace('Z', '+00:00'))
                    if (datetime.now(timezone.utc) - last_reminder_date).days < 3:
                        continue
                
                # Get client and entreprise
                client_doc = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
                entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
                
                if not client_doc or not entreprise:
                    continue
                
                # Calculate days overdue
                date_echeance = datetime.fromisoformat(facture.get("date_echeance", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
                jours_retard = max(0, (datetime.now(timezone.utc) - date_echeance).days)
                
                # Send SMS reminder if phone available
                if client_doc.get("telephone"):
                    sms_result = await send_payment_reminder(client_doc, facture, entreprise, jours_retard)
                    logger.info(f"Auto SMS reminder for facture {facture['id']}: {sms_result}")
                
                # Send email reminder
                if client_doc.get("email"):
                    email_result = await send_relance_email(facture, client_doc, entreprise, jours_retard)
                    logger.info(f"Auto email reminder for facture {facture['id']}: {email_result}")
                
                # Update facture with reminder sent timestamp and status
                await db.factures.update_one(
                    {"id": facture["id"]},
                    {"$set": {
                        "statut": "en_retard",
                        "last_reminder_sent": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
        except Exception as e:
            logger.error(f"Error in scheduled reminders: {e}")

async def run_intervention_reminders():
    """Background task to send intervention reminders"""
    while True:
        try:
            await asyncio.sleep(1800)  # Run every 30 minutes
            
            # Find interventions scheduled for tomorrow that haven't been reminded
            tomorrow_start = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow_end = tomorrow_start + timedelta(days=1)
            
            upcoming_interventions = await db.interventions.find({
                "statut": "planifiee",
                "date_prevue": {"$gte": tomorrow_start.isoformat(), "$lt": tomorrow_end.isoformat()},
                "reminder_sent": {"$ne": True}
            }, {"_id": 0}).to_list(100)
            
            for intervention in upcoming_interventions:
                client_doc = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0})
                entreprise = await db.entreprises.find_one({"id": intervention["entreprise_id"]}, {"_id": 0})
                
                if not client_doc or not entreprise:
                    continue
                
                # Send SMS reminder
                if client_doc.get("telephone"):
                    sms_result = await send_intervention_reminder(client_doc, intervention, entreprise)
                    logger.info(f"Intervention reminder for {intervention['id']}: {sms_result}")
                
                # Mark as reminded
                await db.interventions.update_one(
                    {"id": intervention["id"]},
                    {"$set": {"reminder_sent": True}}
                )
                
        except Exception as e:
            logger.error(f"Error in intervention reminders: {e}")

@app.on_event("startup")
async def startup():
    # Initialize PostgreSQL (Supabase) if configured
    pg_connected = False
    try:
        from database_pg import init_database, get_database_url
        if get_database_url():
            pg_connected = await init_database()
            if pg_connected:
                logger.info("✅ PostgreSQL (Supabase) connected - High Performance Mode")
            else:
                logger.info("⚠️ PostgreSQL not available - Using MongoDB fallback")
        else:
            logger.info("DATABASE_URL not set - Using MongoDB")
    except Exception as e:
        logger.warning(f"PostgreSQL init failed: {e} - Using MongoDB fallback")
    
    # Initialize Redis service
    redis_connected = False
    try:
        from redis_service import get_redis
        redis = await get_redis()
        if redis:
            redis_connected = True
            logger.info("✅ Redis (Upstash) connected - Caching enabled")
        else:
            logger.info("⚠️ Redis not configured - Using in-memory fallback")
    except Exception as e:
        logger.warning(f"Redis init failed (optional): {e}")
    
    # Log performance mode status
    if pg_connected and redis_connected:
        logger.info("🚀 HIGH PERFORMANCE MODE ACTIVE (PostgreSQL + Redis)")
    elif pg_connected:
        logger.info("⚡ ENHANCED MODE (PostgreSQL only)")
    else:
        logger.info("📦 STANDARD MODE (MongoDB + In-memory cache)")
    
    # Initialize storage
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init failed (optional): {e}")
    
    # Initialize Twilio
    try:
        init_twilio()
    except Exception as e:
        logger.warning(f"Twilio init failed (optional): {e}")
    
    # Create MongoDB indexes (fallback)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("entreprise_id")
    await db.clients.create_index("entreprise_id")
    await db.interventions.create_index([("entreprise_id", 1), ("date_prevue", 1)])
    await db.devis.create_index([("entreprise_id", 1), ("created_at", -1)])
    await db.devis.create_index("token_client", unique=True)
    await db.factures.create_index([("entreprise_id", 1), ("created_at", -1)])
    await db.audit_logs.create_index([("entreprise_id", 1), ("timestamp", -1)])
    await db.photos.create_index([("entreprise_id", 1), ("intervention_id", 1)])
    
    # Start background tasks for automated reminders (only in production)
    if os.environ.get('ENABLE_AUTO_REMINDERS', 'false').lower() == 'true':
        asyncio.create_task(run_scheduled_reminders())
        asyncio.create_task(run_intervention_reminders())
        logger.info("Automated reminder tasks started")
    
    logger.info("ACTOOS PRO API started - Version 2.0.0 (High Performance Architecture)")

@app.on_event("shutdown")
async def shutdown_db_client():
    # Cleanup Redis
    try:
        from redis_service import cleanup
        await cleanup()
    except:
        pass
    
    client.close()
