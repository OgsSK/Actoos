"""
Actoos API - Field Service Management SaaS
Refactored modular architecture with all routes in /routers/
"""
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

# Import routers
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
    settings as settings_router
)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize communication logging
import communication_log
communication_log.set_db(db)

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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Health check endpoint for Railway
@app.get("/health")
async def health_check():
    """Health check endpoint for Railway deployment"""
    return {"status": "healthy", "service": "actoos-api"}

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


# Dashboard endpoints for frontend compatibility
from datetime import datetime, timezone, timedelta

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Dashboard stats for frontend"""
    ent_id = current_user["entreprise_id"]
    today = datetime.now(timezone.utc).date().isoformat()
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Today's interventions
    interventions_today = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$regex": f"^{today}"}
    })
    
    # Pending devis
    devis_en_attente = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": {"$in": ["brouillon", "envoye"]}
    })
    
    # Pending devis amount
    devis_pipeline = [
        {"$match": {"entreprise_id": ent_id, "statut": {"$in": ["brouillon", "envoye"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
    ]
    devis_result = await db.devis.aggregate(devis_pipeline).to_list(1)
    montant_devis_attente = devis_result[0]["total"] if devis_result else 0
    
    # Unpaid invoices
    factures_impayees = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "paye": False,
        "statut": {"$ne": "annulee"}
    })
    
    # Unpaid invoices amount
    factures_pipeline = [
        {"$match": {"entreprise_id": ent_id, "paye": False, "statut": {"$ne": "annulee"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
    ]
    factures_result = await db.factures.aggregate(factures_pipeline).to_list(1)
    montant_factures_impayees = factures_result[0]["total"] if factures_result else 0
    
    # Revenue this month
    revenue_pipeline = [
        {"$match": {"entreprise_id": ent_id, "paye": True, "created_at": {"$gte": start_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
    ]
    revenue_result = await db.factures.aggregate(revenue_pipeline).to_list(1)
    ca_mois = revenue_result[0]["total"] if revenue_result else 0
    
    # Clients count
    clients_count = await db.clients.count_documents({"entreprise_id": ent_id})
    
    # Active technicians
    techs_actifs = await db.users.count_documents({
        "entreprise_id": ent_id,
        "role": "tech",
        "actif": True
    })
    
    # Signed devis this month
    devis_signes_mois = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "signe",
        "created_at": {"$gte": start_of_month}
    })
    
    # Late interventions
    interventions_en_retard = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "statut": "planifiee",
        "date_prevue": {"$lt": today}
    })
    
    return {
        "interventions_today": interventions_today,
        "interventions_en_retard": interventions_en_retard,
        "devis_en_attente": devis_en_attente,
        "montant_devis_attente": round(montant_devis_attente, 2),
        "factures_impayees": factures_impayees,
        "montant_factures_impayees": round(montant_factures_impayees, 2),
        "ca_mois": round(ca_mois, 2),
        "clients": clients_count,
        "techs_actifs": techs_actifs,
        "devis_signes_mois": devis_signes_mois
    }


@api_router.get("/dashboard/alerts")
async def get_dashboard_alerts(current_user: dict = Depends(get_current_user)):
    """Get dashboard alerts"""
    ent_id = current_user["entreprise_id"]
    alerts = []
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Check for overdue invoices
    overdue_factures = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "paye": False,
        "statut": "emise",
        "date_echeance": {"$lt": today}
    })
    if overdue_factures > 0:
        alerts.append({
            "type": "overdue_invoice",
            "message": f"{overdue_factures} facture(s) en retard de paiement",
            "severity": "high"
        })
    
    # Check for pending devis
    pending_devis = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "envoye"
    })
    if pending_devis > 0:
        alerts.append({
            "type": "pending_devis",
            "message": f"{pending_devis} devis en attente de signature",
            "severity": "medium"
        })
    
    # Check for today's interventions
    today_interventions = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$regex": f"^{today}"},
        "statut": "planifiee"
    })
    if today_interventions > 0:
        alerts.append({
            "type": "today_interventions",
            "message": f"{today_interventions} intervention(s) planifiée(s) aujourd'hui",
            "severity": "info"
        })
    
    return alerts


@api_router.get("/dashboard/recent")
async def get_dashboard_recent(current_user: dict = Depends(get_current_user)):
    """Get recent devis and factures"""
    ent_id = current_user["entreprise_id"]
    
    # Recent devis
    devis_cursor = db.devis.find(
        {"entreprise_id": ent_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5)
    devis_list = await devis_cursor.to_list(5)
    
    # Recent factures
    factures_cursor = db.factures.find(
        {"entreprise_id": ent_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5)
    factures_list = await factures_cursor.to_list(5)
    
    return {
        "devis": devis_list,
        "factures": factures_list
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
    
    # Create indexes
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
    
    logger.info("Actoos API started - Version 2.0.0 (Modular Architecture)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
