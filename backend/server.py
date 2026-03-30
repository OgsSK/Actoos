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
    UserPasswordReset, UserSetPassword, Client, ClientCreate, ClientResponse,
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
    notify_new_intervention_available, notify_intervention_assigned,
    notify_devis_signed
)

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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register", response_model=TokenResponse)
async def register_entreprise(data: RegisterRequest):
    """Register a new entreprise with admin user"""
    # Check if email already exists
    existing = await db.users.find_one({"email": data.admin_email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Create entreprise
    entreprise_id = str(uuid.uuid4())
    entreprise = {
        "id": entreprise_id,
        "nom": data.entreprise_nom,
        "email": data.entreprise_email,
        "telephone": data.entreprise_telephone,
        "sequence_devis": 1,
        "sequence_facture": 1,
        "couleur_primaire": "#2563EB",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.entreprises.insert_one(entreprise)
    
    # Create admin user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "entreprise_id": entreprise_id,
        "email": data.admin_email,
        "nom": data.admin_nom,
        "prenom": data.admin_prenom,
        "password_hash": get_password_hash(data.admin_password),
        "role": "admin",
        "statut": "actif",
        "derniere_connexion": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create token
    token = create_access_token({"sub": user_id, "ent": entreprise_id, "role": "admin"})
    
    await log_action(entreprise_id, user_id, "create", "entreprise", entreprise_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, entreprise_id=entreprise_id, email=data.admin_email,
            nom=data.admin_nom, prenom=data.admin_prenom, role="admin", statut="actif",
            derniere_connexion=user["derniere_connexion"], created_at=user["created_at"]
        ),
        entreprise=serialize_doc(entreprise)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if user["statut"] == "desactive":
        raise HTTPException(status_code=401, detail="Compte désactivé")
    
    if user["statut"] == "invite":
        raise HTTPException(status_code=401, detail="Veuillez d'abord activer votre compte via le lien d'invitation")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"derniere_connexion": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get entreprise
    entreprise = await db.entreprises.find_one({"id": user["entreprise_id"]}, {"_id": 0})
    
    token = create_access_token({"sub": user["id"], "ent": user["entreprise_id"], "role": user["role"]})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], entreprise_id=user["entreprise_id"], email=user["email"],
            nom=user["nom"], prenom=user["prenom"], telephone=user.get("telephone"),
            role=user["role"], statut=user["statut"],
            derniere_connexion=datetime.now(timezone.utc).isoformat(), created_at=user["created_at"]
        ),
        entreprise=entreprise
    )

@api_router.get("/auth/me", response_model=TokenResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    return TokenResponse(
        access_token="",
        user=UserResponse(
            id=user["id"], entreprise_id=user["entreprise_id"], email=user["email"],
            nom=user["nom"], prenom=user["prenom"], telephone=user.get("telephone"),
            role=user["role"], statut=user["statut"],
            derniere_connexion=user.get("derniere_connexion"), created_at=user["created_at"]
        ),
        entreprise=entreprise
    )

@api_router.post("/auth/invite")
async def invite_technician(data: UserInvite, current_user: dict = Depends(require_admin)):
    """Invite a technician (admin only)"""
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "entreprise_id": current_user["entreprise_id"],
        "email": data.email,
        "nom": data.nom,
        "prenom": data.prenom,
        "telephone": data.telephone,
        "password_hash": "",
        "role": "tech",
        "statut": "invite",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create invitation token
    invite_token = create_invitation_token(user_id, current_user["entreprise_id"])
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "invite", "user", user_id)
    
    return {"message": "Invitation envoyée", "user_id": user_id, "invite_token": invite_token}

@api_router.post("/auth/activate")
async def activate_account(data: UserSetPassword):
    """Activate invited account with password"""
    try:
        payload = decode_token(data.token)
        if payload.get("type") != "invite":
            raise HTTPException(status_code=400, detail="Token invalide")
    except:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user or user["statut"] != "invite":
        raise HTTPException(status_code=400, detail="Compte déjà activé ou inexistant")
    
    await db.users.update_one(
        {"id": payload["sub"]},
        {"$set": {"password_hash": get_password_hash(data.password), "statut": "actif"}}
    )
    
    return {"message": "Compte activé avec succès"}

