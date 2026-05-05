"""
User management routes: list, update status, delete, skills
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from models import UserResponse, UserSkillsUpdate
from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    """List all users of the entreprise"""
    users = await db.users.find(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return [UserResponse(**serialize_doc(u)) for u in users]


# =============================================
# STATIC ROUTES MUST BE BEFORE DYNAMIC ROUTES
# =============================================

@router.get("/invites")
async def list_invites(current_user: dict = Depends(require_admin)):
    """List all technician invitations"""
    from dependencies import db, serialize_doc
    invites = await db.tech_invites.find(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_doc(i) for i in invites]


# Dynamic route AFTER static routes
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific user"""
    user = await db.users.find_one(
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "password_hash": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return UserResponse(**serialize_doc(user))


@router.put("/{user_id}/status")
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


@router.delete("/{user_id}")
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


@router.put("/{user_id}/skills")
async def update_user_skills(user_id: str, data: UserSkillsUpdate, current_user: dict = Depends(require_admin)):
    """Update technician skills/categories (admin only)"""
    # Verify user exists and belongs to entreprise
    user = await db.users.find_one(
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Verify all category IDs exist
    if data.skills:
        valid_categories = await db.categories.count_documents({
            "id": {"$in": data.skills},
            "entreprise_id": current_user["entreprise_id"],
            "active": True
        })
        if valid_categories != len(data.skills):
            raise HTTPException(status_code=400, detail="Une ou plusieurs catégories sont invalides")
    
    # Update user skills
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"skills": data.skills}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_skills", "user", user_id, {"skills": data.skills})
    
    # Return updated user
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return serialize_doc(updated_user)


@router.get("/{user_id}/skills")
async def get_user_skills(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get technician skills with category details"""
    user = await db.users.find_one(
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "skills": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    skill_ids = user.get("skills", [])
    if not skill_ids:
        return {"skills": [], "categories": []}
    
    # Get category details for each skill
    categories = await db.categories.find(
        {"id": {"$in": skill_ids}, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "skills": skill_ids,
        "categories": [serialize_doc(c) for c in categories]
    }


# ======================
# Technician Invitations
# ======================

from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import secrets

class TechnicianInvite(BaseModel):
    telephone: str
    nom: str
    prenom: str
    email: Optional[str] = None
    specialites: Optional[List[str]] = []
    send_sms: bool = True

class TechnicianInviteResponse(BaseModel):
    id: str
    invite_code: str
    telephone: str
    nom: str
    prenom: str
    status: str
    created_at: str
    expires_at: str
    sms_sent: bool
    sms_status: Optional[dict] = None


@router.post("/invite", response_model=TechnicianInviteResponse)
async def invite_technician(
    data: TechnicianInvite,
    current_user: dict = Depends(require_admin)
):
    """
    Invite a technician via SMS with a unique registration code.
    The technician can then register using their phone number + code.
    """
    from sms_service import send_sms
    from plan_limits import check_technician_limit
    
    # Check technician limit
    limit_check = await check_technician_limit(db, current_user["entreprise_id"])
    if not limit_check["allowed"]:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite de techniciens atteinte ({limit_check['max']}). Passez à un plan supérieur."
        )
    
    # Clean phone number (remove spaces, dashes)
    phone = data.telephone.replace(" ", "").replace("-", "").replace(".", "")
    if not phone.startswith("+"):
        # Assume French number if no country code
        if phone.startswith("0"):
            phone = "+33" + phone[1:]
        else:
            phone = "+33" + phone
    
    # Check if phone already registered
    existing_user = await db.users.find_one({
        "telephone": {"$regex": phone.replace("+", "\\+"), "$options": "i"},
        "entreprise_id": current_user["entreprise_id"]
    })
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Un technicien avec ce numéro de téléphone existe déjà"
        )
    
    # Check for pending invite
    existing_invite = await db.tech_invites.find_one({
        "telephone": phone,
        "entreprise_id": current_user["entreprise_id"],
        "status": "pending",
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    if existing_invite:
        raise HTTPException(
            status_code=400, 
            detail="Une invitation est déjà en attente pour ce numéro"
        )
    
    # Generate unique 6-digit invite code
    invite_code = ''.join(secrets.choice('0123456789') for _ in range(6))
    
    # Create invite record
    invite_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=48)  # Invite valid for 48h
    
    invite_record = {
        "id": invite_id,
        "entreprise_id": current_user["entreprise_id"],
        "telephone": phone,
        "nom": data.nom,
        "prenom": data.prenom,
        "email": data.email,
        "specialites": data.specialites,
        "invite_code": invite_code,
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "created_by": current_user["user_id"]
    }
    
    await db.tech_invites.insert_one(invite_record)
    
    # Send SMS with invite code
    sms_result = {"status": "skipped", "reason": "SMS not requested"}
    if data.send_sms:
        entreprise = await db.entreprises.find_one(
            {"id": current_user["entreprise_id"]},
            {"_id": 0, "nom": 1, "is_demo": 1}
        )
        
        company_name = entreprise.get("nom", "Votre entreprise") if entreprise else "Votre entreprise"
        
        message = (
            f"Bonjour {data.prenom},\n"
            f"{company_name} vous invite à rejoindre son équipe de techniciens sur ACTOOS.\n\n"
            f"Votre code d'inscription: {invite_code}\n\n"
            f"Téléchargez l'app et utilisez ce code avec votre numéro de téléphone pour vous inscrire.\n\n"
            f"Ce code expire dans 48h."
        )
        
        sms_result = await send_sms(phone, message, entreprise)
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "invite_technician",
        "tech_invite",
        invite_id,
        {"telephone": phone, "sms_sent": sms_result.get("status") == "sent"}
    )
    
    return TechnicianInviteResponse(
        id=invite_id,
        invite_code=invite_code,
        telephone=phone,
        nom=data.nom,
        prenom=data.prenom,
        status="pending",
        created_at=now.isoformat(),
        expires_at=expires_at.isoformat(),
        sms_sent=sms_result.get("status") == "sent",
        sms_status=sms_result
    )


@router.delete("/invites/{invite_id}")
async def cancel_invite(invite_id: str, current_user: dict = Depends(require_admin)):
    """Cancel a pending invitation"""
    result = await db.tech_invites.update_one(
        {
            "id": invite_id,
            "entreprise_id": current_user["entreprise_id"],
            "status": "pending"
        },
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invitation non trouvée ou déjà utilisée")
    
    return {"message": "Invitation annulée"}


@router.post("/invites/{invite_id}/resend")
async def resend_invite(invite_id: str, current_user: dict = Depends(require_admin)):
    """Resend SMS for a pending invitation"""
    from sms_service import send_sms
    
    invite = await db.tech_invites.find_one({
        "id": invite_id,
        "entreprise_id": current_user["entreprise_id"],
        "status": "pending"
    }, {"_id": 0})
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation non trouvée ou déjà utilisée")
    
    # Extend expiration
    new_expires = datetime.now(timezone.utc) + timedelta(hours=48)
    
    # Get company name
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "nom": 1, "is_demo": 1}
    )
    company_name = entreprise.get("nom", "Votre entreprise") if entreprise else "Votre entreprise"
    
    message = (
        f"Rappel: {company_name} vous attend sur ACTOOS!\n\n"
        f"Code d'inscription: {invite['invite_code']}\n\n"
        f"Téléchargez l'app et inscrivez-vous avec votre numéro de téléphone.\n\n"
        f"Nouveau délai: 48h."
    )
    
    sms_result = await send_sms(invite["telephone"], message, entreprise)
    
    await db.tech_invites.update_one(
        {"id": invite_id},
        {"$set": {
            "expires_at": new_expires.isoformat(),
            "last_resent_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "SMS renvoyé",
        "sms_status": sms_result,
        "new_expires_at": new_expires.isoformat()
    }
