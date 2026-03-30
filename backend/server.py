from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Response, Header, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from io import BytesIO
import asyncio

from models import (
    Entreprise, EntrepriseCreate, User, UserCreate, UserResponse, UserLogin, UserInvite,
    UserPasswordReset, UserSetPassword, UserSkillsUpdate, Client, ClientCreate, ClientResponse,
    Intervention, InterventionCreate, InterventionUpdate, ChecklistResponse,
    Devis, DevisCreate, DevisUpdate, LigneDevis,
    Facture, FactureCreate, FactureFromDevis,
    AuditLog, Photo, TokenResponse, RegisterRequest, SyncRequest,
    Categorie, CategorieCreate, ChecklistItem
)
from auth import (
    get_password_hash, verify_password, create_access_token, decode_token,
    get_current_user, require_admin, create_invitation_token, create_reset_token
)
from storage import init_storage, put_object, get_object, get_mime_type, APP_NAME
from pdf_generator import generate_devis_pdf, generate_facture_pdf
from email_service import send_devis_email, send_facture_email, send_relance_email
from sms_service import (
    init_twilio, send_intervention_reminder, send_intervention_started,
    send_intervention_completed, send_devis_notification, send_devis_signed_confirmation,
    send_facture_notification, send_payment_reminder, send_payment_confirmation
)
from subscription_service import SUBSCRIPTION_PLANS, get_plan, get_all_plans
from push_service import (
    get_vapid_public_key, send_push_notification, send_push_to_users,
    notify_new_intervention_available, notify_new_intervention_available_to_techs,
    notify_intervention_assigned, notify_devis_signed
)
from route_optimizer import optimize_route, get_route_suggestions, calculate_simple_route_score
from analytics_service import (
    get_revenue_analytics, get_intervention_analytics, get_technician_performance,
    get_client_analytics, get_devis_analytics, get_trend_data
)

# Import routers
from routers import auth as auth_router
from routers import users as users_router
from routers import technicians as technicians_router
from routers import clients as clients_router
from routers import categories as categories_router
from routers import push as push_router
from routers import analytics as analytics_router
from routers import communications as communications_router
from routers import entreprise as entreprise_router
from routers import search as search_router
from routers import stats as stats_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize communication logging
import communication_log
communication_log.set_db(db)

# Create the main app
app = FastAPI(title="FieldCommand API", version="1.0.0")
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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the api_router in the app
app.include_router(api_router)

# ==================== HELPERS ====================
def serialize_datetime(obj):
    """Convert datetime to ISO string"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document, converting datetimes and removing _id"""
    if '_id' in doc:
        del doc['_id']
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

def calculate_totals(lignes: List[dict]) -> tuple:
    """Calculate total_ht, total_tva, total_ttc from lines"""
    total_ht = sum(l.get('quantite', 1) * l.get('prix_unitaire', 0) for l in lignes)
    total_tva = sum(l.get('quantite', 1) * l.get('prix_unitaire', 0) * l.get('tva', 20) / 100 for l in lignes)
    total_ttc = total_ht + total_tva
    return round(total_ht, 2), round(total_tva, 2), round(total_ttc, 2)

async def log_action(entreprise_id: str, user_id: str, action: str, entity: str, entity_id: str, details: dict = None):
    """Log an audit action"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "entreprise_id": entreprise_id,
        "user_id": user_id,
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log_entry)







# ==================== INTERVENTION ROUTES ====================
@api_router.post("/interventions")
async def create_intervention(data: InterventionCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Create a new intervention"""
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    intervention_dict = data.model_dump()
    intervention_dict["id"] = str(uuid.uuid4())
    intervention_dict["entreprise_id"] = current_user["entreprise_id"]
    intervention_dict["statut"] = "planifiee"
    intervention_dict["photos"] = []
    intervention_dict["date_prevue"] = intervention_dict["date_prevue"].isoformat()
    intervention_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.interventions.insert_one(intervention_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "intervention", intervention_dict["id"])
    
    # If no technician assigned, notify all technicians
    if not intervention_dict.get("technicien_id"):
        background_tasks.add_task(
            notify_available_intervention,
            current_user["entreprise_id"],
            intervention_dict,
            client
        )
    
    return serialize_doc(intervention_dict)

async def notify_available_intervention(entreprise_id: str, intervention: dict, client: dict):
    """Notify technicians about a new available intervention via SMS and Push.
    Only notifies technicians with matching skills if the intervention has a category."""
    try:
        # Build query for technicians
        tech_query = {"entreprise_id": entreprise_id, "role": "tech", "statut": "actif"}
        
        # If intervention has a category, only notify techs with that skill
        categorie_id = intervention.get("categorie_id")
        if categorie_id:
            # Find techs who have this skill OR have no skills defined (can do anything)
            tech_query["$or"] = [
                {"skills": categorie_id},
                {"skills": {"$exists": False}},
                {"skills": []},
                {"skills": None}
            ]
        
        # Get matching technicians
        technicians = await db.users.find(
            tech_query,
            {"_id": 0, "id": 1, "telephone": 1, "prenom": 1, "nom": 1, "skills": 1}
        ).to_list(100)
        
        logger.info(f"Notifying {len(technicians)} qualified technicians for intervention {intervention.get('id')}")
        
        entreprise = await db.entreprises.find_one({"id": entreprise_id}, {"_id": 0, "nom": 1})
        entreprise_nom = entreprise.get("nom", "Votre entreprise") if entreprise else "Votre entreprise"
        
        # Parse date for message
        try:
            date_obj = datetime.fromisoformat(intervention["date_prevue"].replace('Z', '+00:00'))
            date_str = date_obj.strftime("%d/%m à %Hh%M")
        except:
            date_str = "bientôt"
        
        client_nom = f"{client.get('nom', '')} {client.get('prenom', '')}".strip() or "Client"
        
        # Send Push notifications to qualified techs only
        tech_ids = [t["id"] for t in technicians]
        if tech_ids:
            push_result = await notify_new_intervention_available_to_techs(db, entreprise_id, intervention, tech_ids)
            logger.info(f"Push notifications sent: {push_result}")
        
        # Send SMS to each qualified technician with a phone number
        for tech in technicians:
            if tech.get("telephone"):
                try:
                    message = f"🔔 {entreprise_nom}: Nouvelle intervention disponible!\n{intervention.get('titre', 'Intervention')}\n📍 {intervention.get('ville', '')}\n📅 {date_str}\n👤 {client_nom}\n\nOuvrez l'app pour l'accepter."
                    from sms_service import send_sms
                    await send_sms(tech["telephone"], message)
                except Exception as e:
                    logger.warning(f"Failed to send SMS to {tech.get('prenom')}: {e}")
    except Exception as e:
        logger.error(f"Error notifying technicians: {e}")

@api_router.get("/interventions")
async def list_interventions(
    statut: Optional[str] = None,
    technicien_id: Optional[str] = None,
    client_id: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    include_available: Optional[bool] = False,
    current_user: dict = Depends(get_current_user)
):
    """List interventions with filters. Technicians only see available interventions matching their skills."""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    # Technicians see their own + optionally available interventions (skill-filtered)
    if current_user["role"] == "tech":
        if include_available:
            # Get tech's skills
            tech = await db.users.find_one(
                {"id": current_user["user_id"]},
                {"_id": 0, "skills": 1}
            )
            tech_skills = tech.get("skills", []) if tech else []
            
            # Build available intervention filter based on skills
            available_filter = [
                {"technicien_id": None},
                {"technicien_id": {"$exists": False}}
            ]
            
            # If tech has skills, only show matching interventions or ones with no category
            if tech_skills:
                skill_filter = {
                    "$and": [
                        {"$or": available_filter},
                        {"$or": [
                            {"categorie_id": {"$in": tech_skills}},
                            {"categorie_id": None},
                            {"categorie_id": {"$exists": False}}
                        ]}
                    ]
                }
                query["$or"] = [
                    {"technicien_id": current_user["user_id"]},
                    skill_filter
                ]
            else:
                # Tech with no skills can see all available interventions
                query["$or"] = [
                    {"technicien_id": current_user["user_id"]},
                    {"technicien_id": None},
                    {"technicien_id": {"$exists": False}}
                ]
        else:
            query["technicien_id"] = current_user["user_id"]
    elif technicien_id:
        query["technicien_id"] = technicien_id
    
    if statut:
        query["statut"] = statut
    if client_id:
        query["client_id"] = client_id
    if date_debut:
        query["date_prevue"] = {"$gte": date_debut}
    if date_fin:
        if "date_prevue" in query:
            query["date_prevue"]["$lte"] = date_fin
        else:
            query["date_prevue"] = {"$lte": date_fin}
    
    interventions = await db.interventions.find(query, {"_id": 0}).sort("date_prevue", 1).to_list(1000)
    return [serialize_doc(i) for i in interventions]

