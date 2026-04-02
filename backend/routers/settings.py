"""
Settings Router - Notifications and Document Settings
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

from dependencies import db
from auth import get_current_user, require_admin

router = APIRouter(prefix="/settings", tags=["Settings"])


# ==================== MODELS ====================

class NotificationSettings(BaseModel):
    """Notification preferences model"""
    # Email notifications
    email_new_intervention: bool = True
    email_intervention_completed: bool = True
    email_new_devis: bool = True
    email_devis_accepted: bool = True
    email_new_facture: bool = True
    email_payment_received: bool = True
    email_payment_reminder: bool = True
    
    # SMS notifications
    sms_intervention_reminder: bool = False
    sms_new_devis: bool = False
    sms_new_facture: bool = False
    sms_appointment_confirmation: bool = False
    
    # Push notifications
    push_new_intervention: bool = True
    push_intervention_update: bool = True
    push_new_message: bool = True


class DocumentSettings(BaseModel):
    """Document settings for devis and factures"""
    # Conditions générales
    conditions_generales: str = ""
    
    # Footer texts
    devis_footer: str = "Devis valable 30 jours. TVA non applicable, art. 293 B du CGI."
    facture_footer: str = "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée."
    
    # Payment terms
    conditions_paiement: str = "Paiement à réception de facture"
    delai_paiement_jours: int = 30
    
    # Mentions légales
    mentions_legales: str = ""
    
    # Numérotation
    prefixe_devis: str = "D"
    prefixe_facture: str = "F"


# ==================== NOTIFICATION ENDPOINTS ====================

@router.get("/notifications")
async def get_notification_settings(current_user: dict = Depends(get_current_user)):
    """Get notification preferences for the enterprise"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "notification_settings": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Return existing settings or defaults
    settings = entreprise.get("notification_settings", {})
    
    defaults = NotificationSettings().dict()
    
    # Merge defaults with existing settings
    result = {**defaults, **settings}
    
    return result


@router.put("/notifications")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: dict = Depends(require_admin)
):
    """Update notification preferences"""
    
    result = await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {
            "$set": {
                "notification_settings": settings.dict(),
                "notification_settings_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    return {"message": "Préférences de notification mises à jour"}


# ==================== DOCUMENT SETTINGS ENDPOINTS ====================

@router.get("/documents")
async def get_document_settings(current_user: dict = Depends(get_current_user)):
    """Get document settings (conditions générales, footers, etc.)"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "document_settings": 1, "conditions_paiement": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Return existing settings or defaults
    settings = entreprise.get("document_settings", {})
    
    defaults = DocumentSettings().dict()
    
    # Merge defaults with existing settings
    # Also include legacy field if exists
    if entreprise.get("conditions_paiement"):
        defaults["conditions_paiement"] = entreprise["conditions_paiement"]
    
    result = {**defaults, **settings}
    
    return result


@router.put("/documents")
async def update_document_settings(
    settings: DocumentSettings,
    current_user: dict = Depends(require_admin)
):
    """Update document settings"""
    
    result = await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {
            "$set": {
                "document_settings": settings.dict(),
                "document_settings_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    return {"message": "Paramètres des documents mis à jour"}


@router.get("/documents/preview")
async def preview_document_settings(current_user: dict = Depends(get_current_user)):
    """Preview how conditions will appear on documents"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "document_settings": 1, "nom": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    settings = entreprise.get("document_settings", DocumentSettings().dict())
    
    preview = {
        "devis": {
            "header": f"Devis - {entreprise.get('nom', 'Votre entreprise')}",
            "conditions_generales": settings.get("conditions_generales", ""),
            "footer": settings.get("devis_footer", ""),
            "conditions_paiement": settings.get("conditions_paiement", "")
        },
        "facture": {
            "header": f"Facture - {entreprise.get('nom', 'Votre entreprise')}",
            "conditions_generales": settings.get("conditions_generales", ""),
            "footer": settings.get("facture_footer", ""),
            "mentions_legales": settings.get("mentions_legales", "")
        }
    }
    
    return preview


# ==================== COMBINED SETTINGS ====================

@router.get("/all")
async def get_all_settings(current_user: dict = Depends(get_current_user)):
    """Get all settings at once"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "notification_settings": 1, "document_settings": 1, "gdpr_settings": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    return {
        "notifications": {**NotificationSettings().dict(), **entreprise.get("notification_settings", {})},
        "documents": {**DocumentSettings().dict(), **entreprise.get("document_settings", {})},
        "gdpr": entreprise.get("gdpr_settings", {})
    }
