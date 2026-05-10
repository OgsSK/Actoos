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
    email_devis_notification: bool = True
    email_devis_accepted: bool = True
    email_facture_notification: bool = True
    email_payment_received: bool = True
    email_payment_reminder: bool = True
    
    # SMS/WhatsApp notifications (same settings control both)
    sms_intervention_reminder: bool = True
    sms_devis_notification: bool = True
    sms_facture_notification: bool = True
    sms_payment_reminder: bool = True
    
    # Auto reminders
    auto_reminders_enabled: bool = True
    
    # Push notifications
    push_new_intervention: bool = True
    push_intervention_update: bool = True
    push_new_message: bool = True


class DocumentSettings(BaseModel):
    """Document settings for devis and factures"""
    # Conditions générales
    conditions_generales: str = ""
    
    # Message au client (affiché sur les devis/factures)
    message_client_devis: str = ""
    message_client_facture: str = ""
    
    # Footer texts
    devis_footer: str = "Devis valable 30 jours. TVA non applicable, art. 293 B du CGI."
    facture_footer: str = "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée."
    
    # Payment terms
    conditions_paiement: str = "Paiement à réception de facture"
    delai_paiement_jours: int = 30
    
    # Validité par défaut
    validite_devis_jours: int = 30
    
    # Mentions légales
    mentions_legales: str = ""
    
    # Numérotation
    prefixe_devis: str = "D"
    prefixe_facture: str = "F"


class PaymentSettings(BaseModel):
    """Payment configuration for the enterprise"""
    # External payment link (PayPal, SenePay, etc.)
    lien_paiement_externe: Optional[str] = None
    
    # Reminder settings
    relance_auto_enabled: bool = False
    relance_delai_jours: int = 7  # Days after due date to send reminder
    relance_max_count: int = 3  # Maximum number of reminders
    
    # Payment methods accepted
    modes_paiement_acceptes: list = ["especes", "carte", "virement", "cheque"]
    
    # Display settings
    afficher_qr_code_paiement: bool = True
    afficher_lien_paiement: bool = True


# ==================== NOTIFICATION ENDPOINTS ====================

@router.get("/notifications")
async def get_notification_settings(current_user: dict = Depends(get_current_user)):
    """Get notification preferences for the enterprise"""
    
    # First check if enterprise exists
    entreprise_exists = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "id": 1}
    )
    
    if not entreprise_exists:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Get notification settings
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "notification_settings": 1}
    )
    
    # Return existing settings or defaults
    settings = entreprise.get("notification_settings", {}) if entreprise else {}
    
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
    
    # First check if enterprise exists
    entreprise_exists = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "id": 1}
    )
    
    if not entreprise_exists:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "document_settings": 1, "conditions_paiement": 1, "conditions_generales": 1}
    )
    
    # Return existing settings or defaults
    settings = entreprise.get("document_settings", {}) if entreprise else {}
    
    defaults = DocumentSettings().dict()
    
    # Merge defaults with existing settings
    # Also include legacy fields if they exist
    if entreprise:
        if entreprise.get("conditions_paiement"):
            defaults["conditions_paiement"] = entreprise["conditions_paiement"]
        if entreprise.get("conditions_generales"):
            defaults["conditions_generales"] = entreprise["conditions_generales"]
    
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
    
    # First check if enterprise exists
    entreprise_exists = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "id": 1}
    )
    
    if not entreprise_exists:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "notification_settings": 1, "document_settings": 1, "gdpr_settings": 1, 
         "api_keys_configured": 1, "use_shared_twilio": 1, "twilio_account_sid": 1,
         "conditions_generales": 1, "conditions_paiement": 1}
    )
    
    # Build documents defaults with legacy fields
    doc_defaults = DocumentSettings().dict()
    if entreprise:
        if entreprise.get("conditions_generales"):
            doc_defaults["conditions_generales"] = entreprise["conditions_generales"]
        if entreprise.get("conditions_paiement"):
            doc_defaults["conditions_paiement"] = entreprise["conditions_paiement"]
    
    return {
        "notifications": {**NotificationSettings().dict(), **(entreprise.get("notification_settings", {}) if entreprise else {})},
        "documents": {**doc_defaults, **(entreprise.get("document_settings", {}) if entreprise else {})},
        "gdpr": entreprise.get("gdpr_settings", {}) if entreprise else {},
        "integrations": {
            "twilio": {
                "use_shared": entreprise.get("use_shared_twilio", True) if entreprise else True,
                "has_custom": bool(entreprise.get("twilio_account_sid")) if entreprise else False
            }
        }
    }


# ==================== API KEYS / INTEGRATIONS CONFIG ====================