@api_router.get("/interventions/today")
async def get_today_interventions(current_user: dict = Depends(get_current_user)):
    """Get today's interventions for technician. Skill-based filtering for available missions."""
    today = datetime.now(timezone.utc).date()
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc).isoformat()
    today_end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc).isoformat()
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "date_prevue": {"$gte": today_start, "$lte": today_end}
    }
    
    if current_user["role"] == "tech":
        # Get tech's skills
        tech = await db.users.find_one(
            {"id": current_user["user_id"]},
            {"_id": 0, "skills": 1}
        )
        tech_skills = tech.get("skills", []) if tech else []
        
        # Build available intervention filter
        available_filter = [
            {"technicien_id": None},
            {"technicien_id": {"$exists": False}}
        ]
        
        if tech_skills:
            # Tech with skills: only see matching interventions or ones with no category
            skill_filter = {
                "$and": [
                    {"$or": available_filter},
                    {"$or": [
                        {"categorie_id": {"$in": tech_skills}},
                        {"categorie_id": None},
                        {"categorie_id": {"$exists": False}}
                    ]}
                ]
            }
            query["$or"] = [
                {"technicien_id": current_user["user_id"]},
                skill_filter
            ]
        else:
            # Tech with no skills can see all available interventions
            query["$or"] = [
                {"technicien_id": current_user["user_id"]},
                {"technicien_id": None},
                {"technicien_id": {"$exists": False}}
            ]
    
    interventions = await db.interventions.find(query, {"_id": 0}).sort("date_prevue", 1).to_list(100)
    
    # Enrich with client data
    for i in interventions:
        client = await db.clients.find_one({"id": i["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "telephone": 1, "adresse": 1})
        i["client"] = serialize_doc(client) if client else None
    
    return [serialize_doc(i) for i in interventions]

@api_router.get("/interventions/available")
async def get_available_interventions(current_user: dict = Depends(get_current_user)):
    """Get available (unassigned) interventions for technicians to claim. Filtered by technician skills."""
    # Get tech's skills if tech role
    tech_skills = []
    if current_user["role"] == "tech":
        tech = await db.users.find_one(
            {"id": current_user["user_id"]},
            {"_id": 0, "skills": 1}
        )
        tech_skills = tech.get("skills", []) if tech else []
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "statut": "planifiee",
        "$or": [
            {"technicien_id": None},
            {"technicien_id": {"$exists": False}}
        ]
    }
    
    # If tech has skills, filter interventions by matching category
    if current_user["role"] == "tech" and tech_skills:
        query["$and"] = [
            {"$or": query.pop("$or")},
            {"$or": [
                {"categorie_id": {"$in": tech_skills}},
                {"categorie_id": None},
                {"categorie_id": {"$exists": False}}
            ]}
        ]
    
    interventions = await db.interventions.find(query, {"_id": 0}).sort("date_prevue", 1).to_list(100)
    
    # Enrich with client data
    for i in interventions:
        client = await db.clients.find_one({"id": i["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "telephone": 1, "adresse": 1})
        i["client"] = serialize_doc(client) if client else None
    
    return [serialize_doc(i) for i in interventions]

# ==================== ROUTE OPTIMIZATION ====================
# NOTE: These routes MUST be defined BEFORE /interventions/{intervention_id}
# to avoid FastAPI matching "route-score" or "optimize-route" as an intervention_id

@api_router.post("/interventions/optimize-route")
async def optimize_interventions_route(
    date: str = None,
    intervention_ids: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Optimize the route for interventions using AI
    
    Args:
        date: Date to optimize (YYYY-MM-DD), defaults to today
        intervention_ids: Comma-separated intervention IDs to optimize, 
                         or all for the date if not provided
    """
    from datetime import date as date_type
    
    # Default to today
    if not date:
        date = date_type.today().isoformat()
    
    # Parse intervention_ids if provided as comma-separated string
    ids_list = None
    if intervention_ids:
        ids_list = [id.strip() for id in intervention_ids.split(',') if id.strip()]
    
    # Build query
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if ids_list:
        query["id"] = {"$in": ids_list}
    else:
        # Get interventions for the date
        query["date_prevue"] = {"$regex": f"^{date}"}
        query["statut"] = {"$in": ["planifiee", "en_cours"]}
    
    # For technicians, only their interventions
    if current_user.get("role") == "tech":
        query["$or"] = [
            {"technicien_id": current_user["user_id"]},
            {"technicien_id": None}  # Also include unassigned ones they might claim
        ]
    
    # Fetch interventions with client data
    interventions = await db.interventions.find(query, {"_id": 0}).to_list(length=50)
    
    # Enrich with client info
    client_ids = list(set(i.get("client_id") for i in interventions if i.get("client_id")))
    clients_cursor = await db.clients.find({"id": {"$in": client_ids}}, {"_id": 0}).to_list(length=100)
    clients_map = {c["id"]: c for c in clients_cursor}
    
    for inv in interventions:
        inv["client"] = clients_map.get(inv.get("client_id"))
    
    # Optimize route
    result = await optimize_route(interventions)
    
    # Add intervention details to result
    interventions_map = {i["id"]: i for i in interventions}
    result["interventions"] = [
        {
            "id": inv_id,
            "titre": interventions_map.get(inv_id, {}).get("titre", ""),
            "adresse": interventions_map.get(inv_id, {}).get("adresse", "") or 
                      interventions_map.get(inv_id, {}).get("client", {}).get("adresse", ""),
            "ville": interventions_map.get(inv_id, {}).get("ville", "") or 
                    interventions_map.get(inv_id, {}).get("client", {}).get("ville", ""),
            "heure_prevue": interventions_map.get(inv_id, {}).get("date_prevue", ""),
            "priorite": interventions_map.get(inv_id, {}).get("priorite", "normale"),
            "statut": interventions_map.get(inv_id, {}).get("statut", "")
        }
        for inv_id in result.get("optimized_order", [])
    ]
    
    return result

@api_router.get("/interventions/route-score")
async def get_route_score(
    date: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a simple route efficiency score for the day's interventions
    (No AI required - basic geographic and priority analysis)
    """
    from datetime import date as date_type
    
    if not date:
        date = date_type.today().isoformat()
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "date_prevue": {"$regex": f"^{date}"},
        "statut": {"$in": ["planifiee", "en_cours"]}
    }
    
    if current_user.get("role") == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    interventions = await db.interventions.find(query, {"_id": 0}).to_list(length=50)
    
    # Enrich with client info
    client_ids = list(set(i.get("client_id") for i in interventions if i.get("client_id")))
    if client_ids:
        clients_cursor = await db.clients.find({"id": {"$in": client_ids}}, {"_id": 0}).to_list(length=100)
        clients_map = {c["id"]: c for c in clients_cursor}
        for inv in interventions:
            inv["client"] = clients_map.get(inv.get("client_id"))
    
    score = calculate_simple_route_score(interventions)
    score["date"] = date
    score["total_interventions"] = len(interventions)
    
    return score

@api_router.post("/interventions/apply-optimized-order")
async def apply_optimized_order(
    optimized_order: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Apply the optimized order by updating intervention priorities/order field
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Seuls les admins peuvent réorganiser les interventions")
    
    # Update each intervention with its position in the optimized order
    for position, intervention_id in enumerate(optimized_order):
        await db.interventions.update_one(
            {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
            {"$set": {"ordre_tournee": position + 1, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await log_action(
        current_user["entreprise_id"], 
        current_user["user_id"], 
        "optimize_route", 
        "interventions", 
        f"optimized_{len(optimized_order)}_interventions"
    )
    
    return {
        "message": f"Ordre optimisé appliqué à {len(optimized_order)} interventions",
        "order": optimized_order
    }

@api_router.get("/interventions/{intervention_id}")
async def get_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific intervention"""
    query = {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    intervention = await db.interventions.find_one(query, {"_id": 0})
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Enrich with client data
    client = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0})
    intervention["client"] = serialize_doc(client) if client else None
    
    return serialize_doc(intervention)

@api_router.put("/interventions/{intervention_id}")
async def update_intervention(intervention_id: str, data: InterventionUpdate, current_user: dict = Depends(get_current_user)):
    """Update an intervention"""
    query = {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    update_data = data.model_dump(exclude_unset=True)
    for key in ["date_prevue", "heure_debut", "heure_fin"]:
        if key in update_data and update_data[key]:
            update_data[key] = update_data[key].isoformat()
    
    result = await db.interventions.update_one(query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "intervention", intervention_id)
    
    intervention = await db.interventions.find_one({"id": intervention_id}, {"_id": 0})
    return serialize_doc(intervention)

@api_router.delete("/interventions/{intervention_id}")
async def delete_intervention(intervention_id: str, current_user: dict = Depends(require_admin)):
    """Delete an intervention (admin only)"""
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Cannot delete if already started
    if intervention["statut"] in ["en_cours", "terminee"]:
        raise HTTPException(status_code=400, detail="Impossible de supprimer une intervention en cours ou terminée")
    
    await db.interventions.delete_one({"id": intervention_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "intervention", intervention_id)
    
    return {"message": "Intervention supprimée"}

@api_router.post("/interventions/{intervention_id}/cancel")
async def cancel_intervention(intervention_id: str, motif: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Cancel an intervention"""
    now = datetime.now(timezone.utc).isoformat()
    
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    if intervention["statut"] in ["terminee", "annulee"]:
        raise HTTPException(status_code=400, detail="Cette intervention ne peut pas être annulée")
    
    update = {"statut": "annulee", "date_annulation": now}
    if motif:
        update["motif_annulation"] = motif
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "cancel", "intervention", intervention_id, {"motif": motif})
    
    return {"message": "Intervention annulée"}

@api_router.post("/interventions/{intervention_id}/start")
async def start_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Start an intervention"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find the intervention
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Check if user can start (admin can start any, tech can start if assigned or unassigned)
    is_admin = current_user.get("role") == "admin"
    is_assigned = intervention.get("technicien_id") == current_user["user_id"]
    is_unassigned = not intervention.get("technicien_id")
    
    if not is_admin and not is_assigned and not is_unassigned:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas assigné à cette intervention")
    
    if intervention["statut"] != "planifiee":
        raise HTTPException(status_code=400, detail="Cette intervention ne peut pas être démarrée")
    
    # If unassigned and tech starts, assign to them
    update = {"statut": "en_cours", "heure_debut": now}
    if is_unassigned and not is_admin:
        update["technicien_id"] = current_user["user_id"]
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "start", "intervention", intervention_id)
    
    return {"message": "Intervention démarrée", "heure_debut": now}

@api_router.post("/interventions/{intervention_id}/claim")
async def claim_intervention(intervention_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Claim an unassigned intervention - first tech to claim gets it"""
    # Find the intervention
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Check if already assigned
    if intervention.get("technicien_id"):
        # Get the tech who has it
        assigned_tech = await db.users.find_one({"id": intervention["technicien_id"]}, {"_id": 0, "prenom": 1, "nom": 1})
        tech_name = f"{assigned_tech.get('prenom', '')} {assigned_tech.get('nom', '')}" if assigned_tech else "un autre technicien"
        raise HTTPException(status_code=409, detail=f"Cette intervention a déjà été prise par {tech_name}")
    
    if intervention["statut"] != "planifiee":
        raise HTTPException(status_code=400, detail="Cette intervention ne peut plus être réclamée")
    
    # Assign to the tech who claims it
    now = datetime.now(timezone.utc).isoformat()
    await db.interventions.update_one(
        {"id": intervention_id, "technicien_id": None},  # Double-check it's still unassigned
        {"$set": {"technicien_id": current_user["user_id"], "date_assignation": now}}
    )
    
    # Verify it was actually assigned to this user (race condition check)
    updated = await db.interventions.find_one({"id": intervention_id}, {"_id": 0, "technicien_id": 1})
    if updated.get("technicien_id") != current_user["user_id"]:
        raise HTTPException(status_code=409, detail="Cette intervention a été prise par un autre technicien")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "claim", "intervention", intervention_id)
    
    # Get current user info for notification
    claiming_tech = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "prenom": 1, "nom": 1})
    tech_name = f"{claiming_tech.get('prenom', '')} {claiming_tech.get('nom', '')}" if claiming_tech else "Un technicien"
    
    return {
        "message": "Intervention assignée avec succès",
        "intervention_id": intervention_id,
        "technicien_id": current_user["user_id"],
        "technicien_nom": tech_name
    }

@api_router.post("/interventions/{intervention_id}/complete")
async def complete_intervention(intervention_id: str, notes_terrain: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Complete an intervention"""
    now = datetime.now(timezone.utc).isoformat()
    update = {"statut": "terminee", "heure_fin": now}
    if notes_terrain:
        update["notes_terrain"] = notes_terrain
    
    result = await db.interventions.update_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"], "technicien_id": current_user["user_id"]},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "complete", "intervention", intervention_id)
    return {"message": "Intervention terminée", "heure_fin": now}

@api_router.put("/interventions/{intervention_id}/checklist")
async def update_intervention_checklist(
    intervention_id: str,
    responses: List[ChecklistResponse],
    current_user: dict = Depends(get_current_user)
):
    """Update checklist responses for an intervention"""
    # Verify access
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Techs can only update their own interventions
    if current_user["role"] == "tech" and intervention.get("technicien_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Convert to dict and add timestamp
    responses_dict = []
    for r in responses:
        r_dict = r.model_dump()
        if r_dict.get("checked") or r_dict.get("value") or r_dict.get("photo_url"):
            r_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
        responses_dict.append(r_dict)
    
    await db.interventions.update_one(
        {"id": intervention_id},
        {"$set": {"checklist_responses": responses_dict}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_checklist", "intervention", intervention_id)
    return {"message": "Checklist mise à jour", "responses": responses_dict}

# ==================== DEVIS ROUTES ====================
@api_router.post("/devis")
async def create_devis(data: DevisCreate, current_user: dict = Depends(get_current_user)):
    """Create a new devis"""
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get next sequence number
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_devis", 1)
    year = datetime.now().year
    numero_devis = f"D{year}-{seq:05d}"
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$inc": {"sequence_devis": 1}}
    )
    
    # Calculate totals
    lignes = [l.model_dump() for l in data.lignes]
    total_ht, total_tva, total_ttc = calculate_totals(lignes)
    
    devis_dict = data.model_dump()
    devis_dict["lignes"] = lignes
    devis_dict["id"] = str(uuid.uuid4())
    devis_dict["entreprise_id"] = current_user["entreprise_id"]
    devis_dict["technicien_id"] = current_user["user_id"] if current_user["role"] == "tech" else None
    devis_dict["numero_devis"] = numero_devis
    devis_dict["statut"] = "brouillon"
    devis_dict["total_ht"] = total_ht
    devis_dict["total_tva"] = total_tva
    devis_dict["total_ttc"] = total_ttc
    devis_dict["token_client"] = str(uuid.uuid4())
    devis_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    devis_dict["date_expiration"] = (datetime.now(timezone.utc) + timedelta(days=data.validite_jours)).isoformat()
    
    await db.devis.insert_one(devis_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "devis", devis_dict["id"])
    
    return serialize_doc(devis_dict)

@api_router.get("/devis")
async def list_devis(
    statut: Optional[str] = None,
    client_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all devis"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    if statut:
        query["statut"] = statut
    if client_id:
        query["client_id"] = client_id
    
    devis_list = await db.devis.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with client names
    for d in devis_list:
        client = await db.clients.find_one({"id": d["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1})
        d["client_nom"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else ""
    
    return [serialize_doc(d) for d in devis_list]

@api_router.get("/devis/{devis_id}")
async def get_devis(devis_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific devis"""
    query = {"id": devis_id, "entreprise_id": current_user["entreprise_id"]}
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    devis = await db.devis.find_one(query, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    devis["client"] = serialize_doc(client) if client else None
    
    return serialize_doc(devis)

@api_router.put("/devis/{devis_id}")
async def update_devis(devis_id: str, data: DevisUpdate, current_user: dict = Depends(get_current_user)):
    """Update a devis"""
    query = {"id": devis_id, "entreprise_id": current_user["entreprise_id"]}
    
    devis = await db.devis.find_one(query, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    if devis["statut"] not in ["brouillon", "envoye"]:
        raise HTTPException(status_code=400, detail="Ce devis ne peut plus être modifié")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "lignes" in update_data:
        lignes = [l if isinstance(l, dict) else l.model_dump() for l in update_data["lignes"]]
        update_data["lignes"] = lignes
        total_ht, total_tva, total_ttc = calculate_totals(lignes)
        update_data["total_ht"] = total_ht
        update_data["total_tva"] = total_tva
        update_data["total_ttc"] = total_ttc
    
    await db.devis.update_one(query, {"$set": update_data})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "devis", devis_id)
    
    devis = await db.devis.find_one({"id": devis_id}, {"_id": 0})
    return serialize_doc(devis)

@api_router.delete("/devis/{devis_id}")
async def delete_devis(devis_id: str, current_user: dict = Depends(require_admin)):
    """Delete a devis (admin only, only brouillon/envoye status)"""
    devis = await db.devis.find_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    if devis["statut"] not in ["brouillon", "envoye"]:
        raise HTTPException(status_code=400, detail="Impossible de supprimer un devis signé ou facturé")
    
    await db.devis.delete_one({"id": devis_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "devis", devis_id)
    
    return {"message": "Devis supprimé"}

@api_router.post("/devis/{devis_id}/send")
async def send_devis(devis_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Mark devis as sent and send email to client"""
    # Get devis before update
    devis = await db.devis.find_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"], "statut": "brouillon"},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà envoyé")
    
    # Update status
    await db.devis.update_one(
        {"id": devis_id},
        {"$set": {"statut": "envoye"}}
    )
    
    # Get client and entreprise for email
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    # Generate PDF
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    # Send email with PDF
    email_result = {"status": "skipped", "message": "Email non envoyé"}
    if client and client.get("email"):
        # Get base URL from request
        base_url = str(request.base_url).rstrip('/')
        # Remove /api suffix if present
        if '/api' in base_url:
            base_url = base_url.rsplit('/api', 1)[0]
        
        email_result = await send_devis_email(devis, client, entreprise or {}, pdf_bytes, base_url)
        
        # Log communication
        if email_result.get("_log_data"):
            log_data = email_result.pop("_log_data")
            await communication_log.log_email(
                entreprise_id=current_user["entreprise_id"],
                client_id=client["id"],
                recipient_email=log_data["recipient"],
                subject=log_data["subject"],
                content_preview=log_data["content_preview"],
                status="sent" if email_result.get("status") == "success" else "failed",
                error_message=email_result.get("message") if email_result.get("status") != "success" else None,
                related_entity=log_data["related_entity"],
                related_entity_id=log_data["related_entity_id"],
                sent_by=current_user["user_id"]
            )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "send", "devis", devis_id, {"email_sent": email_result.get("status") == "success"})
    
    return {
        "message": "Devis envoyé",
        "token_client": devis["token_client"],
        "email": email_result
    }

@api_router.post("/devis/{devis_id}/sign")
async def sign_devis(devis_id: str, signature: str, nom_signataire: str, current_user: dict = Depends(get_current_user)):
    """Sign a devis"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.devis.update_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["brouillon", "envoye"]}},
        {"$set": {"statut": "signe", "signature_client": signature, "nom_signataire": nom_signataire, "date_signature": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà signé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sign", "devis", devis_id)
    return {"message": "Devis signé", "date_signature": now}

@api_router.get("/devis/{devis_id}/pdf")
async def get_devis_pdf(devis_id: str, auth: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Generate and return devis PDF"""
    devis = await db.devis.find_one({"id": devis_id, "entreprise_id": current_user["entreprise_id"]}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=devis_{devis['numero_devis']}.pdf"}
    )

@api_router.get("/devis/{devis_id}/pdf-download")
async def download_devis_pdf(devis_id: str, token: str):
    """Download devis PDF with token auth (for browser download)"""
    # Verify token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    devis = await db.devis.find_one({"id": devis_id, "entreprise_id": user["entreprise_id"]}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=devis_{devis['numero_devis']}.pdf"}
    )

# ==================== CLIENT PORTAL ROUTES ====================
@api_router.get("/portal/devis/{token}")
async def get_portal_devis(token: str):
    """Get devis for client portal (no auth required)"""
    devis = await db.devis.find_one({"token_client": token}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": devis["entreprise_id"]}, {"_id": 0, "nom": 1, "adresse": 1, "telephone": 1, "email": 1, "logo_url": 1})
    
    return {
        "devis": serialize_doc(devis),
        "client": serialize_doc(client) if client else None,
        "entreprise": serialize_doc(entreprise) if entreprise else None
    }

@api_router.post("/portal/devis/{token}/sign")
async def sign_portal_devis(token: str, signature: str, nom_signataire: str):
    """Sign devis from client portal (no auth required)"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.devis.update_one(
        {"token_client": token, "statut": {"$in": ["brouillon", "envoye"]}},
        {"$set": {"statut": "signe", "signature_client": signature, "nom_signataire": nom_signataire, "date_signature": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà signé")
    
    return {"message": "Devis signé avec succès", "date_signature": now}

@api_router.get("/portal/devis/{token}/pdf")
async def get_portal_devis_pdf(token: str):
    """Get devis PDF from client portal (no auth required)"""
    devis = await db.devis.find_one({"token_client": token}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": devis["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=devis_{devis['numero_devis']}.pdf"}
    )

# ==================== CLIENT PORTAL - DASHBOARD ====================
@api_router.get("/portal/client/{token}")
async def get_client_portal_dashboard(token: str):
    """Get client dashboard with all their documents (no auth required)"""
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Accès non autorisé")
    
    entreprise = await db.entreprises.find_one(
        {"id": client["entreprise_id"]}, 
        {"_id": 0, "nom": 1, "adresse": 1, "ville": 1, "code_postal": 1, "telephone": 1, "email": 1, "logo_url": 1, "couleur_primaire": 1}
    )
    
    # Get all devis for this client
    devis_cursor = db.devis.find(
        {"client_id": client["id"]},
        {"_id": 0, "id": 1, "numero_devis": 1, "statut": 1, "total_ttc": 1, "created_at": 1, "date_expiration": 1, "token_client": 1}
    ).sort("created_at", -1).limit(50)
    devis_list = await devis_cursor.to_list(length=50)
    
    # Get all factures for this client
    factures_cursor = db.factures.find(
        {"client_id": client["id"]},
        {"_id": 0, "id": 1, "numero_facture": 1, "statut": 1, "total_ttc": 1, "montant_paye": 1, "created_at": 1, "date_echeance": 1}
    ).sort("created_at", -1).limit(50)
    factures_list = await factures_cursor.to_list(length=50)
    
    # Get recent interventions for this client
    interventions_cursor = db.interventions.find(
        {"client_id": client["id"]},
        {"_id": 0, "id": 1, "titre": 1, "statut": 1, "date_debut": 1, "date_fin": 1}
    ).sort("date_debut", -1).limit(20)
    interventions_list = await interventions_cursor.to_list(length=20)
    
    # Calculate summary stats
    total_devis = len(devis_list)
    devis_en_attente = sum(1 for d in devis_list if d.get("statut") in ["brouillon", "envoye"])
    devis_signes = sum(1 for d in devis_list if d.get("statut") == "signe")
    
    total_factures = len(factures_list)
    factures_impayees = sum(1 for f in factures_list if f.get("statut") in ["brouillon", "emise"])
    montant_du = sum((f.get("total_ttc", 0) - f.get("montant_paye", 0)) for f in factures_list if f.get("statut") != "payee")
    
    return {
        "client": serialize_doc(client),
        "entreprise": serialize_doc(entreprise) if entreprise else None,
        "devis": [serialize_doc(d) for d in devis_list],
        "factures": [serialize_doc(f) for f in factures_list],
        "interventions": [serialize_doc(i) for i in interventions_list],
        "summary": {
            "total_devis": total_devis,
            "devis_en_attente": devis_en_attente,
            "devis_signes": devis_signes,
            "total_factures": total_factures,
            "factures_impayees": factures_impayees,
            "montant_du": round(montant_du, 2)
        }
    }

@api_router.get("/portal/facture/{facture_id}")
async def get_portal_facture(facture_id: str, token: str):
    """Get facture for client portal (requires client token)"""
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    entreprise = await db.entreprises.find_one(
        {"id": facture["entreprise_id"]}, 
        {"_id": 0, "nom": 1, "adresse": 1, "ville": 1, "code_postal": 1, "telephone": 1, "email": 1, "logo_url": 1, "siret": 1, "tva_intra": 1}
    )
    
    return {
        "facture": serialize_doc(facture),
        "client": serialize_doc(client),
        "entreprise": serialize_doc(entreprise) if entreprise else None
    }

@api_router.get("/portal/facture/{facture_id}/pdf")
async def get_portal_facture_pdf(facture_id: str, token: str):
    """Get facture PDF from client portal (requires client token)"""
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_facture_pdf(facture, client, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=facture_{facture['numero_facture']}.pdf"}
    )

@api_router.get("/clients/{client_id}/portal-link")
async def get_client_portal_link(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get the portal link for a client (admin only)"""
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "id": 1, "portal_token": 1, "nom": 1, "prenom": 1}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Generate portal_token if not exists
    if not client.get("portal_token"):
        portal_token = str(uuid.uuid4())
        await db.clients.update_one(
            {"id": client_id},
            {"$set": {"portal_token": portal_token}}
        )
        client["portal_token"] = portal_token
    
    return {
        "client_id": client["id"],
        "client_name": f"{client.get('nom', '')} {client.get('prenom', '')}".strip(),
        "portal_token": client["portal_token"],
        "portal_url": f"/portal/client/{client['portal_token']}"
    }

# ==================== PORTAL PAYMENT (STRIPE) ====================
@api_router.post("/portal/facture/{facture_id}/pay")
async def create_facture_payment_session(
    facture_id: str,
    token: str,
    request: Request
):
    """Create a Stripe checkout session to pay a facture from client portal"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    # Verify client token
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    # Get facture
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Check if already paid
    if facture.get("statut") == "payee":
        raise HTTPException(status_code=400, detail="Cette facture est déjà payée")
    
    # Get entreprise info
    entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
    
    # Calculate amount due
    amount_due = facture.get("total_ttc", 0) - facture.get("montant_paye", 0)
    if amount_due <= 0:
        raise HTTPException(status_code=400, detail="Aucun montant à payer")
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Paiement non configuré")
    
    # Build URLs - use portal URL for return
    base_url = str(request.base_url).rstrip('/')
    # Extract origin from referer or use base_url
    origin = request.headers.get('origin', base_url.replace('/api', ''))
    
    success_url = f"{origin}/portal/client/{token}?payment=success&facture={facture_id}"
    cancel_url = f"{origin}/portal/client/{token}?payment=cancelled&facture={facture_id}"
    
    # Initialize Stripe
    webhook_url = f"{base_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(amount_due),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "type": "facture_payment",
            "facture_id": facture_id,
            "facture_numero": facture.get("numero_facture", ""),
            "client_id": client["id"],
            "client_name": f"{client.get('nom', '')} {client.get('prenom', '')}".strip(),
            "entreprise_id": facture["entreprise_id"],
            "entreprise_name": entreprise.get("nom", "") if entreprise else ""
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "type": "facture_payment",
        "facture_id": facture_id,
        "facture_numero": facture.get("numero_facture", ""),
        "client_id": client["id"],
        "entreprise_id": facture["entreprise_id"],
        "amount": amount_due,
        "currency": "eur",
        "status": "pending",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    logger.info(f"Created payment session for facture {facture.get('numero_facture')}: {session.session_id}")
    
    return {
        "url": session.url,
        "session_id": session.session_id,
        "amount": amount_due
    }

@api_router.get("/portal/facture/{facture_id}/payment-status")
async def get_facture_payment_status(facture_id: str, token: str, session_id: str, request: Request):
    """Check payment status for a facture"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    # Verify client token
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    # Get facture
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Paiement non configuré")
    
    base_url = str(request.base_url).rstrip('/')
    webhook_url = f"{base_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # If paid, update facture
    if status.payment_status == "paid":
        await process_facture_payment(facture_id, session_id, status.amount_total / 100)
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "facture_statut": facture.get("statut")
    }

async def process_facture_payment(facture_id: str, session_id: str, amount_paid: float):
    """Process a successful facture payment"""
    # Check if already processed (idempotency)
    existing = await db.payment_transactions.find_one({
        "session_id": session_id,
        "payment_status": "paid"
    })
    if existing:
        logger.info(f"Payment already processed for session {session_id}")
        return
    
    # Get facture
    facture = await db.factures.find_one({"id": facture_id}, {"_id": 0})
    if not facture:
        logger.error(f"Facture not found: {facture_id}")
        return
    
    # Update facture
    new_montant_paye = facture.get("montant_paye", 0) + amount_paid
    total_ttc = facture.get("total_ttc", 0)
    
    update_data = {
        "montant_paye": new_montant_paye,
        "date_paiement": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Mark as paid if fully paid
    if new_montant_paye >= total_ttc:
        update_data["statut"] = "payee"
    
    await db.factures.update_one(
        {"id": facture_id},
        {"$set": update_data}
    )
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "complete",
            "payment_status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send confirmation email
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
    
    if client and client.get("email"):
        try:
            await send_payment_confirmation_email(facture, client, entreprise, amount_paid)
        except Exception as e:
            logger.warning(f"Failed to send payment confirmation email: {e}")
    
    logger.info(f"Processed payment for facture {facture.get('numero_facture')}: {amount_paid}€")

async def send_payment_confirmation_email(facture: dict, client: dict, entreprise: dict, amount: float):
    """Send payment confirmation email to client"""
    try:
        from email_service import send_email
        
        client_name = f"{client.get('prenom', '')} {client.get('nom', '')}".strip()
        entreprise_name = entreprise.get("nom", "L'entreprise") if entreprise else "L'entreprise"
        
        subject = f"Confirmation de paiement - Facture {facture.get('numero_facture')}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Paiement reçu</h2>
            <p>Bonjour {client_name},</p>
            <p>Nous avons bien reçu votre paiement de <strong>{amount:.2f}€</strong> pour la facture <strong>{facture.get('numero_facture')}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Facture:</strong> {facture.get('numero_facture')}</p>
                <p style="margin: 5px 0;"><strong>Montant payé:</strong> {amount:.2f}€</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {datetime.now().strftime('%d/%m/%Y à %H:%M')}</p>
            </div>
            <p>Merci pour votre confiance.</p>
            <p>Cordialement,<br/>{entreprise_name}</p>
        </div>
        """
        
        await send_email(
            to_email=client["email"],
            subject=subject,
            html_content=html_content,
            from_name=entreprise_name
        )
        
        # Log communication
        await db.communications.insert_one({
            "id": str(uuid.uuid4()),
            "entreprise_id": facture["entreprise_id"],
            "client_id": client["id"],
            "type": "email",
            "sujet": subject,
            "destinataire": client["email"],
            "preview": f"Confirmation de paiement de {amount:.2f}€ pour la facture {facture.get('numero_facture')}",
            "status": "sent",
            "date_envoi": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Error sending payment confirmation email: {e}")

# ==================== FACTURE ROUTES ====================
@api_router.post("/factures")
async def create_facture(data: FactureCreate, current_user: dict = Depends(get_current_user)):
    """Create a new facture"""
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get next sequence number
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_facture", 1)
    year = datetime.now().year
    numero_facture = f"F{year}-{seq:05d}"
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$inc": {"sequence_facture": 1}}
    )
    
    # Calculate totals
    lignes = [l.model_dump() for l in data.lignes]
    total_ht, total_tva, total_ttc = calculate_totals(lignes)
    
    facture_dict = data.model_dump()
    facture_dict["lignes"] = lignes
    facture_dict["id"] = str(uuid.uuid4())
    facture_dict["entreprise_id"] = current_user["entreprise_id"]
    facture_dict["technicien_id"] = current_user["user_id"] if current_user["role"] == "tech" else None
    facture_dict["numero_facture"] = numero_facture
    facture_dict["statut"] = "brouillon"
    facture_dict["total_ht"] = total_ht
    facture_dict["total_tva"] = total_tva
    facture_dict["total_ttc"] = total_ttc
    facture_dict["montant_paye"] = 0
    facture_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    facture_dict["date_echeance"] = (datetime.now(timezone.utc) + timedelta(days=data.echeance_jours)).isoformat()
    
    await db.factures.insert_one(facture_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "facture", facture_dict["id"])
    
    return serialize_doc(facture_dict)

@api_router.post("/factures/from-devis")
async def create_facture_from_devis(data: FactureFromDevis, current_user: dict = Depends(get_current_user)):
    """Create facture from signed devis"""
    devis = await db.devis.find_one(
        {"id": data.devis_id, "entreprise_id": current_user["entreprise_id"], "statut": "signe"},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis signé non trouvé")
    
    # Get next sequence number
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_facture", 1)
    year = datetime.now().year
    numero_facture = f"F{year}-{seq:05d}"
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$inc": {"sequence_facture": 1}}
    )
    
    facture_dict = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user["entreprise_id"],
        "client_id": devis["client_id"],
        "devis_id": devis["id"],
        "intervention_id": devis.get("intervention_id"),
        "technicien_id": devis.get("technicien_id"),
        "numero_facture": numero_facture,
        "lignes": devis["lignes"],
        "statut": "emise",
        "total_ht": devis["total_ht"],
        "total_tva": devis["total_tva"],
        "total_ttc": devis["total_ttc"],
        "montant_paye": 0,
        "conditions_paiement": "Paiement à réception de facture",
        "echeance_jours": 30,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "date_echeance": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    
    await db.factures.insert_one(facture_dict)
    
    # Update devis status
    await db.devis.update_one({"id": data.devis_id}, {"$set": {"statut": "facture"}})
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "facture", facture_dict["id"], {"from_devis": data.devis_id})
    
    return serialize_doc(facture_dict)

@api_router.get("/factures")
async def list_factures(
    statut: Optional[str] = None,
    client_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all factures"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if statut:
        query["statut"] = statut
    if client_id:
        query["client_id"] = client_id
    
    factures = await db.factures.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with client names
    for f in factures:
        client = await db.clients.find_one({"id": f["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1})
        f["client_nom"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else ""
    
    return [serialize_doc(f) for f in factures]

@api_router.get("/factures/{facture_id}")
async def get_facture(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific facture"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    facture["client"] = serialize_doc(client) if client else None
    
    return serialize_doc(facture)

@api_router.post("/factures/{facture_id}/emit")
async def emit_facture(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Emit a facture and send email to client"""
    # Get facture before update
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"], "statut": "brouillon"},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée ou déjà émise")
    
    # Update status
    await db.factures.update_one(
        {"id": facture_id},
        {"$set": {"statut": "emise"}}
    )
    
    # Get client and entreprise for email
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    # Generate PDF
    pdf_bytes = generate_facture_pdf(facture, client or {}, entreprise or {})
    
    # Send email with PDF
    email_result = {"status": "skipped", "message": "Email non envoyé"}
    if client and client.get("email"):
        email_result = await send_facture_email(facture, client, entreprise or {}, pdf_bytes)
        
        # Log communication
        if email_result.get("_log_data"):
            log_data = email_result.pop("_log_data")
            await communication_log.log_email(
                entreprise_id=current_user["entreprise_id"],
                client_id=client["id"],
                recipient_email=log_data["recipient"],
                subject=log_data["subject"],
                content_preview=log_data["content_preview"],
                status="sent" if email_result.get("status") == "success" else "failed",
                error_message=email_result.get("message") if email_result.get("status") != "success" else None,
                related_entity=log_data["related_entity"],
                related_entity_id=log_data["related_entity_id"],
                sent_by=current_user["user_id"]
            )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "emit", "facture", facture_id, {"email_sent": email_result.get("status") == "success"})
    
    return {
        "message": "Facture émise",
        "email": email_result
    }

@api_router.post("/factures/{facture_id}/pay")
async def mark_facture_paid(facture_id: str, montant: float, mode_paiement: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Mark facture as paid"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    new_montant_paye = facture.get("montant_paye", 0) + montant
    update = {
        "montant_paye": new_montant_paye,
        "date_paiement": datetime.now(timezone.utc).isoformat()
    }
    if mode_paiement:
        update["mode_paiement"] = mode_paiement
    
    if new_montant_paye >= facture["total_ttc"]:
        update["statut"] = "payee"
    
    await db.factures.update_one({"id": facture_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "pay", "facture", facture_id, {"montant": montant})
    
    return {"message": "Paiement enregistré", "montant_paye": new_montant_paye, "statut": update.get("statut", facture["statut"])}

@api_router.get("/factures/{facture_id}/pdf")
async def get_facture_pdf(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Generate and return facture PDF"""
    facture = await db.factures.find_one({"id": facture_id, "entreprise_id": current_user["entreprise_id"]}, {"_id": 0})
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_facture_pdf(facture, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=facture_{facture['numero_facture']}.pdf"}
    )

@api_router.get("/factures/{facture_id}/pdf-download")
async def download_facture_pdf(facture_id: str, token: str):
    """Download facture PDF with token auth (for browser download)"""
    # Verify token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    facture = await db.factures.find_one({"id": facture_id, "entreprise_id": user["entreprise_id"]}, {"_id": 0})
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_facture_pdf(facture, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=facture_{facture['numero_facture']}.pdf"}
    )

@api_router.delete("/factures/{facture_id}")
async def delete_facture(facture_id: str, current_user: dict = Depends(require_admin)):
    """Delete a facture (admin only, only brouillon status)"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if facture["statut"] != "brouillon":
        raise HTTPException(status_code=400, detail="Seules les factures en brouillon peuvent être supprimées")
    
    await db.factures.delete_one({"id": facture_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "facture", facture_id)
    
    return {"message": "Facture supprimée"}


@api_router.post("/factures/{facture_id}/relance")
async def send_relance(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Send payment reminder email for unpaid facture"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["emise", "en_retard"]}},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée ou déjà payée")
    
    # Calculate days overdue
    date_echeance = datetime.fromisoformat(facture.get("date_echeance", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
    jours_retard = max(0, (datetime.now(timezone.utc) - date_echeance).days)
    
    # Get client and entreprise
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("email"):
        raise HTTPException(status_code=400, detail="Le client n'a pas d'adresse email")
    
    # Send reminder email
    email_result = await send_relance_email(facture, client, entreprise or {}, jours_retard)
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "relance", "facture", facture_id, {"email_sent": email_result.get("status") == "success"})
    
    return {
        "message": "Relance envoyée",
        "jours_retard": jours_retard,
        "email": email_result
    }

# ==================== SMS ROUTES ====================
@api_router.post("/sms/intervention/{intervention_id}/reminder")
async def send_sms_intervention_reminder(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Send SMS reminder for an intervention"""
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    client = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    sms_result = await send_intervention_reminder(client, intervention, entreprise or {})
    
    # Log communication
    await communication_log.log_sms(
        entreprise_id=current_user["entreprise_id"],
        client_id=client["id"],
        phone_number=client["telephone"],
        message=f"Rappel intervention: {intervention.get('titre', '')}",
        status="sent" if sms_result.get("success") else "failed",
        error_message=sms_result.get("error") if not sms_result.get("success") else None,
        related_entity="intervention",
        related_entity_id=intervention_id,
        sent_by=current_user["user_id"]
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_reminder", "intervention", intervention_id)
    
    return {"message": "SMS envoyé", "sms": sms_result}

@api_router.post("/sms/devis/{devis_id}/notification")
async def send_sms_devis_notification(devis_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Send SMS notification for a quote"""
    devis = await db.devis.find_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    # Build portal URL
    base_url = str(request.base_url).rstrip('/')
    if '/api' in base_url:
        base_url = base_url.rsplit('/api', 1)[0]
    portal_url = f"{base_url}/portal/devis/{devis['token_client']}"
    
    sms_result = await send_devis_notification(client, devis, entreprise or {}, portal_url)
    
    # Log communication
    await communication_log.log_sms(
        entreprise_id=current_user["entreprise_id"],
        client_id=client["id"],
        phone_number=client["telephone"],
        message=f"Notification devis {devis.get('numero_devis', '')}",
        status="sent" if sms_result.get("success") else "failed",
        error_message=sms_result.get("error") if not sms_result.get("success") else None,
        related_entity="devis",
        related_entity_id=devis_id,
        sent_by=current_user["user_id"]
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_notification", "devis", devis_id)
    
    return {"message": "SMS envoyé", "sms": sms_result}

@api_router.post("/sms/facture/{facture_id}/notification")
async def send_sms_facture_notification(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Send SMS notification for an invoice"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    sms_result = await send_facture_notification(client, facture, entreprise or {})
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_notification", "facture", facture_id)
    
    return {"message": "SMS envoyé", "sms": sms_result}

@api_router.post("/sms/facture/{facture_id}/reminder")
async def send_sms_payment_reminder(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Send SMS payment reminder"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["emise", "en_retard"]}},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée ou déjà payée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    # Calculate days overdue
    date_echeance = datetime.fromisoformat(facture.get("date_echeance", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
    jours_retard = max(0, (datetime.now(timezone.utc) - date_echeance).days)
    
    sms_result = await send_payment_reminder(client, facture, entreprise or {}, jours_retard)
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_relance", "facture", facture_id)
    
    return {"message": "SMS envoyé", "jours_retard": jours_retard, "sms": sms_result}

@api_router.get("/sms/status")
async def get_sms_status(current_user: dict = Depends(get_current_user)):
    """Check if SMS (Twilio) is configured"""
    twilio_configured = bool(os.environ.get('TWILIO_ACCOUNT_SID') and os.environ.get('TWILIO_AUTH_TOKEN'))
    return {
        "configured": twilio_configured,
        "phone_number": os.environ.get('TWILIO_PHONE_NUMBER', '')[:6] + '****' if twilio_configured else None
    }

# ==================== STRIPE / SUBSCRIPTION ROUTES ====================

@api_router.get("/plans")
async def list_subscription_plans():
    """List all available subscription plans (public endpoint)"""
    plans = []
    for plan_id, plan_data in SUBSCRIPTION_PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan_data["name"],
            "price": plan_data["price"],
            "currency": plan_data["currency"],
            "description": plan_data["description"],
            "features": plan_data["features"]
        })
    return plans

@api_router.post("/checkout/session")
async def create_checkout_session(
    request: Request,
    plan_id: str,
    origin_url: str,
    entreprise_name: Optional[str] = None,
    admin_email: Optional[str] = None
):
    """Create a Stripe checkout session for subscription"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    # Validate plan
    plan = get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    # Build URLs
    success_url = f"{origin_url}/signup/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/signup?cancelled=true"
    
    # Initialize Stripe
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session with plan amount
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "entreprise_name": entreprise_name or "",
            "admin_email": admin_email or "",
            "type": "subscription"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create pending payment transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "plan_id": plan_id,
        "plan_name": plan["name"],
        "amount": plan["price"],
        "currency": plan["currency"],
        "status": "pending",
        "payment_status": "initiated",
        "entreprise_name": entreprise_name,
        "admin_email": admin_email,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    logger.info(f"Created checkout session for plan {plan_id}: {session.session_id}")
    
    return {
        "url": session.url,
        "session_id": session.session_id
    }

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Get status of a checkout session"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction in database
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction:
        update_data = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # If payment is successful and not already processed
        if status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
            
            # Create the entreprise account
            if transaction.get("entreprise_name") and transaction.get("admin_email"):
                await create_entreprise_from_subscription(
                    transaction["entreprise_name"],
                    transaction["admin_email"],
                    transaction["plan_id"],
                    session_id
                )
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

async def create_entreprise_from_subscription(
    entreprise_name: str,
    admin_email: str,
    plan_id: str,
    session_id: str
):
    """Create entreprise and admin user after successful subscription payment"""
    # Check if already created (idempotency)
    existing = await db.entreprises.find_one({"stripe_session_id": session_id})
    if existing:
        logger.info(f"Entreprise already created for session {session_id}")
        return existing["id"]
    
    # Create entreprise
    entreprise_id = str(uuid.uuid4())
    plan = get_plan(plan_id)
    
    entreprise_doc = {
        "id": entreprise_id,
        "nom": entreprise_name,
        "email": admin_email,
        "plan": plan_id,
        "plan_name": plan["name"] if plan else "Starter",
        "plan_limits": {
            "max_technicians": plan.get("max_technicians", 3) if plan else 3,
            "max_interventions_month": plan.get("max_interventions_month", 100) if plan else 100,
            "max_categories": plan.get("max_categories", 1) if plan else 1
        },
        "stripe_session_id": session_id,
        "subscription_status": "active",
        "subscription_started_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.entreprises.insert_one(entreprise_doc)
    
    # Create admin user with temporary password
    import secrets
    temp_password = secrets.token_urlsafe(12)
    admin_id = str(uuid.uuid4())
    
    admin_doc = {
        "id": admin_id,
        "entreprise_id": entreprise_id,
        "email": admin_email,
        "password_hash": get_password_hash(temp_password),
        "nom": "Admin",
        "prenom": entreprise_name,
        "role": "admin",
        "statut": "actif",
        "must_change_password": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    
    # Send welcome email with credentials
    try:
        from email_service import send_email
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Bienvenue sur Actoos!</h1>
            <p>Félicitations, votre compte <strong>{entreprise_name}</strong> a été créé avec succès.</p>
            <p>Voici vos identifiants de connexion :</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Email :</strong> {admin_email}</p>
                <p><strong>Mot de passe temporaire :</strong> {temp_password}</p>
            </div>
            <p style="color: #dc2626;">Veuillez changer votre mot de passe lors de votre première connexion.</p>
            <p>Plan souscrit : <strong>{plan["name"] if plan else "Starter"}</strong></p>
            <a href="#" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                Accéder à mon espace
            </a>
        </div>
        """
        await send_email(
            to_email=admin_email,
            subject=f"Bienvenue sur Actoos - Votre compte {entreprise_name}",
            html_content=html_content
        )
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
    
    logger.info(f"Created entreprise {entreprise_name} ({entreprise_id}) with admin {admin_email}")
    return entreprise_id

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Get request body
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Webhook event: {webhook_response.event_type}, session: {webhook_response.session_id}")
        
        # Update transaction based on event
        if webhook_response.session_id:
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id}
            )
            
            if transaction:
                update_data = {
                    "webhook_event": webhook_response.event_type,
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if webhook_response.payment_status == "paid" and transaction.get("payment_status") != "paid":
                    update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                    
                    # Create entreprise if not already done
                    if transaction.get("entreprise_name") and transaction.get("admin_email"):
                        await create_entreprise_from_subscription(
                            transaction["entreprise_name"],
                            transaction["admin_email"],
                            transaction["plan_id"],
                            webhook_response.session_id
                        )
                
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": update_data}
                )
        
        return {"received": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/subscription/current")
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Get current entreprise subscription details"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1, "plan_name": 1, "plan_limits": 1, "subscription_status": 1, "subscription_started_at": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Get current usage
    tech_count = await db.users.count_documents({
        "entreprise_id": current_user["entreprise_id"],
        "role": "tech",
        "statut": "actif"
    })
    
    # Count interventions this month
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    intervention_count = await db.interventions.count_documents({
        "entreprise_id": current_user["entreprise_id"],
        "created_at": {"$gte": first_of_month.isoformat()}
    })
    
    plan = get_plan(entreprise.get("plan", "starter"))
    
    return {
        "plan_id": entreprise.get("plan", "starter"),
        "plan_name": entreprise.get("plan_name", "Starter"),
        "status": entreprise.get("subscription_status", "active"),
        "started_at": entreprise.get("subscription_started_at"),
        "limits": entreprise.get("plan_limits", {}),
        "current_plan_details": plan,
        "usage": {
            "technicians": tech_count,
            "interventions_this_month": intervention_count
        }
    }

# ==================== PHOTO ROUTES ====================
@api_router.post("/interventions/{intervention_id}/photos")
async def upload_photo(
    intervention_id: str,
    file: UploadFile = File(...),
    type_photo: str = "autre",
    description: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Upload photo for intervention with EXIF stripping and compression"""
    from image_utils import strip_exif_and_compress, is_valid_image
    
    # Verify intervention exists and belongs to user
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Read file data
    data = await file.read()
    
    # Validate it's an image
    if not is_valid_image(data):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas une image valide")
    
    # Process image: strip EXIF (GPS privacy) and compress
    processed_data, content_type = strip_exif_and_compress(data, max_size_kb=500)
    
    # Upload to storage (always as .jpg after processing)
    storage_path = f"{APP_NAME}/photos/{current_user['entreprise_id']}/{intervention_id}/{uuid.uuid4()}.jpg"
    
    result = put_object(storage_path, processed_data, content_type)
    if not result:
        raise HTTPException(status_code=500, detail="Erreur lors du téléchargement")
    
    # Save to database
    photo_dict = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user["entreprise_id"],
        "intervention_id": intervention_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "type_photo": type_photo,
        "description": description,
        "size_bytes": len(processed_data),
        "exif_stripped": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False
    }
    await db.photos.insert_one(photo_dict)
    
    # Update intervention photos list
    await db.interventions.update_one(
        {"id": intervention_id},
        {"$push": {"photos": photo_dict["id"]}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "upload", "photo", photo_dict["id"])
    
    return serialize_doc(photo_dict)

@api_router.get("/interventions/{intervention_id}/photos")
async def list_intervention_photos(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """List photos for an intervention"""
    photos = await db.photos.find(
        {"intervention_id": intervention_id, "entreprise_id": current_user["entreprise_id"], "is_deleted": False},
        {"_id": 0}
    ).to_list(100)
    return [serialize_doc(p) for p in photos]

@api_router.get("/photos/{photo_id}")
async def get_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    """Download a photo"""
    photo = await db.photos.find_one(
        {"id": photo_id, "entreprise_id": current_user["entreprise_id"], "is_deleted": False},
        {"_id": 0}
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    data, content_type = get_object(photo["storage_path"])
    if not data:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return Response(content=data, media_type=photo.get("content_type", content_type))

# ==================== RAPPORTS / REPORTS ====================
@api_router.get("/rapports/monthly-revenue")
async def get_monthly_revenue(current_user: dict = Depends(get_current_user)):
    """Get monthly revenue data for charts"""
    ent_id = current_user["entreprise_id"]
    
    # Get last 12 months of data
    today = datetime.now(timezone.utc)
    months_data = []
    
    for i in range(11, -1, -1):
        # Calculate month start and end
        month_date = today - timedelta(days=i * 30)
        month_start = datetime(month_date.year, month_date.month, 1, 0, 0, 0, tzinfo=timezone.utc)
        if month_date.month == 12:
            month_end = datetime(month_date.year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        else:
            month_end = datetime(month_date.year, month_date.month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        
        # Query revenue for this month
        pipeline = [
            {"$match": {
                "entreprise_id": ent_id,
                "statut": "payee",
                "date_paiement": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
        ]
        result = await db.factures.aggregate(pipeline).to_list(1)
        revenue = result[0]["total"] if result else 0
        
        # Get month label
        month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
        month_label = month_names[month_start.month - 1]
        
        months_data.append({
            "month": month_label,
            "year": month_start.year,
            "revenue": round(revenue, 2)
        })
    
    return months_data

@api_router.get("/rapports/top-clients")
async def get_top_clients(limit: int = 10, current_user: dict = Depends(get_current_user)):
    """Get top clients by revenue"""
    ent_id = current_user["entreprise_id"]
    
    # Aggregate revenue by client from paid invoices
    pipeline = [
        {"$match": {"entreprise_id": ent_id, "statut": "payee"}},
        {"$group": {
            "_id": "$client_id",
            "total_ca": {"$sum": "$total_ttc"},
            "factures_count": {"$sum": 1}
        }},
        {"$sort": {"total_ca": -1}},
        {"$limit": limit}
    ]
    
    results = await db.factures.aggregate(pipeline).to_list(limit)
    
    # Enrich with client info and intervention count
    top_clients = []
    for r in results:
        client = await db.clients.find_one({"id": r["_id"]}, {"_id": 0, "id": 1, "nom": 1, "prenom": 1, "email": 1})
        if client:
            # Count interventions for this client
            interventions_count = await db.interventions.count_documents({
                "entreprise_id": ent_id,
                "client_id": r["_id"]
            })
            
            top_clients.append({
                "id": client["id"],
                "nom": client.get("nom", ""),
                "prenom": client.get("prenom", ""),
                "email": client.get("email", ""),
                "total_ca": round(r["total_ca"], 2),
                "factures": r["factures_count"],
                "interventions": interventions_count
            })
    
    return top_clients

@api_router.get("/rapports/conversion-stats")
async def get_conversion_stats(current_user: dict = Depends(get_current_user)):
    """Get conversion funnel statistics"""
    ent_id = current_user["entreprise_id"]
    
    # Count by status
    interventions_total = await db.interventions.count_documents({"entreprise_id": ent_id})
    interventions_completed = await db.interventions.count_documents({"entreprise_id": ent_id, "statut": "terminee"})
    
    devis_total = await db.devis.count_documents({"entreprise_id": ent_id})
    devis_signed = await db.devis.count_documents({"entreprise_id": ent_id, "statut": "signe"})
    
    factures_total = await db.factures.count_documents({"entreprise_id": ent_id})
    factures_paid = await db.factures.count_documents({"entreprise_id": ent_id, "statut": "payee"})
    
    return {
        "interventions": {"total": interventions_total, "completed": interventions_completed},
        "devis": {"total": devis_total, "signed": devis_signed},
        "factures": {"total": factures_total, "paid": factures_paid},
        "conversion_rate": round((devis_signed / devis_total * 100) if devis_total > 0 else 0, 1),
        "payment_rate": round((factures_paid / factures_total * 100) if factures_total > 0 else 0, 1)
    }

@api_router.get("/rapports/export/{type}")
async def export_report(type: str, current_user: dict = Depends(get_current_user)):
    """Export data as CSV"""
    ent_id = current_user["entreprise_id"]
    
    if type == "devis":
        items = await db.devis.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["numero_devis", "client_id", "statut", "total_ht", "total_ttc", "created_at", "date_signature"]
    elif type == "factures":
        items = await db.factures.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["numero_facture", "client_id", "statut", "total_ht", "total_ttc", "montant_paye", "created_at", "date_echeance"]
    elif type == "clients":
        items = await db.clients.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["id", "nom", "prenom", "email", "telephone", "ville", "created_at"]
    elif type == "interventions":
        items = await db.interventions.find({"entreprise_id": ent_id}, {"_id": 0}).to_list(1000)
        headers = ["id", "titre", "client_id", "technicien_id", "statut", "date_prevue", "duree_estimee"]
    else:
        raise HTTPException(status_code=400, detail="Type d'export invalide")
    
    # Build CSV
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')
    writer.writeheader()
    for item in items:
        writer.writerow(item)
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=export_{type}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ==================== AUDIT LOGS ====================
@api_router.get("/audit-logs")
async def list_audit_logs(
    entity: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_admin)
):
    """List audit logs (admin only)"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    if entity:
        query["entity"] = entity
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [serialize_doc(l) for l in logs]

# ==================== BACKGROUND TASKS ====================
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
                client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
                entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
                
                if not client or not entreprise:
                    continue
                
                # Calculate days overdue
                date_echeance = datetime.fromisoformat(facture.get("date_echeance", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
                jours_retard = max(0, (datetime.now(timezone.utc) - date_echeance).days)
                
                # Send SMS reminder if phone available
                if client.get("telephone"):
                    sms_result = await send_payment_reminder(client, facture, entreprise, jours_retard)
                    logger.info(f"Auto SMS reminder for facture {facture['id']}: {sms_result}")
                
                # Send email reminder
                if client.get("email"):
                    email_result = await send_relance_email(facture, client, entreprise, jours_retard)
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
                client = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0})
                entreprise = await db.entreprises.find_one({"id": intervention["entreprise_id"]}, {"_id": 0})
                
                if not client or not entreprise:
                    continue
                
                # Send SMS reminder
                if client.get("telephone"):
                    sms_result = await send_intervention_reminder(client, intervention, entreprise)
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
    
    logger.info("FieldCommand API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