@api_router.post("/auth/request-reset")
async def request_password_reset(data: UserPasswordReset):
    """Request password reset"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Si l'email existe, un lien de réinitialisation sera envoyé"}
    
    reset_token = create_reset_token(user["id"], user["entreprise_id"])
    # In production, send email with reset link
    return {"message": "Lien de réinitialisation envoyé", "reset_token": reset_token}

@api_router.post("/auth/reset-password")
async def reset_password(data: UserSetPassword):
    """Reset password with token"""
    try:
        payload = decode_token(data.token)
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Token invalide")
    except:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    await db.users.update_one(
        {"id": payload["sub"]},
        {"$set": {"password_hash": get_password_hash(data.password)}}
    )
    
    return {"message": "Mot de passe réinitialisé avec succès"}

# ==================== PUSH NOTIFICATION ROUTES ====================
@api_router.get("/push/vapid-key")
async def get_push_vapid_key():
    """Get the VAPID public key for push subscription"""
    return {"publicKey": get_vapid_public_key()}

@api_router.post("/push/subscribe")
async def subscribe_to_push(subscription: dict, current_user: dict = Depends(get_current_user)):
    """Subscribe current user to push notifications"""
    if not subscription or not subscription.get("endpoint"):
        raise HTTPException(status_code=400, detail="Invalid subscription")
    
    # Check if subscription already exists
    user = await db.users.find_one(
        {"id": current_user["user_id"]},
        {"_id": 0, "push_subscriptions": 1}
    )
    
    existing_subscriptions = user.get("push_subscriptions", []) if user else []
    
    # Check if this endpoint already exists
    for sub in existing_subscriptions:
        if sub.get("endpoint") == subscription.get("endpoint"):
            return {"message": "Already subscribed", "subscribed": True}
    
    # Add new subscription
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$push": {"push_subscriptions": subscription}}
    )
    
    logger.info(f"User {current_user['user_id']} subscribed to push notifications")
    return {"message": "Successfully subscribed", "subscribed": True}

@api_router.delete("/push/unsubscribe")
async def unsubscribe_from_push(endpoint: str, current_user: dict = Depends(get_current_user)):
    """Unsubscribe from push notifications"""
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$pull": {"push_subscriptions": {"endpoint": endpoint}}}
    )
    return {"message": "Successfully unsubscribed"}

@api_router.get("/push/status")
async def get_push_status(current_user: dict = Depends(get_current_user)):
    """Get push notification status for current user"""
    user = await db.users.find_one(
        {"id": current_user["user_id"]},
        {"_id": 0, "push_subscriptions": 1}
    )
    
    subscriptions = user.get("push_subscriptions", []) if user else []
    return {
        "subscribed": len(subscriptions) > 0,
        "subscription_count": len(subscriptions)
    }

@api_router.post("/push/test")
async def send_test_push(current_user: dict = Depends(get_current_user)):
    """Send a test push notification to current user"""
    result = await send_push_to_users(
        db=db,
        user_ids=[current_user["user_id"]],
        title="🔔 Test notification",
        body="Les notifications push fonctionnent correctement !",
        url="/tech"
    )
    
    if result["sent"] == 0:
        raise HTTPException(status_code=400, detail="Aucune notification envoyée. Vérifiez que vous êtes abonné aux notifications.")
    
    return {"message": "Test notification sent", "result": result}

# ==================== USER ROUTES ====================
@api_router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    """List all users of the entreprise"""
    users = await db.users.find(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return [UserResponse(**serialize_doc(u)) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific user"""
    user = await db.users.find_one(
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "password_hash": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return UserResponse(**serialize_doc(user))

@api_router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, statut: str, current_user: dict = Depends(require_admin)):
    """Update user status (admin only)"""
    if statut not in ["actif", "desactive"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    result = await db.users.update_one(
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": {"statut": statut}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_status", "user", user_id, {"statut": statut})
    return {"message": "Statut mis à jour"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only, cannot delete self)"""
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    user = await db.users.find_one(
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Check if technician has any active interventions
    active_interventions = await db.interventions.count_documents({
        "technicien_id": user_id,
        "statut": {"$in": ["planifiee", "en_cours"]}
    })
    if active_interventions > 0:
        raise HTTPException(status_code=400, detail=f"Ce technicien a {active_interventions} intervention(s) active(s). Réassignez-les d'abord.")
    
    await db.users.delete_one({"id": user_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "user", user_id)
    
    return {"message": "Utilisateur supprimé"}

@api_router.get("/techniciens")
async def list_techniciens(current_user: dict = Depends(get_current_user)):
    """List all technicians"""
    users = await db.users.find(
        {"entreprise_id": current_user["entreprise_id"], "role": "tech"},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return [serialize_doc(u) for u in users]

# ==================== CLIENT ROUTES ====================
@api_router.post("/clients", response_model=ClientResponse)
async def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Create a new client"""
    client_dict = data.model_dump()
    client_dict["id"] = str(uuid.uuid4())
    client_dict["entreprise_id"] = current_user["entreprise_id"]
    client_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.clients.insert_one(client_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "client", client_dict["id"])
    
    return ClientResponse(**client_dict)

@api_router.get("/clients", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all clients"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    if search:
        query["$or"] = [
            {"nom": {"$regex": search, "$options": "i"}},
            {"prenom": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"telephone": {"$regex": search, "$options": "i"}}
        ]
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    return [ClientResponse(**serialize_doc(c)) for c in clients]

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific client"""
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return ClientResponse(**serialize_doc(client))

@api_router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Update a client"""
    update_data = data.model_dump(exclude_unset=True)
    result = await db.clients.update_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "client", client_id)
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return ClientResponse(**serialize_doc(client))

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Delete a client (admin only)"""
    result = await db.clients.delete_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "client", client_id)
    return {"message": "Client supprimé"}

# ==================== COMMUNICATION HISTORY ROUTES ====================

@api_router.get("/clients/{client_id}/communications")
async def get_client_communication_history(
    client_id: str,
    comm_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get communication history for a specific client"""
    # Verify client exists and belongs to entreprise
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "client_id": client_id
    }
    
    if comm_type and comm_type in ["email", "sms"]:
        query["type"] = comm_type
    
    communications = await db.communications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return [serialize_doc(c) for c in communications]

