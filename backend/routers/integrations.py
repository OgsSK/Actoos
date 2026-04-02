"""
Integrations Router - WhatsApp, Google Calendar, and other third-party services
Allows enterprises to configure their own integrations or use shared Actoos services.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import os
import logging

from auth import get_current_user, require_admin
from dependencies import db, log_action
from whatsapp_service import (
    is_shared_whatsapp_available,
    get_whatsapp_status_for_entreprise,
    get_whatsapp_service_for_entreprise,
    WhatsAppService
)
from sms_service import is_shared_twilio_available, get_sms_status_for_entreprise

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ==================== MODELS ====================

class WhatsAppConfigUpdate(BaseModel):
    """WhatsApp Business configuration"""
    use_shared: bool = True
    whatsapp_access_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_business_account_id: Optional[str] = None


class GoogleCalendarConfigUpdate(BaseModel):
    """Google Calendar OAuth configuration"""
    use_shared: bool = True
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None


class MessagingPreference(BaseModel):
    """Preferred messaging channel"""
    preferred_channel: str = "whatsapp"  # whatsapp, sms, email


# ==================== INTEGRATIONS STATUS ====================

@router.get("/status")
async def get_integrations_status(current_user: dict = Depends(get_current_user)):
    """Get status of all integrations for the enterprise"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # WhatsApp status
    wa_status = get_whatsapp_status_for_entreprise(entreprise)
    wa_shared = is_shared_whatsapp_available()
    
    # SMS/Twilio status
    sms_status = get_sms_status_for_entreprise(entreprise)
    sms_shared = is_shared_twilio_available()
    
    # Google Calendar status
    google_connected = entreprise.get("google_calendar_connected", False)
    google_custom = bool(entreprise.get("google_client_id"))
    
    return {
        "whatsapp": {
            "configured": wa_status["configured"],
            "mode": wa_status["mode"],
            "description": wa_status["description"],
            "shared_available": wa_shared,
            "has_custom_config": wa_status["mode"] == "custom",
            "use_shared": entreprise.get("use_shared_whatsapp", True),
            "recommended": True  # WhatsApp is recommended over SMS
        },
        "sms": {
            "configured": sms_status["configured"],
            "mode": sms_status["mode"],
            "description": sms_status["description"],
            "shared_available": sms_shared,
            "has_custom_config": bool(entreprise.get("twilio_account_sid")),
            "use_shared": entreprise.get("use_shared_twilio", True)
        },
        "google_calendar": {
            "connected": google_connected,
            "has_custom_config": google_custom,
            "use_shared": entreprise.get("use_shared_google", True),
            "shared_available": bool(os.environ.get("GOOGLE_CLIENT_ID")),
            "oauth_url": f"/api/google-calendar/auth" if not google_connected else None
        },
        "email": {
            "configured": True,
            "provider": "Resend",
            "description": "Service email Actoos (inclus)"
        },
        "messaging_preference": entreprise.get("messaging_preference", "whatsapp")
    }


# ==================== WHATSAPP CONFIGURATION ====================

@router.get("/whatsapp/status")
async def get_whatsapp_status(current_user: dict = Depends(get_current_user)):
    """Get WhatsApp configuration status"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    status = get_whatsapp_status_for_entreprise(entreprise)
    shared_available = is_shared_whatsapp_available()
    
    return {
        "configured": status["configured"],
        "mode": status["mode"],
        "description": status["description"],
        "shared_available": shared_available,
        "has_custom_config": bool(entreprise and entreprise.get("whatsapp_access_token")),
        "use_shared": entreprise.get("use_shared_whatsapp", True) if entreprise else True,
        "templates_info": "Les templates WhatsApp doivent être approuvés par Meta avant utilisation."
    }


@router.put("/whatsapp/config")
async def update_whatsapp_config(
    config: WhatsAppConfigUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update WhatsApp configuration for the enterprise"""
    
    update_data = {
        "use_shared_whatsapp": config.use_shared,
        "whatsapp_config_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if not config.use_shared:
        # Validate custom credentials
        if not config.whatsapp_access_token or not config.whatsapp_phone_number_id:
            raise HTTPException(
                status_code=400,
                detail="Pour utiliser votre propre WhatsApp Business, veuillez fournir le Token et le Phone Number ID"
            )
        
        # Test the credentials
        try:
            test_service = WhatsAppService(
                access_token=config.whatsapp_access_token,
                phone_number_id=config.whatsapp_phone_number_id
            )
            # Quick validation - this will fail if credentials are wrong
            # We can't easily test without sending a message, so we just store
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Erreur de validation WhatsApp: {str(e)}"
            )
        
        update_data["whatsapp_access_token"] = config.whatsapp_access_token
        update_data["whatsapp_phone_number_id"] = config.whatsapp_phone_number_id
        if config.whatsapp_business_account_id:
            update_data["whatsapp_business_account_id"] = config.whatsapp_business_account_id
    else:
        # Clear custom credentials when switching to shared
        update_data["whatsapp_access_token"] = None
        update_data["whatsapp_phone_number_id"] = None
        update_data["whatsapp_business_account_id"] = None
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "update_whatsapp_config",
        "entreprise",
        current_user["entreprise_id"]
    )
    
    mode = "partagé Actoos" if config.use_shared else "personnalisé"
    return {"message": f"Configuration WhatsApp mise à jour (mode {mode})"}


