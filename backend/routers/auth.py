"""
Authentication routes: login, register, invite, password reset
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

from models import (
    UserResponse, UserLogin, UserInvite, UserPasswordReset, 
    UserSetPassword, TokenResponse, RegisterRequest
)
from auth import (
    get_password_hash, verify_password, create_access_token, decode_token,
    get_current_user, require_admin, create_invitation_token, create_reset_token
)
from dependencies import db, serialize_doc, log_action
from plan_limits import check_technician_limit, raise_limit_error

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register_entreprise(data: RegisterRequest):
    """Register a new entreprise with admin user"""
    # Check if email already exists
    existing = await db.users.find_one({"email": data.admin_email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Create entreprise with default trial plan
    entreprise_id = str(uuid.uuid4())
    
    # Default trial plan limits (same as Startup but with trial flag)
    default_plan_limits = {
        "max_admins": 1,
        "max_technicians": 3,
        "max_categories": 1,
        "max_interventions_month": -1,
        "multi_sites": False,
        "offline_mode": False,
        "geolocation": False,
        "auto_pdf_reports": False,
        "advanced_analytics": False,
        "white_label": False,
        "api_access": False,
        "advanced_branding": False,
        "smart_planning": False,
        "auto_devis_to_facture": False,
        "team_validation": False,
        "sms_included": 0
    }
    
    entreprise = {
        "id": entreprise_id,
        "nom": data.entreprise_nom,
        "email": data.entreprise_email,
        "telephone": data.entreprise_telephone,
        "sequence_devis": 1,
        "sequence_facture": 1,
        "couleur_primaire": "#2563EB",
        "plan": "startup",
        "plan_limits": default_plan_limits,
        "subscription_status": "trialing",
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
    logger.error(f"LOGIN ATTEMPT: email={data.email}")
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    logger.error(f"USER FOUND: {user is not None}")
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    logger.error(f"VERIFYING PASSWORD...")
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
    """Invite a technician (admin only) - allows extras with billing"""
    # Check technician info (always allowed but may incur extra cost)
    limit_check = await check_technician_limit(db, current_user["entreprise_id"])
    
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
    
    # Calculate if this is an extra technician
    new_check = await check_technician_limit(db, current_user["entreprise_id"])
    extra_count = new_check.get("extra_count", 0)
    extra_cost = new_check.get("extra_cost", 0)
    
    response = {
        "message": "Invitation envoyée", 
        "user_id": user_id, 
        "invite_token": invite_token
    }
    
    if extra_count > 0:
        response["billing_info"] = {
            "extra_technicians": extra_count,
            "extra_cost_monthly": extra_cost,
            "notice": f"Ce technicien est facturé {new_check.get('price_per_extra', 5)}€/mois en supplément"
        }
    
    return response


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


@router.post("/request-password-reset")
async def request_password_reset(data: UserPasswordReset, request: Request):
    """Request password reset"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Si l'email existe, un lien de réinitialisation sera envoyé"}
    
    reset_token = create_reset_token(user["id"], user["entreprise_id"])
    
    # Build reset URL
    origin = request.headers.get("origin", "https://actoos.com")
    reset_url = f"{origin}/reset-password?token={reset_token}"
    
    # Send email with reset link
    try:
        from email_service import send_email
        await send_email(
            to_email=data.email,
            subject="Réinitialisation de votre mot de passe Actoos",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3B82F6;">Réinitialisation de mot de passe</h2>
                <p>Bonjour {user.get('prenom', '')},</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe Actoos.</p>
                <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Réinitialiser mon mot de passe
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
            </div>
            """
        )
    except Exception as e:
        logger.error(f"Failed to send reset email: {e}")
    
    return {"message": "Si l'email existe, un lien de réinitialisation sera envoyé"}


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
        {"$set": {"password_hash": get_password_hash(data.new_password)}}
    )
    
    return {"message": "Mot de passe réinitialisé avec succès"}



@router.delete("/delete-account")
async def delete_account(
    current_user: dict = Depends(require_admin)
):
    """
    Suppression définitive du compte et de toutes les données associées.
    ATTENTION: Cette action est irréversible!
    Conforme GDPR - Droit à l'effacement (Article 17)
    """
    entreprise_id = current_user["entreprise_id"]
    
    # Annuler l'abonnement Stripe si actif
    entreprise = await db.entreprises.find_one({"id": entreprise_id})
    if entreprise and entreprise.get("stripe_subscription_id"):
        try:
            import stripe
            import os
            stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
            stripe.Subscription.cancel(entreprise["stripe_subscription_id"])
        except Exception as e:
            # Log but continue with deletion
            pass
    
    # Supprimer toutes les données de l'entreprise
    collections_to_delete = [
        "users",
        "clients", 
        "interventions",
        "devis",
        "factures",
        "categories",
        "sites",
        "photos",
        "rapports",
        "statements",
        "audit_logs",
        "cancellation_feedback",
        "communications"
    ]
    
    deleted_counts = {}
    for collection in collections_to_delete:
        result = await db[collection].delete_many({"entreprise_id": entreprise_id})
        deleted_counts[collection] = result.deleted_count
    
    # Supprimer l'entreprise elle-même
    await db.entreprises.delete_one({"id": entreprise_id})
    
    # Log cette action critique (dans une collection séparée pour audit GDPR)
    await db.gdpr_deletions.insert_one({
        "entreprise_id": entreprise_id,
        "entreprise_nom": entreprise.get("nom") if entreprise else "Unknown",
        "deleted_by": current_user["user_id"],
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "deleted_counts": deleted_counts
    })
    
    return {
        "message": "Compte supprimé définitivement",
        "deleted": deleted_counts
    }