class IntegrationKeys(BaseModel):
    """API Keys for integrations - stored securely"""
    # Twilio
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    use_shared_twilio: bool = True
    
    # Future: Google Calendar, etc.


@router.get("/integrations")
async def get_integrations_status(current_user: dict = Depends(require_admin)):
    """Get integration configuration status (not the actual keys)"""
    from sms_service import is_shared_twilio_available
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "twilio_account_sid": 1, "twilio_phone_number": 1, "use_shared_twilio": 1,
         "google_calendar_connected": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    return {
        "twilio": {
            "configured": bool(entreprise.get("twilio_account_sid")) or is_shared_twilio_available(),
            "mode": "custom" if entreprise.get("twilio_account_sid") else ("shared" if is_shared_twilio_available() else "none"),
            "use_shared": entreprise.get("use_shared_twilio", True),
            "shared_available": is_shared_twilio_available(),
            "phone_number": entreprise.get("twilio_phone_number", "")[:6] + "****" if entreprise.get("twilio_phone_number") else None
        },
        "google_calendar": {
            "connected": entreprise.get("google_calendar_connected", False)
        },
        "email": {
            "configured": True,  # Resend is always configured at platform level
            "provider": "Resend"
        }
    }


# ==================== DOCUMENT DEFAULTS FOR NEW DEVIS/FACTURES ====================

@router.get("/documents/defaults/devis")
async def get_devis_defaults(current_user: dict = Depends(get_current_user)):
    """
    Get default values for a new devis form.
    These are the global document settings that will be used if not overridden locally.
    """
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "document_settings": 1, "conditions_generales": 1, "conditions_paiement": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Get document settings with fallback to defaults
    doc_settings = entreprise.get("document_settings", {})
    defaults = DocumentSettings().dict()
    settings = {**defaults, **doc_settings}
    
    # Legacy field support
    if entreprise.get("conditions_generales") and not doc_settings.get("conditions_generales"):
        settings["conditions_generales"] = entreprise["conditions_generales"]
    
    return {
        "conditions": settings.get("conditions_generales", ""),
        "message_client": settings.get("message_client_devis", ""),
        "validite_jours": settings.get("validite_devis_jours", 30),
        "pied_de_page": settings.get("devis_footer", "")
    }


@router.get("/documents/defaults/facture")
async def get_facture_defaults(current_user: dict = Depends(get_current_user)):
    """
    Get default values for a new facture.
    These are the global document settings that will be used if not overridden locally.
    """
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "document_settings": 1, "conditions_generales": 1, "conditions_paiement": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Get document settings with fallback to defaults
    doc_settings = entreprise.get("document_settings", {})
    defaults = DocumentSettings().dict()
    settings = {**defaults, **doc_settings}
    
    # Legacy field support
    if entreprise.get("conditions_paiement") and not doc_settings.get("conditions_paiement"):
        settings["conditions_paiement"] = entreprise["conditions_paiement"]
    
    return {
        "conditions_paiement": settings.get("conditions_paiement", "Paiement à réception de facture"),
        "delai_paiement_jours": settings.get("delai_paiement_jours", 30),
        "message_client": settings.get("message_client_facture", ""),
        "pied_de_page": settings.get("facture_footer", ""),
        "mentions_legales": settings.get("mentions_legales", "")
    }



# ==================== PAYMENT SETTINGS ENDPOINTS ====================

@router.get("/payment")
async def get_payment_settings(current_user: dict = Depends(get_current_user)):
    """Get payment configuration for the enterprise"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    if not entreprise:
        # Return defaults if enterprise not found
        return PaymentSettings().dict()
    
    # Get payment settings with fallback to defaults
    settings = entreprise.get("payment_settings", {})
    defaults = PaymentSettings().dict()
    
    return {**defaults, **settings}


@router.put("/payment")
async def update_payment_settings(
    settings: PaymentSettings,
    current_user: dict = Depends(require_admin)
):
    """Update payment configuration (admin only)"""
    result = await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {
            "$set": {
                "payment_settings": settings.dict(),
                "payment_settings_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    return {
        "message": "Paramètres de paiement mis à jour",
        "settings": settings.dict()
    }


@router.patch("/payment/lien-externe")
async def update_payment_link(
    lien_paiement_externe: str,
    current_user: dict = Depends(require_admin)
):
    """Quick update of external payment link"""
    result = await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {
            "$set": {
                "payment_settings.lien_paiement_externe": lien_paiement_externe,
                "payment_settings_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    return {
        "message": "Lien de paiement mis à jour",
        "lien_paiement_externe": lien_paiement_externe
    }