@router.post("/whatsapp/test")
async def test_whatsapp(
    phone_number: str,
    current_user: dict = Depends(require_admin)
):
    """Send a test WhatsApp message"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    service, mode = get_whatsapp_service_for_entreprise(entreprise)
    
    if not service.is_configured:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp n'est pas configuré. Configurez le service partagé Actoos ou vos propres credentials."
        )
    
    # Send a simple test message (requires 24h window or approved template)
    # For testing, we'll try to send a text message
    result = await service.send_text_message(
        to_phone_number=phone_number,
        message=f"Test WhatsApp Actoos - Configuration réussie pour {entreprise.get('nom', 'votre entreprise')}! 🎉"
    )
    
    if result.get("status") == "success":
        return {
            "success": True,
            "message": f"Message WhatsApp envoyé à {phone_number}",
            "mode": mode,
            "message_id": result.get("message_id")
        }
    else:
        # If text message fails (outside 24h window), inform user
        raise HTTPException(
            status_code=400,
            detail=f"Échec: {result.get('message', 'Erreur inconnue')}. Note: Les messages texte ne fonctionnent que dans la fenêtre de 24h après un message du client."
        )


# ==================== GOOGLE CALENDAR CONFIGURATION ====================

@router.get("/google-calendar/status")
async def get_google_calendar_status(current_user: dict = Depends(get_current_user)):
    """Get Google Calendar integration status"""
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "google_calendar_connected": 1, "google_client_id": 1, 
         "google_refresh_token": 1, "use_shared_google": 1}
    )
    
    shared_available = bool(os.environ.get("GOOGLE_CLIENT_ID"))
    has_custom = bool(entreprise and entreprise.get("google_client_id"))
    is_connected = bool(entreprise and entreprise.get("google_calendar_connected"))
    
    return {
        "connected": is_connected,
        "has_custom_config": has_custom,
        "use_shared": entreprise.get("use_shared_google", True) if entreprise else True,
        "shared_available": shared_available,
        "oauth_url": "/api/google-calendar/auth",
        "setup_instructions": {
            "shared": "Cliquez sur 'Connecter' pour autoriser Actoos à accéder à votre Google Calendar.",
            "custom": "Pour utiliser vos propres credentials Google:\n1. Créez un projet sur console.cloud.google.com\n2. Activez l'API Google Calendar\n3. Créez des credentials OAuth 2.0\n4. Ajoutez les URIs de redirection"
        }
    }


@router.put("/google-calendar/config")
async def update_google_calendar_config(
    config: GoogleCalendarConfigUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update Google Calendar configuration"""
    
    update_data = {
        "use_shared_google": config.use_shared,
        "google_config_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if not config.use_shared:
        if not config.google_client_id or not config.google_client_secret:
            raise HTTPException(
                status_code=400,
                detail="Client ID et Client Secret requis pour la configuration personnalisée"
            )
        
        update_data["google_client_id"] = config.google_client_id
        update_data["google_client_secret"] = config.google_client_secret
        # Reset connection when changing credentials
        update_data["google_calendar_connected"] = False
        update_data["google_refresh_token"] = None
    else:
        # Clear custom credentials
        update_data["google_client_id"] = None
        update_data["google_client_secret"] = None
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "update_google_calendar_config",
        "entreprise",
        current_user["entreprise_id"]
    )
    
    return {"message": "Configuration Google Calendar mise à jour"}


@router.delete("/google-calendar/disconnect")
async def disconnect_google_calendar(current_user: dict = Depends(require_admin)):
    """Disconnect Google Calendar integration"""
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {
            "google_calendar_connected": False,
            "google_refresh_token": None,
            "google_access_token": None
        }}
    )
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "disconnect_google_calendar",
        "entreprise",
        current_user["entreprise_id"]
    )
    
    return {"message": "Google Calendar déconnecté"}


# ==================== MESSAGING PREFERENCE ====================

@router.put("/messaging-preference")
async def update_messaging_preference(
    preference: MessagingPreference,
    current_user: dict = Depends(require_admin)
):
    """Set preferred messaging channel (WhatsApp, SMS, or Email)"""
    
    valid_channels = ["whatsapp", "sms", "email"]
    if preference.preferred_channel not in valid_channels:
        raise HTTPException(
            status_code=400,
            detail=f"Canal invalide. Options: {', '.join(valid_channels)}"
        )
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {"messaging_preference": preference.preferred_channel}}
    )
    
    channel_names = {"whatsapp": "WhatsApp", "sms": "SMS", "email": "Email"}
    return {"message": f"Canal de messagerie préféré: {channel_names[preference.preferred_channel]}"}
