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
