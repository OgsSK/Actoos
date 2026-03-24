"""
SMS Service for FieldCommand using Twilio
Handles SMS notifications for interventions, quotes, and invoices
"""
import os
import logging
from typing import Optional
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

# Twilio configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# Initialize Twilio client
twilio_client = None

def init_twilio():
    """Initialize Twilio client"""
    global twilio_client
    
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured - SMS disabled")
        return False
    
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Twilio: {e}")
        return False

def format_phone_number(phone: str) -> str:
    """
    Format phone number to E.164 format for France
    Assumes French numbers if no country code provided
    """
    if not phone:
        return None
    
    # Remove spaces, dashes, dots
    phone = phone.replace(' ', '').replace('-', '').replace('.', '')
    
    # If already in E.164 format
    if phone.startswith('+'):
        return phone
    
    # French number starting with 0
    if phone.startswith('0') and len(phone) == 10:
        return f'+33{phone[1:]}'
    
    # Assume French number without leading 0
    if len(phone) == 9:
        return f'+33{phone}'
    
    return phone

async def send_sms(to_number: str, message: str) -> dict:
    """
    Send an SMS message
    
    Args:
        to_number: Recipient phone number
        message: SMS content (max 160 chars for single SMS)
    
    Returns:
        dict with status and message_sid or error
    """
    if not twilio_client:
        return {"status": "error", "message": "Twilio not configured"}
    
    if not TWILIO_PHONE_NUMBER:
        return {"status": "error", "message": "Twilio phone number not configured"}
    
    formatted_number = format_phone_number(to_number)
    if not formatted_number:
        return {"status": "error", "message": "Invalid phone number"}
    
    try:
        # Truncate message if too long
        if len(message) > 1600:  # Max 10 segments
            message = message[:1597] + "..."
        
        sms = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_number
        )
        
        logger.info(f"SMS sent to {formatted_number}: {sms.sid}")
        return {
            "status": "success",
            "message_sid": sms.sid,
            "to": formatted_number
        }
        
    except TwilioRestException as e:
        logger.error(f"Twilio error sending SMS to {formatted_number}: {e}")
        return {
            "status": "error",
            "message": str(e),
            "code": e.code
        }
    except Exception as e:
        logger.error(f"Error sending SMS to {formatted_number}: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

# ==================== SMS Templates ====================

async def send_intervention_reminder(client: dict, intervention: dict, entreprise: dict) -> dict:
    """Send SMS reminder for upcoming intervention"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    date_str = intervention.get('date_prevue', '')[:10]
    heure_str = intervention.get('date_prevue', '')[11:16] if intervention.get('date_prevue') else ''
    
    message = (
        f"{entreprise_nom}: Rappel de votre RDV le {date_str} à {heure_str}. "
        f"{intervention.get('titre', 'Intervention')}. "
        f"Contact: {entreprise.get('telephone', '')}"
    )
    
    return await send_sms(phone, message)

async def send_intervention_started(client: dict, intervention: dict, technicien: dict, entreprise: dict) -> dict:
    """Notify client that technician is on the way"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    tech_name = f"{technicien.get('prenom', '')} {technicien.get('nom', '')}" if technicien else "Votre technicien"
    
    message = (
        f"{entreprise_nom}: {tech_name} est en route pour votre intervention. "
        f"Arrivée prévue sous peu."
    )
    
    return await send_sms(phone, message)

async def send_intervention_completed(client: dict, intervention: dict, entreprise: dict) -> dict:
    """Notify client that intervention is completed"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    
    message = (
        f"{entreprise_nom}: Votre intervention '{intervention.get('titre', '')}' est terminée. "
        f"Merci de votre confiance!"
    )
    
    return await send_sms(phone, message)

async def send_devis_notification(client: dict, devis: dict, entreprise: dict, portal_url: str) -> dict:
    """Notify client about a new quote"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    total_ttc = devis.get('total_ttc', 0)
    
    message = (
        f"{entreprise_nom}: Votre devis {devis.get('numero_devis', '')} "
        f"({total_ttc:.2f}€) est disponible. "
        f"Consultez et signez en ligne: {portal_url}"
    )
    
    return await send_sms(phone, message)

async def send_devis_signed_confirmation(client: dict, devis: dict, entreprise: dict) -> dict:
    """Confirm quote signature to client"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    
    message = (
        f"{entreprise_nom}: Merci! Votre devis {devis.get('numero_devis', '')} "
        f"est signé. Nous vous contacterons pour planifier l'intervention."
    )
    
    return await send_sms(phone, message)

async def send_facture_notification(client: dict, facture: dict, entreprise: dict) -> dict:
    """Notify client about a new invoice"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    total_ttc = facture.get('total_ttc', 0)
    
    message = (
        f"{entreprise_nom}: Votre facture {facture.get('numero_facture', '')} "
        f"({total_ttc:.2f}€) est disponible. "
        f"Échéance: {facture.get('date_echeance', '')[:10]}"
    )
    
    return await send_sms(phone, message)

async def send_payment_reminder(client: dict, facture: dict, entreprise: dict, jours_retard: int) -> dict:
    """Send payment reminder SMS"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    montant_du = facture.get('total_ttc', 0) - facture.get('montant_paye', 0)
    
    message = (
        f"{entreprise_nom}: Rappel - Facture {facture.get('numero_facture', '')} "
        f"en attente de paiement ({montant_du:.2f}€). "
        f"Retard: {jours_retard} jour(s). Contact: {entreprise.get('telephone', '')}"
    )
    
    return await send_sms(phone, message)

async def send_payment_confirmation(client: dict, facture: dict, entreprise: dict, montant: float) -> dict:
    """Confirm payment receipt"""
    phone = client.get('telephone')
    if not phone:
        return {"status": "skipped", "message": "No phone number"}
    
    entreprise_nom = entreprise.get('nom', 'FieldCommand')
    
    message = (
        f"{entreprise_nom}: Paiement de {montant:.2f}€ reçu pour facture "
        f"{facture.get('numero_facture', '')}. Merci!"
    )
    
    return await send_sms(phone, message)
