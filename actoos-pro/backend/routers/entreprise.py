"""
Entreprise settings and subscription routes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone
import uuid
import os
import re

from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action
from subscription_service import SUBSCRIPTION_PLANS, get_plan, get_all_plans
from storage import put_object, get_mime_type, APP_NAME
from models import SUPPORTED_CURRENCIES, SUPPORTED_LOCALES
from currency_utils import get_all_currencies, EXCHANGE_RATES, convert_amount, get_exchange_rate

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


@router.get("/entreprise/qr-validation")
async def validate_qr_requirements(current_user: dict = Depends(get_current_user)):
    """
    Validate that all required company information is present for QR code generation.
    Returns validation status and list of missing fields.
    """
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Required fields for QR code payment
    required_fields = {
        "nom": "Nom de l'entreprise",
        "email": "Email de l'entreprise",
        "telephone": "Téléphone",
        "adresse": "Adresse",
        "ville": "Ville",
        "code_postal": "Code postal"
    }
    
    # Recommended fields (not blocking but shown as warning)
    recommended_fields = {
        "iban": "IBAN (pour paiement par virement)",
        "siret": "Numéro SIRET"
    }
    
    missing_required = []
    missing_recommended = []
    
    # Check required fields
    for field, label in required_fields.items():
        value = entreprise.get(field)
        if not value or (isinstance(value, str) and not value.strip()):
            missing_required.append({"field": field, "label": label})
    
    # Check recommended fields
    for field, label in recommended_fields.items():
        value = entreprise.get(field)
        if not value or (isinstance(value, str) and not value.strip()):
            missing_recommended.append({"field": field, "label": label})
    
    # Validation status
    is_valid = len(missing_required) == 0
    
    return {
        "is_valid": is_valid,
        "missing_required": missing_required,
        "missing_recommended": missing_recommended,
        "message": "Toutes les informations requises sont présentes" if is_valid else "Certaines informations sont manquantes pour générer un QR code valide",
        "can_generate_qr": is_valid,
        "entreprise_data": {
            "nom": entreprise.get("nom"),
            "email": entreprise.get("email"),
            "has_iban": bool(entreprise.get("iban")),
            "has_siret": bool(entreprise.get("siret"))
        }
    }


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
    
    # Upload to storage (put_object is synchronous)
    try:
        result = put_object(storage_path, content, file.content_type)
        
        if not result:
            raise HTTPException(status_code=500, detail="Erreur de stockage: service non disponible")
        
        # Build the public URL from the storage path
        logo_url = f"https://integrations.emergentagent.com/objstore/api/v1/storage/objects/{result.get('path', storage_path)}"
        
        # Update entreprise with logo URL
        await db.entreprises.update_one(
            {"id": current_user["entreprise_id"]},
            {"$set": {"logo_url": logo_url}}
        )
        
        return {"logo_url": logo_url, "message": "Logo uploadé avec succès"}
    except HTTPException:
        raise
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


@router.get("/currencies")
async def list_currencies():
    """List all supported currencies with exchange rates"""
    currencies = get_all_currencies()
    # Add exchange rates to each currency
    for c in currencies:
        c["rate"] = EXCHANGE_RATES.get(c["code"], 1.0)
    return currencies


@router.get("/exchange-rates")
async def get_exchange_rates():
    """Get all exchange rates (base: EUR)"""
    return {
        "base": "EUR",
        "rates": EXCHANGE_RATES
    }


@router.get("/convert")
async def convert_currency(
    amount: float,
    from_currency: str = "EUR",
    to_currency: str = "EUR"
):
    """Convert amount between currencies"""
    converted = convert_amount(amount, from_currency, to_currency)
    return {
        "original": amount,
        "from": from_currency,
        "to": to_currency,
        "converted": converted,
        "rate": get_exchange_rate(from_currency, to_currency)
    }


@router.get("/locales")
async def list_locales():
    """List all supported locales"""
    return [
        {"code": "fr-FR", "name": "Français (France)", "flag": "🇫🇷"},
        {"code": "fr-CA", "name": "Français (Canada)", "flag": "🇨🇦"},
        {"code": "fr-MA", "name": "Français (Maroc)", "flag": "🇲🇦"},
        {"code": "en-US", "name": "English (US)", "flag": "🇺🇸"},
        {"code": "en-GB", "name": "English (UK)", "flag": "🇬🇧"},
    ]


@router.put("/entreprise/currency")
async def update_entreprise_currency(
    devise: str,
    current_user: dict = Depends(require_admin)
):
    """Update entreprise currency (admin only)"""
    if devise not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Devise non supportée. Choisissez parmi: {', '.join(SUPPORTED_CURRENCIES.keys())}")
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {"devise": devise}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_currency", "entreprise", current_user["entreprise_id"], {"devise": devise})
    
    return {"message": "Devise mise à jour", "devise": devise}


@router.put("/entreprise/locale")
async def update_entreprise_locale(
    locale: str,
    current_user: dict = Depends(require_admin)
):
    """Update entreprise locale (admin only)"""
    if locale not in SUPPORTED_LOCALES:
        raise HTTPException(status_code=400, detail=f"Locale non supportée. Choisissez parmi: {', '.join(SUPPORTED_LOCALES)}")
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {"locale": locale}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_locale", "entreprise", current_user["entreprise_id"], {"locale": locale})
    
    return {"message": "Locale mise à jour", "locale": locale}


@router.put("/entreprise/branding")
async def update_entreprise_branding(
    couleur_primaire: str,
    current_user: dict = Depends(require_admin)
):
    """Update entreprise branding (primary color) - admin only"""
    # Validate hex color format
    if not re.match(r'^#[0-9A-Fa-f]{6}$', couleur_primaire):
        raise HTTPException(status_code=400, detail="Couleur invalide. Format attendu: #RRGGBB (ex: #2563EB)")
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {"couleur_primaire": couleur_primaire}}
    )
    
    await log_action(
        current_user["entreprise_id"], 
        current_user["user_id"], 
        "update_branding", 
        "entreprise", 
        current_user["entreprise_id"], 
        {"couleur_primaire": couleur_primaire}
    )
    
    return {"message": "Couleur primaire mise à jour", "couleur_primaire": couleur_primaire}