@api_router.get("/communications")
async def list_all_communications(
    comm_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """List all communications for the entreprise"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if comm_type and comm_type in ["email", "sms"]:
        query["type"] = comm_type
    
    if status and status in ["sent", "delivered", "failed", "pending"]:
        query["status"] = status
    
    communications = await db.communications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Enrich with client names
    for comm in communications:
        client = await db.clients.find_one(
            {"id": comm.get("client_id")},
            {"_id": 0, "nom": 1, "prenom": 1}
        )
        if client:
            comm["client_nom"] = f"{client.get('prenom', '')} {client.get('nom', '')}".strip()
    
    return [serialize_doc(c) for c in communications]

@api_router.get("/communications/stats")
async def get_communication_stats(current_user: dict = Depends(get_current_user)):
    """Get communication statistics"""
    pipeline = [
        {"$match": {"entreprise_id": current_user["entreprise_id"]}},
        {"$group": {
            "_id": {"type": "$type", "status": "$status"},
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.communications.aggregate(pipeline).to_list(100)
    
    stats = {
        "emails": {"sent": 0, "delivered": 0, "failed": 0},
        "sms": {"sent": 0, "delivered": 0, "failed": 0},
        "total": 0
    }
    
    for r in results:
        comm_type = r["_id"]["type"]
        status = r["_id"]["status"]
        count = r["count"]
        
        if comm_type in stats and status in stats[comm_type]:
            stats[comm_type][status] = count
        stats["total"] += count
    
    return stats

# ==================== CATEGORIE ROUTES ====================

# Default categories to seed for new entreprises
DEFAULT_CATEGORIES = [
    {
        "code": "plomberie",
        "nom": "Plomberie",
        "description": "Interventions de plomberie et sanitaire",
        "icone": "droplet",
        "couleur": "#3B82F6",
        "checklist_template": [
            {"id": "plb_1", "label": "Coupure d'eau effectuée", "type": "checkbox", "required": True},
            {"id": "plb_2", "label": "Fuite identifiée et réparée", "type": "checkbox", "required": True},
            {"id": "plb_3", "label": "Test d'étanchéité réalisé", "type": "checkbox", "required": True},
            {"id": "plb_4", "label": "Pression vérifiée (bar)", "type": "number", "required": False},
            {"id": "plb_5", "label": "Photo avant intervention", "type": "photo", "required": False},
            {"id": "plb_6", "label": "Photo après intervention", "type": "photo", "required": False},
            {"id": "plb_7", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "electricite",
        "nom": "Électricité",
        "description": "Interventions électriques",
        "icone": "zap",
        "couleur": "#F59E0B",
        "checklist_template": [
            {"id": "elec_1", "label": "Coupure du courant effectuée", "type": "checkbox", "required": True},
            {"id": "elec_2", "label": "Vérification du tableau électrique", "type": "checkbox", "required": True},
            {"id": "elec_3", "label": "Test de continuité réalisé", "type": "checkbox", "required": False},
            {"id": "elec_4", "label": "Mise à la terre vérifiée", "type": "checkbox", "required": True},
            {"id": "elec_5", "label": "Tension mesurée (V)", "type": "number", "required": False},
            {"id": "elec_6", "label": "Photo du tableau", "type": "photo", "required": False},
            {"id": "elec_7", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "nettoyage",
        "nom": "Nettoyage",
        "description": "Services de nettoyage et entretien",
        "icone": "sparkles",
        "couleur": "#10B981",
        "checklist_template": [
            {"id": "net_1", "label": "Sols nettoyés", "type": "checkbox", "required": True},
            {"id": "net_2", "label": "Vitres nettoyées", "type": "checkbox", "required": False},
            {"id": "net_3", "label": "Sanitaires désinfectés", "type": "checkbox", "required": True},
            {"id": "net_4", "label": "Poubelles vidées", "type": "checkbox", "required": True},
            {"id": "net_5", "label": "Produits utilisés", "type": "text", "required": False},
            {"id": "net_6", "label": "Photo avant", "type": "photo", "required": False},
            {"id": "net_7", "label": "Photo après", "type": "photo", "required": False}
        ]
    },
    {
        "code": "climatisation",
        "nom": "Climatisation / Chauffage",
        "description": "Installation et maintenance CVC",
        "icone": "thermometer",
        "couleur": "#6366F1",
        "checklist_template": [
            {"id": "clim_1", "label": "Filtres vérifiés/remplacés", "type": "checkbox", "required": True},
            {"id": "clim_2", "label": "Niveau de gaz vérifié", "type": "checkbox", "required": True},
            {"id": "clim_3", "label": "Température de sortie (°C)", "type": "number", "required": False},
            {"id": "clim_4", "label": "Condensats évacués", "type": "checkbox", "required": False},
            {"id": "clim_5", "label": "Télécommande fonctionnelle", "type": "checkbox", "required": False},
            {"id": "clim_6", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "btp",
        "nom": "BTP / Travaux",
        "description": "Travaux de construction et rénovation",
        "icone": "hammer",
        "couleur": "#EF4444",
        "checklist_template": [
            {"id": "btp_1", "label": "Zone sécurisée", "type": "checkbox", "required": True},
            {"id": "btp_2", "label": "Matériaux réceptionnés", "type": "checkbox", "required": False},
            {"id": "btp_3", "label": "Travaux conformes au devis", "type": "checkbox", "required": True},
            {"id": "btp_4", "label": "Nettoyage du chantier", "type": "checkbox", "required": True},
            {"id": "btp_5", "label": "Photo avant travaux", "type": "photo", "required": False},
            {"id": "btp_6", "label": "Photo après travaux", "type": "photo", "required": False},
            {"id": "btp_7", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "maintenance",
        "nom": "Maintenance générale",
        "description": "Entretien et maintenance préventive",
        "icone": "settings",
        "couleur": "#8B5CF6",
        "checklist_template": [
            {"id": "maint_1", "label": "Inspection visuelle effectuée", "type": "checkbox", "required": True},
            {"id": "maint_2", "label": "Points de contrôle vérifiés", "type": "checkbox", "required": True},
            {"id": "maint_3", "label": "Pièces remplacées", "type": "text", "required": False},
            {"id": "maint_4", "label": "Prochaine maintenance recommandée", "type": "text", "required": False},
            {"id": "maint_5", "label": "Photo équipement", "type": "photo", "required": False},
            {"id": "maint_6", "label": "Observations", "type": "text", "required": False}
        ]
    }
]

async def seed_categories_for_entreprise(entreprise_id: str):
    """Seed default categories for a new entreprise"""
    existing = await db.categories.count_documents({"entreprise_id": entreprise_id})
    if existing > 0:
        return  # Already seeded
    
    for cat in DEFAULT_CATEGORIES:
        cat_doc = {
            **cat,
            "id": str(uuid.uuid4()),
            "entreprise_id": entreprise_id,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.categories.insert_one(cat_doc)
    logger.info(f"Seeded {len(DEFAULT_CATEGORIES)} categories for entreprise {entreprise_id}")

@api_router.get("/categories")
async def list_categories(current_user: dict = Depends(get_current_user)):
    """List all categories for the entreprise"""
    # Seed categories if none exist
    await seed_categories_for_entreprise(current_user["entreprise_id"])
    
    categories = await db.categories.find(
        {"entreprise_id": current_user["entreprise_id"], "active": True},
        {"_id": 0}
    ).sort("nom", 1).to_list(100)
    
    return [serialize_doc(c) for c in categories]

@api_router.get("/categories/{categorie_id}")
async def get_categorie(categorie_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific category with its checklist template"""
    categorie = await db.categories.find_one(
        {"id": categorie_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not categorie:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return serialize_doc(categorie)

@api_router.post("/categories")
async def create_categorie(data: CategorieCreate, current_user: dict = Depends(require_admin)):
    """Create a new category (admin only)"""
    # Check if code already exists
    existing = await db.categories.find_one({
        "entreprise_id": current_user["entreprise_id"],
        "code": data.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="Une catégorie avec ce code existe déjà")
    
    cat_dict = data.model_dump()
    cat_dict["id"] = str(uuid.uuid4())
    cat_dict["entreprise_id"] = current_user["entreprise_id"]
    cat_dict["active"] = True
    cat_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert checklist items to dicts
    cat_dict["checklist_template"] = [
        item.model_dump() if hasattr(item, 'model_dump') else item 
        for item in cat_dict.get("checklist_template", [])
    ]
    
    await db.categories.insert_one(cat_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "categorie", cat_dict["id"])
    
    return serialize_doc(cat_dict)

@api_router.put("/categories/{categorie_id}")
async def update_categorie(categorie_id: str, data: CategorieCreate, current_user: dict = Depends(require_admin)):
    """Update a category (admin only)"""
    update_data = data.model_dump()
    update_data["checklist_template"] = [
        item.model_dump() if hasattr(item, 'model_dump') else item 
        for item in update_data.get("checklist_template", [])
    ]
    
    result = await db.categories.update_one(
        {"id": categorie_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "categorie", categorie_id)
    
    categorie = await db.categories.find_one({"id": categorie_id}, {"_id": 0})
    return serialize_doc(categorie)

@api_router.delete("/categories/{categorie_id}")
async def delete_categorie(categorie_id: str, current_user: dict = Depends(require_admin)):
    """Soft delete a category (admin only)"""
    result = await db.categories.update_one(
        {"id": categorie_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "categorie", categorie_id)
    return {"message": "Catégorie supprimée"}

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
    """Notify all active technicians about a new available intervention via SMS and Push"""
    try:
        # Get all active technicians
        technicians = await db.users.find(
            {"entreprise_id": entreprise_id, "role": "tech", "statut": "actif"},
            {"_id": 0, "id": 1, "telephone": 1, "prenom": 1, "nom": 1}
        ).to_list(100)
        
        entreprise = await db.entreprises.find_one({"id": entreprise_id}, {"_id": 0, "nom": 1})
        entreprise_nom = entreprise.get("nom", "Votre entreprise") if entreprise else "Votre entreprise"
        
        # Parse date for message
        try:
            date_obj = datetime.fromisoformat(intervention["date_prevue"].replace('Z', '+00:00'))
            date_str = date_obj.strftime("%d/%m à %Hh%M")
        except:
            date_str = "bientôt"
        
        client_nom = f"{client.get('nom', '')} {client.get('prenom', '')}".strip() or "Client"
        
        # Send Push notifications first (faster)
        push_result = await notify_new_intervention_available(db, entreprise_id, intervention)
        logger.info(f"Push notifications sent: {push_result}")
        
        # Send SMS to each technician with a phone number
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
    """List interventions with filters"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    # Technicians see their own + optionally available interventions
    if current_user["role"] == "tech":
        if include_available:
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
    """Get today's interventions for technician"""
    today = datetime.now(timezone.utc).date()
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc).isoformat()
    today_end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc).isoformat()
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "date_prevue": {"$gte": today_start, "$lte": today_end}
    }
    
    if current_user["role"] == "tech":
        # Tech sees their own interventions + available (unassigned) ones
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
    """Get available (unassigned) interventions for technicians to claim"""
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "statut": "planifiee",
        "$or": [
            {"technicien_id": None},
            {"technicien_id": {"$exists": False}}
        ]
    }
    
    interventions = await db.interventions.find(query, {"_id": 0}).sort("date_prevue", 1).to_list(100)
    
    # Enrich with client data
    for i in interventions:
        client = await db.clients.find_one({"id": i["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "telephone": 1, "adresse": 1})
        i["client"] = serialize_doc(client) if client else None
    
    return [serialize_doc(i) for i in interventions]

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

# ==================== DASHBOARD STATS ====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    ent_id = current_user["entreprise_id"]
    today = datetime.now(timezone.utc).date()
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc).isoformat()
    today_end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc).isoformat()
    month_start = datetime(today.year, today.month, 1, 0, 0, 0, tzinfo=timezone.utc).isoformat()
    
    # Count interventions today (only today, not future)
    interventions_today = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "date_prevue": {"$gte": today_start, "$lte": today_end},
        "statut": {"$nin": ["annulee"]}
    })
    
    # Count overdue interventions (planned but date has passed)
    interventions_en_retard = await db.interventions.count_documents({
        "entreprise_id": ent_id,
        "statut": "planifiee",
        "date_prevue": {"$lt": today_start}
    })
    
    # Count overdue devis (sent but expired)
    devis_expires = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "envoye",
        "date_expiration": {"$lt": today_start}
    })
    
    # Count overdue factures
    factures_en_retard = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "statut": "emise",
        "date_echeance": {"$lt": today_start}
    })
    
    # Count devis
    devis_en_attente = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": {"$in": ["brouillon", "envoye"]}
    })
    devis_signes_mois = await db.devis.count_documents({
        "entreprise_id": ent_id,
        "statut": "signe",
        "date_signature": {"$gte": month_start}
    })
    
    # Devis amounts
    devis_attente_pipeline = [
        {"$match": {"entreprise_id": ent_id, "statut": {"$in": ["brouillon", "envoye"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
    ]
    devis_attente_result = await db.devis.aggregate(devis_attente_pipeline).to_list(1)
    montant_devis_attente = devis_attente_result[0]["total"] if devis_attente_result else 0
    
    # Count factures
    factures_impayees = await db.factures.count_documents({
        "entreprise_id": ent_id,
        "statut": {"$in": ["emise", "en_retard"]}
    })
    
    # Factures amounts
    factures_impayees_pipeline = [
        {"$match": {"entreprise_id": ent_id, "statut": {"$in": ["emise", "en_retard"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$total_ttc", "$montant_paye"]}}}}
    ]
    factures_impayees_result = await db.factures.aggregate(factures_impayees_pipeline).to_list(1)
    montant_factures_impayees = factures_impayees_result[0]["total"] if factures_impayees_result else 0
    
    # CA du mois
    ca_mois_pipeline = [
        {"$match": {"entreprise_id": ent_id, "statut": "payee", "date_paiement": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
    ]
    ca_mois_result = await db.factures.aggregate(ca_mois_pipeline).to_list(1)
    ca_mois = ca_mois_result[0]["total"] if ca_mois_result else 0
    
    # Count clients
    total_clients = await db.clients.count_documents({"entreprise_id": ent_id})
    
    # Count techniciens
    total_techniciens = await db.users.count_documents({"entreprise_id": ent_id, "role": "tech", "statut": "actif"})
    
    return {
        "interventions_today": interventions_today,
        "interventions_en_retard": interventions_en_retard,
        "devis_en_attente": devis_en_attente,
        "devis_signes_mois": devis_signes_mois,
        "devis_expires": devis_expires,
        "montant_devis_attente": round(montant_devis_attente, 2),
        "factures_impayees": factures_impayees,
        "factures_en_retard": factures_en_retard,
        "montant_factures_impayees": round(montant_factures_impayees, 2),
        "ca_mois": round(ca_mois, 2),
        "total_clients": total_clients,
        "total_techniciens": total_techniciens
    }

@api_router.get("/dashboard/alerts")
async def get_dashboard_alerts(current_user: dict = Depends(get_current_user)):
    """Get dashboard alerts"""
    ent_id = current_user["entreprise_id"]
    today = datetime.now(timezone.utc).isoformat()
    
    alerts = []
    
    # Devis expirés
    devis_expires = await db.devis.find(
        {"entreprise_id": ent_id, "statut": {"$in": ["brouillon", "envoye"]}, "date_expiration": {"$lt": today}},
        {"_id": 0, "id": 1, "numero_devis": 1, "client_id": 1}
    ).to_list(10)
    for d in devis_expires:
        alerts.append({"type": "devis_expire", "severity": "warning", "message": f"Devis {d['numero_devis']} expiré", "entity_id": d["id"]})
    
    # Factures en retard
    factures_retard = await db.factures.find(
        {"entreprise_id": ent_id, "statut": "emise", "date_echeance": {"$lt": today}},
        {"_id": 0, "id": 1, "numero_facture": 1}
    ).to_list(10)
    for f in factures_retard:
        alerts.append({"type": "facture_retard", "severity": "error", "message": f"Facture {f['numero_facture']} en retard", "entity_id": f["id"]})
        # Update status
        await db.factures.update_one({"id": f["id"]}, {"$set": {"statut": "en_retard"}})
    
    # Interventions en retard
    interventions_retard = await db.interventions.find(
        {"entreprise_id": ent_id, "statut": "planifiee", "date_prevue": {"$lt": today}},
        {"_id": 0, "id": 1, "titre": 1}
    ).to_list(10)
    for i in interventions_retard:
        alerts.append({"type": "intervention_retard", "severity": "warning", "message": f"Intervention '{i['titre']}' en retard", "entity_id": i["id"]})
    
    return alerts

@api_router.get("/dashboard/recent")
async def get_dashboard_recent(current_user: dict = Depends(get_current_user)):
    """Get recent activity"""
    ent_id = current_user["entreprise_id"]
    
    # Recent devis
    recent_devis = await db.devis.find(
        {"entreprise_id": ent_id},
        {"_id": 0, "id": 1, "numero_devis": 1, "statut": 1, "total_ttc": 1, "created_at": 1, "client_id": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for d in recent_devis:
        client = await db.clients.find_one({"id": d["client_id"]}, {"_id": 0, "nom": 1})
        d["client_nom"] = client.get("nom", "") if client else ""
    
    # Recent factures
    recent_factures = await db.factures.find(
        {"entreprise_id": ent_id},
        {"_id": 0, "id": 1, "numero_facture": 1, "statut": 1, "total_ttc": 1, "created_at": 1, "client_id": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for f in recent_factures:
        client = await db.clients.find_one({"id": f["client_id"]}, {"_id": 0, "nom": 1})
        f["client_nom"] = client.get("nom", "") if client else ""
    
    return {
        "devis": [serialize_doc(d) for d in recent_devis],
        "factures": [serialize_doc(f) for f in recent_factures]
    }

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

# ==================== ENTREPRISE SETTINGS ====================
@api_router.get("/entreprise")
async def get_entreprise(current_user: dict = Depends(get_current_user)):
    """Get entreprise settings"""
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return serialize_doc(entreprise)

@api_router.put("/entreprise")
async def update_entreprise(data: EntrepriseCreate, current_user: dict = Depends(require_admin)):
    """Update entreprise settings (admin only)"""
    update_data = data.model_dump(exclude_unset=True)
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "entreprise", current_user["entreprise_id"])
    
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    return serialize_doc(entreprise)

@api_router.post("/entreprise/logo")
async def upload_entreprise_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin)
):
    """Upload entreprise logo for white-labeling (admin only)"""
    from image_utils import strip_exif_and_compress, is_valid_image
    
    # Read file
    data = await file.read()
    
    # Validate it's an image
    if not is_valid_image(data):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas une image valide")
    
    # Process image (strip EXIF, compress, max 500KB)
    processed_data, content_type = strip_exif_and_compress(data, max_size_kb=200)
    
    # Upload to storage
    storage_path = f"{APP_NAME}/logos/{current_user['entreprise_id']}/logo_{uuid.uuid4()}.jpg"
    result = put_object(storage_path, processed_data, content_type)
    
    if not result:
        raise HTTPException(status_code=500, detail="Erreur lors du téléchargement")
    
    # Update entreprise with logo URL
    logo_url = result.get("url") or result.get("path")
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {"logo_url": logo_url}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "upload_logo", "entreprise", current_user["entreprise_id"])
    
    return {"message": "Logo mis à jour", "logo_url": logo_url}

@api_router.put("/entreprise/branding")
async def update_entreprise_branding(
    couleur_primaire: str,
    current_user: dict = Depends(require_admin)
):
    """Update entreprise branding colors (admin only)"""
    # Validate hex color
    import re
    if not re.match(r'^#[0-9A-Fa-f]{6}$', couleur_primaire):
        raise HTTPException(status_code=400, detail="Couleur invalide. Format: #RRGGBB")
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {"couleur_primaire": couleur_primaire}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_branding", "entreprise", current_user["entreprise_id"])
    
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    return {"message": "Branding mis à jour", "couleur_primaire": couleur_primaire}

# ==================== SEARCH ====================
@api_router.get("/search")
async def global_search(q: str, current_user: dict = Depends(get_current_user)):
    """Global search across clients, devis, factures, interventions"""
    ent_id = current_user["entreprise_id"]
    results = {"clients": [], "devis": [], "factures": [], "interventions": []}
    
    # Search clients
    clients = await db.clients.find(
        {"entreprise_id": ent_id, "$or": [
            {"nom": {"$regex": q, "$options": "i"}},
            {"prenom": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"telephone": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).limit(5).to_list(5)
    results["clients"] = [serialize_doc(c) for c in clients]
    
    # Search devis by number
    devis = await db.devis.find(
        {"entreprise_id": ent_id, "numero_devis": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).limit(5).to_list(5)
    results["devis"] = [serialize_doc(d) for d in devis]
    
    # Search factures by number
    factures = await db.factures.find(
        {"entreprise_id": ent_id, "numero_facture": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).limit(5).to_list(5)
    results["factures"] = [serialize_doc(f) for f in factures]
    
    # Search interventions by title
    interventions = await db.interventions.find(
        {"entreprise_id": ent_id, "titre": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).limit(5).to_list(5)
    results["interventions"] = [serialize_doc(i) for i in interventions]
    
    return results

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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
