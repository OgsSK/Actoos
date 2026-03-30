"""
Entreprise settings and subscription routes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone
import uuid
import os

from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action
from subscription_service import SUBSCRIPTION_PLANS, get_plan, get_all_plans
from storage import put_object, get_mime_type, APP_NAME

router = APIRouter(tags=["Entreprise"])


@router.get("/entreprise")
async def get_entreprise(current_user: dict = Depends(get_current_user)):
    """Get current entreprise info"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return serialize_doc(entreprise)


@router.put("/entreprise")
async def update_entreprise(data: dict, current_user: dict = Depends(require_admin)):
    """Update entreprise settings (admin only)"""
    allowed_fields = [
        "nom", "email", "telephone", "adresse", "code_postal", "ville",
        "siret", "tva_intracommunautaire", "iban", "conditions_paiement",
        "mentions_legales", "logo_url", "couleur_primaire", "couleur_secondaire"
    ]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucun champ valide à mettre à jour")
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "entreprise", current_user["entreprise_id"])
    
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    return serialize_doc(entreprise)


@router.post("/entreprise/logo")
async def upload_logo(file: UploadFile = File(...), current_user: dict = Depends(require_admin)):
    """Upload entreprise logo"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    # Read file content
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="L'image ne doit pas dépasser 5MB")
    
    # Generate storage path
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    storage_path = f"logos/{current_user['entreprise_id']}.{ext}"
    
    # Upload to storage
    try:
        url = await put_object(storage_path, content, file.content_type)
        
        # Update entreprise with logo URL
        await db.entreprises.update_one(
            {"id": current_user["entreprise_id"]},
            {"$set": {"logo_url": url}}
        )
        
        return {"logo_url": url, "message": "Logo uploadé avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")


@router.get("/subscription/plans")
async def list_subscription_plans():
    """List all available subscription plans"""
    return get_all_plans()


@router.get("/subscription/current")
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Get current subscription for entreprise"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1, "plan_expires_at": 1, "stripe_customer_id": 1, "stripe_subscription_id": 1}
    )
    
    plan_code = entreprise.get("plan", "free")
    plan_details = get_plan(plan_code)
    
    return {
        "plan": plan_code,
        "plan_details": plan_details,
        "expires_at": entreprise.get("plan_expires_at"),
        "has_stripe": bool(entreprise.get("stripe_customer_id"))
    }
