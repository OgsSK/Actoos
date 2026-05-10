"""
SMS Service for Actoos using Twilio
Handles SMS notifications for interventions, quotes, and invoices.
Supports both shared (Actoos) and custom (per-enterprise) Twilio configurations.
"""
import os
import logging
from typing import Optional, Tuple
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

# Default Actoos Twilio configuration (shared for all enterprises without their own)
DEFAULT_TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
DEFAULT_TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
DEFAULT_TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# Legacy aliases for backward compatibility
TWILIO_ACCOUNT_SID = DEFAULT_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN = DEFAULT_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER = DEFAULT_TWILIO_PHONE_NUMBER

# Default Twilio client (shared)
twilio_client = None

def init_twilio():
    """Initialize default Twilio client"""
    global twilio_client
    
    if not DEFAULT_TWILIO_ACCOUNT_SID or not DEFAULT_TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured - SMS disabled")
        return False
    
    try:
        twilio_client = Client(DEFAULT_TWILIO_ACCOUNT_SID, DEFAULT_TWILIO_AUTH_TOKEN)
        logger.info("Default Twilio client initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Twilio: {e}")
        return False


def get_twilio_client_for_entreprise(entreprise: dict = None) -> Tuple[Optional[Client], Optional[str], str]:
    """
    Get the appropriate Twilio client for an enterprise.
    Returns (client, phone_number, mode) where mode is 'custom' or 'shared'.
    
    Priority:
    1. Enterprise's own Twilio credentials (if configured)
    2. Default Actoos Twilio (shared)
    """
    if entreprise:
        # Check if enterprise has custom Twilio credentials
        custom_sid = entreprise.get('twilio_account_sid')
        custom_token = entreprise.get('twilio_auth_token')
        custom_phone = entreprise.get('twilio_phone_number')
        
        if custom_sid and custom_token and custom_phone:
            try:
                custom_client = Client(custom_sid, custom_token)
                logger.info(f"Using custom Twilio for enterprise {entreprise.get('id')}")
                return (custom_client, custom_phone, 'custom')
            except Exception as e:
                logger.error(f"Failed to create custom Twilio client: {e}")
                # Fall back to shared
    
    # Use shared Actoos Twilio
    if twilio_client and DEFAULT_TWILIO_PHONE_NUMBER:
        return (twilio_client, DEFAULT_TWILIO_PHONE_NUMBER, 'shared')
    
    return (None, None, 'none')

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

async def send_sms(to_number: str, message: str, entreprise: dict = None) -> dict:
    """
    Send an SMS message using the appropriate Twilio client.
    
    Args:
        to_number: Recipient phone number
        message: SMS content (max 160 chars for single SMS)
        entreprise: Enterprise dict (optional) - to use custom Twilio if configured
    
    Returns:
        dict with status, message_sid, and mode (shared/custom)
    """
    client, from_number, mode = get_twilio_client_for_entreprise(entreprise)
    
    if not client:
        return {"status": "error", "message": "Twilio non configuré. Configurez vos propres credentials Twilio ou attendez l'activation du service partagé Actoos."}
    
    if not from_number:
        return {"status": "error", "message": "Numéro d'expédition Twilio non configuré"}
    
    formatted_number = format_phone_number(to_number)
    if not formatted_number:
        return {"status": "error", "message": "Numéro de téléphone invalide"}
    
    try:
        # Truncate message if too long
        if len(message) > 1600:  # Max 10 segments
            message = message[:1597] + "..."
        
        sms = client.messages.create(
            body=message,
            from_=from_number,
            to=formatted_number
        )
        
        logger.info(f"SMS sent to {formatted_number} via {mode} Twilio: {sms.sid}")
        return {
            "status": "success",
            "message_sid": sms.sid,
            "to": formatted_number,
            "mode": mode  # 'shared' or 'custom'
        }
        
    except TwilioRestException as e:
        logger.error(f"Twilio error sending SMS to {formatted_number}: {e}")
        return {
            "status": "error",
            "message": str(e),
            "code": e.code,
            "mode": mode
        }
    except Exception as e:
        logger.error(f"Error sending SMS to {formatted_number}: {e}")
        return {
            "status": "error",
            "message": str(e),
            "mode": mode
        }

# ==================== SMS Status Functions ====================

def get_sms_status_for_entreprise(entreprise: dict = None) -> dict:
    """
    Get the SMS configuration status for an enterprise.
    
    Returns:
        dict with configured status, mode, and phone number
    """
    if entreprise:
        # Check custom credentials
        custom_sid = entreprise.get('twilio_account_sid')
        custom_token = entreprise.get('twilio_auth_token')
        custom_phone = entreprise.get('twilio_phone_number')
        
        if custom_sid and custom_token and custom_phone:
            return {
                "configured": True,
                "mode": "custom",
                "phone_number": custom_phone,
                "description": "Votre propre compte Twilio"
            }
    
    # Check shared Actoos Twilio
    if twilio_client and DEFAULT_TWILIO_PHONE_NUMBER and DEFAULT_TWILIO_PHONE_NUMBER != '+32XXXXXXXXX':
        return {
            "configured": True,
            "mode": "shared",
            "phone_number": "Actoos",  # Don't expose shared number
            "description": "Service SMS partagé Actoos"
        }
    
    return {
        "configured": False,
        "mode": "none",
        "phone_number": None,
        "description": "SMS non configuré"
    }


def is_shared_twilio_available() -> bool:
    """Check if the shared Actoos Twilio is configured and available"""
    return (
        twilio_client is not None and 
        DEFAULT_TWILIO_PHONE_NUMBER is not None and 
        DEFAULT_TWILIO_PHONE_NUMBER != '+32XXXXXXXXX'
    )


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
