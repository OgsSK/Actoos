"""
Authentication routes: login, register, invite, password reset
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from models import (
    UserResponse, UserLogin, UserInvite, UserPasswordReset, 
    UserSetPassword, TokenResponse, RegisterRequest
)
from auth import (
    get_password_hash, verify_password, create_access_token, decode_token,
    get_current_user, require_admin, create_invitation_token, create_reset_token
)
from dependencies import db, serialize_doc, log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
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


@router.post("/login", response_model=TokenResponse)
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
            role=user["role"], statut=user["statut"], skills=user.get("skills", []),
            derniere_connexion=datetime.now(timezone.utc).isoformat(), created_at=user["created_at"]
        ),
        entreprise=entreprise
    )


@router.get("/me", response_model=TokenResponse)
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
            role=user["role"], statut=user["statut"], skills=user.get("skills", []),
            derniere_connexion=user.get("derniere_connexion"), created_at=user["created_at"]
        ),
        entreprise=entreprise
    )


@router.post("/invite")
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


@router.post("/activate")
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


@router.post("/request-reset")
async def request_password_reset(data: UserPasswordReset):
    """Request password reset"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Si l'email existe, un lien de réinitialisation sera envoyé"}
    
    reset_token = create_reset_token(user["id"], user["entreprise_id"])
    # In production, send email with reset link
    return {"message": "Lien de réinitialisation envoyé", "reset_token": reset_token}


@router.post("/reset-password")
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
