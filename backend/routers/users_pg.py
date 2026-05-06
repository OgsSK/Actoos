"""
User management routes: list, update status, delete, skills
OPTIMIZED: Direct PostgreSQL queries
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from models import UserResponse, UserSkillsUpdate
from auth import get_current_user, require_admin
from postgres_db import pg

router = APIRouter(prefix="/users", tags=["Users"])


async def log_action(entreprise_id: str, user_id: str, action: str, entity_type: str = None, entity_id: str = None, details: dict = None):
    """Log audit action"""
    import uuid
    await pg.insert("audit_logs", {
        "id": str(uuid.uuid4()),
        "entreprise_id": entreprise_id,
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc)
    })


@router.get("", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    """List all users of the entreprise"""
    users = await pg.find_many(
        "users",
        {"entreprise_id": current_user["entreprise_id"]},
        columns="id, entreprise_id, email, nom, prenom, telephone, role, statut, skills, derniere_connexion, created_at",
        order_by="created_at DESC"
    )
    return [UserResponse(**u) for u in users]


@router.get("/invites")
async def list_invites(current_user: dict = Depends(require_admin)):
    """List all technician invitations"""
    invites = await pg.find_many(
        "tech_invites",
        {"entreprise_id": current_user["entreprise_id"]},
        order_by="created_at DESC",
        limit=100
    )
    return invites


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific user"""
    user = await pg.find_one(
        "users",
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        columns="id, entreprise_id, email, nom, prenom, telephone, role, statut, skills, derniere_connexion, created_at"
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return UserResponse(**user)


@router.put("/{user_id}/status")
async def update_user_status(user_id: str, statut: str, current_user: dict = Depends(require_admin)):
    """Update user status (admin only)"""
    if statut not in ["actif", "desactive"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    count = await pg.update(
        "users",
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"statut": statut}
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_status", "user", user_id, {"statut": statut})
    return {"message": "Statut mis à jour"}


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only, cannot delete self)"""
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    user = await pg.find_one(
        "users",
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer un administrateur")
    
    await pg.delete("users", {"id": user_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "user", user_id)
    
    return {"message": "Utilisateur supprimé"}


@router.put("/{user_id}/skills")
async def update_skills(user_id: str, data: UserSkillsUpdate, current_user: dict = Depends(require_admin)):
    """Update user skills (admin only)"""
    count = await pg.update(
        "users",
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        {"skills": data.skills, "specialites": data.specialites}
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_skills", "user", user_id)
    return {"message": "Compétences mises à jour"}


@router.put("/{user_id}/profile")
async def update_profile(user_id: str, nom: str = None, prenom: str = None, telephone: str = None, 
                        current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    # Users can only update their own profile, admins can update any
    if user_id != current_user["user_id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_data = {}
    if nom is not None:
        update_data["nom"] = nom
    if prenom is not None:
        update_data["prenom"] = prenom
    if telephone is not None:
        update_data["telephone"] = telephone
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    count = await pg.update(
        "users",
        {"id": user_id, "entreprise_id": current_user["entreprise_id"]},
        update_data
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Profil mis à jour"}


@router.get("/technicians/list")
async def list_technicians(current_user: dict = Depends(get_current_user)):
    """List all technicians of the entreprise"""
    technicians = await pg.find_many(
        "users",
        {"entreprise_id": current_user["entreprise_id"], "role": "technicien"},
        columns="id, email, nom, prenom, telephone, statut, skills, specialites",
        order_by="nom ASC"
    )
    return technicians
