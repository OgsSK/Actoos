"""
SMS routes - SMS notifications for interventions, quotes, and invoices
Supports both shared Actoos Twilio and custom per-enterprise Twilio
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import os
import logging

from auth import get_current_user, require_admin
from dependencies import db, log_action
from sms_service import (
    send_intervention_reminder, send_devis_notification,
    send_facture_notification, send_payment_reminder,
    get_sms_status_for_entreprise, is_shared_twilio_available
)
import communication_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms", tags=["SMS"])


# ==================== MODELS ====================

class TwilioConfigUpdate(BaseModel):
    """Custom Twilio configuration"""
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    use_shared: bool = True  # If True, use Actoos shared Twilio


# ==================== SMS STATUS & CONFIG ====================

@router.get("/status")
async def get_sms_status(current_user: dict = Depends(get_current_user)):
    """Get SMS configuration status for the enterprise"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "twilio_account_sid": 1, "twilio_auth_token": 1, "twilio_phone_number": 1, "use_shared_twilio": 1}
    )
    
    status = get_sms_status_for_entreprise(entreprise)
    shared_available = is_shared_twilio_available()
    
    # Check if enterprise has custom config
    has_custom_config = bool(
        entreprise and 
        entreprise.get('twilio_account_sid') and 
        entreprise.get('twilio_auth_token') and 
        entreprise.get('twilio_phone_number')
    )
    
    return {
        "configured": status["configured"],
        "mode": status["mode"],
        "phone_number": status["phone_number"],
        "description": status["description"],
        "shared_available": shared_available,
        "has_custom_config": has_custom_config,
        "use_shared": entreprise.get('use_shared_twilio', True) if entreprise else True
    }


@router.put("/config")
async def update_sms_config(
    config: TwilioConfigUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update Twilio configuration for the enterprise"""
    update_data = {
        "use_shared_twilio": config.use_shared,
        "twilio_config_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if not config.use_shared:
        # Validate custom credentials are provided
        if not config.twilio_account_sid or not config.twilio_auth_token or not config.twilio_phone_number:
            raise HTTPException(
                status_code=400, 
                detail="Pour utiliser votre propre Twilio, veuillez fournir SID, Token et Numéro de téléphone"
            )
        
        # Test the credentials
        try:
            from twilio.rest import Client
            test_client = Client(config.twilio_account_sid, config.twilio_auth_token)
            # Quick validation - this will fail if credentials are wrong
            test_client.api.accounts(config.twilio_account_sid).fetch()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Identifiants Twilio invalides: {str(e)}"
            )
        
        update_data["twilio_account_sid"] = config.twilio_account_sid
        update_data["twilio_auth_token"] = config.twilio_auth_token
        update_data["twilio_phone_number"] = config.twilio_phone_number
    else:
        # Clear custom credentials when switching to shared
        update_data["twilio_account_sid"] = None
        update_data["twilio_auth_token"] = None
        update_data["twilio_phone_number"] = None
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    
    await log_action(
        current_user["entreprise_id"], 
        current_user["user_id"], 
        "update_twilio_config", 
        "entreprise", 
        current_user["entreprise_id"]
    )
    
    mode = "partagé Actoos" if config.use_shared else "personnalisé"
    return {"message": f"Configuration SMS mise à jour (mode {mode})"}


@router.post("/test")
async def test_sms(
    phone_number: str,
    current_user: dict = Depends(require_admin)
):
    """Send a test SMS to verify configuration"""
    from sms_service import send_sms
    
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    result = await send_sms(
        phone_number, 
        f"Test SMS Actoos - Configuration réussie pour {entreprise.get('nom', 'votre entreprise')}!",
        entreprise
    )
    
    if result["status"] == "success":
        return {
            "success": True,
            "message": f"SMS de test envoyé à {phone_number}",
            "mode": result.get("mode", "unknown")
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Échec de l'envoi: {result.get('message', 'Erreur inconnue')}"
        )


# ==================== SMS SEND ENDPOINTS ====================


@router.post("/intervention/{intervention_id}/reminder")
async def send_sms_intervention_reminder(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Send SMS reminder for an intervention"""
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    client = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    sms_result = await send_intervention_reminder(client, intervention, entreprise or {})
    
    # Log communication
    await communication_log.log_sms(
        entreprise_id=current_user["entreprise_id"],
        client_id=client["id"],
        phone_number=client["telephone"],
        message=f"Rappel intervention: {intervention.get('titre', '')}",
        status="sent" if sms_result.get("success") else "failed",
        error_message=sms_result.get("error") if not sms_result.get("success") else None,
        related_entity="intervention",
        related_entity_id=intervention_id,
        sent_by=current_user["user_id"]
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_reminder", "intervention", intervention_id)
    
    return {"message": "SMS envoyé", "sms": sms_result}


@router.post("/devis/{devis_id}/notification")
async def send_sms_devis_notification(devis_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Send SMS notification for a quote"""
    devis = await db.devis.find_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    # Build portal URL
    base_url = str(request.base_url).rstrip('/')
    if '/api' in base_url:
        base_url = base_url.rsplit('/api', 1)[0]
    portal_url = f"{base_url}/portal/devis/{devis['token_client']}"
    
    sms_result = await send_devis_notification(client, devis, entreprise or {}, portal_url)
    
    # Log communication
    await communication_log.log_sms(
        entreprise_id=current_user["entreprise_id"],
        client_id=client["id"],
        phone_number=client["telephone"],
        message=f"Notification devis {devis.get('numero_devis', '')}",
        status="sent" if sms_result.get("success") else "failed",
        error_message=sms_result.get("error") if not sms_result.get("success") else None,
        related_entity="devis",
        related_entity_id=devis_id,
        sent_by=current_user["user_id"]
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_notification", "devis", devis_id)
    
    return {"message": "SMS envoyé", "sms": sms_result}


@router.post("/facture/{facture_id}/notification")
async def send_sms_facture_notification(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Send SMS notification for an invoice"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    sms_result = await send_facture_notification(client, facture, entreprise or {})
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_notification", "facture", facture_id)
    
    return {"message": "SMS envoyé", "sms": sms_result}


@router.post("/facture/{facture_id}/reminder")
async def send_sms_payment_reminder(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Send SMS payment reminder"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["emise", "en_retard"]}},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée ou déjà payée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    
    # Calculate days overdue
    date_echeance = datetime.fromisoformat(facture.get("date_echeance", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
    jours_retard = max(0, (datetime.now(timezone.utc) - date_echeance).days)
    
    sms_result = await send_payment_reminder(client, facture, entreprise or {}, jours_retard)
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sms_relance", "facture", facture_id)
    
    return {"message": "SMS envoyé", "jours_retard": jours_retard, "sms": sms_result}
