"""
SMS routes - SMS notifications for interventions, quotes, and invoices
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone
import os
import logging

from auth import get_current_user
from dependencies import db, log_action
from sms_service import (
    send_intervention_reminder, send_devis_notification,
    send_facture_notification, send_payment_reminder
)
import communication_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms", tags=["SMS"])


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


@router.get("/status")
async def get_sms_status(current_user: dict = Depends(get_current_user)):
    """Check if SMS (Twilio) is configured"""
    twilio_configured = bool(os.environ.get('TWILIO_ACCOUNT_SID') and os.environ.get('TWILIO_AUTH_TOKEN'))
    return {
        "configured": twilio_configured,
        "phone_number": os.environ.get('TWILIO_PHONE_NUMBER', '')[:6] + '****' if twilio_configured else None
    }
